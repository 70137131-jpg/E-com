import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALERT_EVENTS, log, setAlertSink } from './log';

let errors: unknown[][] = [];
let infos: unknown[][] = [];

beforeEach(() => {
  errors = [];
  infos = [];
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void errors.push(a));
  vi.spyOn(console, 'info').mockImplementation((...a: unknown[]) => void infos.push(a));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  setAlertSink(null);
});

describe('log.alert', () => {
  it('marks the entry so a drain can filter on one field', () => {
    log.alert(ALERT_EVENTS.ORDER_STOCK_CONFLICT, { orderNumber: '1006' });
    const line = String(errors[0]?.[0]);
    expect(line).toContain(ALERT_EVENTS.ORDER_STOCK_CONFLICT);
    expect(line).toContain('alert=true');
    expect(line).toContain('1006');
  });

  it('forwards to a registered sink', () => {
    const seen: Array<[string, unknown]> = [];
    setAlertSink((event, fields) => seen.push([event, fields]));

    log.alert(ALERT_EVENTS.WEBHOOK_FAILED, { eventId: 'evt_1' });

    expect(seen).toHaveLength(1);
    expect(seen[0][0]).toBe(ALERT_EVENTS.WEBHOOK_FAILED);
    expect(seen[0][1]).toMatchObject({ eventId: 'evt_1' });
  });

  it('never lets a throwing sink escape into the caller', () => {
    // The caller is usually mid-payment. An alerting bug must not become an
    // order-creation bug.
    setAlertSink(() => {
      throw new Error('pagerduty is down');
    });

    expect(() => log.alert(ALERT_EVENTS.EMAIL_FAILED, { orderNumber: '1' })).not.toThrow();
    expect(errors.some((e) => String(e[0]).includes('alert.sink_failed'))).toBe(true);
  });

  it('serialises an Error instead of logging {}', () => {
    log.alert(ALERT_EVENTS.WEBHOOK_FAILED, { err: new Error('boom') });
    expect(String(errors[0]?.[0])).toContain('boom');
  });
});

describe('production output', () => {
  it('emits one parseable JSON line per entry', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      log.alert(ALERT_EVENTS.ORDER_STOCK_CONFLICT, {
        orderNumber: '1007',
        paymentIntentId: 'pi_x',
        totalCents: 420_000,
      });

      const parsed = JSON.parse(String(errors[0]?.[0]));
      expect(parsed).toMatchObject({
        level: 'error',
        event: 'order.stock_conflict',
        alert: true,
        orderNumber: '1007',
        paymentIntentId: 'pi_x',
        totalCents: 420_000,
      });
      // A drain needs a timestamp it can sort on.
      expect(Date.parse(parsed.time)).not.toBeNaN();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('serialises an Error into fields rather than an empty object', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      log.alert(ALERT_EVENTS.WEBHOOK_FAILED, { err: new Error('db timeout') });
      const parsed = JSON.parse(String(errors[0]?.[0]));
      expect(parsed.err).toMatchObject({ name: 'Error', message: 'db timeout' });
      expect(parsed.err.stack).toBeTruthy();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('log levels', () => {
  it('emits the event key so alerts can be built on it', () => {
    log.info('order.created', { orderNumber: '1006' });
    expect(String(infos[0]?.[0])).toContain('order.created');
  });

  it('keeps the alert event names stable', () => {
    // These strings are load-bearing: renaming one silently disables an alert.
    expect(ALERT_EVENTS).toEqual({
      WEBHOOK_FAILED: 'webhook.failed',
      ORDER_STOCK_CONFLICT: 'order.stock_conflict',
      EMAIL_FAILED: 'email.failed',
    });
  });
});
