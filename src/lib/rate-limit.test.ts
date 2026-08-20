import { beforeEach, describe, expect, it } from 'vitest';
import { __resetRateLimits, clientKey, rateLimit } from './rate-limit';

const OPTS = { limit: 3, windowSeconds: 60 };

beforeEach(() => __resetRateLimits());

describe('rateLimit', () => {
  it('allows up to the limit and then refuses', () => {
    const t = 1_000_000;
    expect(rateLimit('k', OPTS, t)).toMatchObject({ ok: true, remaining: 2 });
    expect(rateLimit('k', OPTS, t)).toMatchObject({ ok: true, remaining: 1 });
    expect(rateLimit('k', OPTS, t)).toMatchObject({ ok: true, remaining: 0 });
    expect(rateLimit('k', OPTS, t)).toMatchObject({ ok: false, remaining: 0 });
  });

  it('keeps refusing while the window is open', () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit('k', OPTS, t);
    // Attempts inside the window must not extend or reset it.
    expect(rateLimit('k', OPTS, t + 30_000).ok).toBe(false);
    expect(rateLimit('k', OPTS, t + 59_000).ok).toBe(false);
  });

  it('resets once the window has passed', () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) rateLimit('k', OPTS, t);
    expect(rateLimit('k', OPTS, t + 60_001)).toMatchObject({ ok: true, remaining: 2 });
  });

  it('tracks keys independently, so one IP cannot lock out another', () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) rateLimit('attacker', OPTS, t);
    expect(rateLimit('attacker', OPTS, t).ok).toBe(false);
    expect(rateLimit('someone-else', OPTS, t).ok).toBe(true);
  });

  it('reports a retryAfter that shrinks as the window elapses', () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) rateLimit('k', OPTS, t);
    const early = rateLimit('k', OPTS, t + 1_000).retryAfter;
    const late = rateLimit('k', OPTS, t + 50_000).retryAfter;
    expect(early).toBeGreaterThan(late);
    expect(late).toBeGreaterThanOrEqual(1);
  });
});

describe('clientKey', () => {
  it('uses the first x-forwarded-for entry', () => {
    const h = new Headers({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18' });
    expect(clientKey(h, 'admin-login')).toBe('admin-login:203.0.113.9');
  });

  it('falls back to x-real-ip', () => {
    expect(clientKey(new Headers({ 'x-real-ip': '198.51.100.4' }), 's')).toBe('s:198.51.100.4');
  });

  it('degrades to a shared bucket rather than throwing', () => {
    // Everyone unidentifiable shares one bucket. Coarse, but it still throttles.
    expect(clientKey(new Headers(), 's')).toBe('s:unknown');
  });

  it('separates scopes so login and checkout do not share a budget', () => {
    const h = new Headers({ 'x-real-ip': '198.51.100.4' });
    expect(clientKey(h, 'admin-login')).not.toBe(clientKey(h, 'checkout'));
  });
});
