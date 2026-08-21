import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The audit trail is best-effort by design: it runs after the mutation has
 * committed. That makes one property load-bearing — a failure to record must
 * never surface to the operator, because the change they made did succeed.
 */
const insertValues = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({ values: (v: unknown) => insertValues(v) }),
  },
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }),
}));

let errors: unknown[][] = [];

beforeEach(() => {
  errors = [];
  insertValues.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void errors.push(a));
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('recordAudit', () => {
  it('writes the action, entity and change set', async () => {
    const { recordAudit } = await import('./audit');

    await recordAudit({
      action: 'variant.price_changed',
      entityType: 'variant',
      entityId: '11111111-1111-1111-1111-111111111111',
      entityLabel: 'RCT-M-SAN',
      changes: { priceCents: { from: 460_000, to: 475_000 } },
    });

    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(insertValues.mock.calls[0][0]).toMatchObject({
      action: 'variant.price_changed',
      entityType: 'variant',
      entityLabel: 'RCT-M-SAN',
      actor: 'admin',
      changes: { priceCents: { from: 460_000, to: 475_000 } },
    });
  });

  it('records the first x-forwarded-for hop as the actor IP', async () => {
    const { recordAudit } = await import('./audit');

    await recordAudit({
      action: 'order.status_changed',
      entityType: 'order',
      entityId: '22222222-2222-2222-2222-222222222222',
    });

    expect(insertValues.mock.calls[0][0]).toMatchObject({ actorIp: '203.0.113.7' });
  });

  it('swallows a database failure instead of failing the operator’s change', async () => {
    insertValues.mockRejectedValue(new Error('connection reset'));
    const { recordAudit } = await import('./audit');

    await expect(
      recordAudit({
        action: 'product.published_changed',
        entityType: 'product',
        entityId: '33333333-3333-3333-3333-333333333333',
      }),
    ).resolves.toBeUndefined();

    // Silent to the operator, loud in the logs.
    expect(errors.some((e) => String(e[0]).includes('audit.write_failed'))).toBe(true);
  });
});

describe('diff', () => {
  it('returns null when nothing changed, so a no-op edit is not history', async () => {
    const { diff } = await import('./audit');
    expect(diff(100, 100)).toBeNull();
    expect(diff(100, undefined)).toBeNull();
  });

  it('returns from and to when the value changed', async () => {
    const { diff } = await import('./audit');
    expect(diff(100, 200)).toEqual({ value: { from: 100, to: 200 } });
  });
});
