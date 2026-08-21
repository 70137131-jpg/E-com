import { describe, expect, it } from 'vitest';
import { sign, verify } from './signing';

/**
 * These signatures are the only thing standing between a forged cookie and the
 * admin, and between a forged token and a free order through the mock gateway.
 * Every test here is an attack.
 */
describe('sign / verify', () => {
  it('round-trips a payload', () => {
    const payload = { amountCents: 840_000, cartToken: 'abc' };
    expect(verify(sign(payload))).toEqual(payload);
  });

  it('rejects a tampered body', () => {
    const token = sign({ amountCents: 100 });
    const [body, mac] = token.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ amountCents: 1 }), 'utf8').toString('base64url');
    expect(verify(`${forgedBody}.${mac}`)).toBeNull();
    expect(body).not.toBe(forgedBody);
  });

  it('rejects a tampered signature', () => {
    const [body] = sign({ amountCents: 100 }).split('.');
    expect(verify(`${body}.notavalidmac`)).toBeNull();
  });

  it('rejects a token with no signature at all', () => {
    const [body] = sign({ amountCents: 100 }).split('.');
    expect(verify(body)).toBeNull();
    expect(verify(`${body}.`)).toBeNull();
  });

  it('rejects undefined and empty input', () => {
    expect(verify(undefined)).toBeNull();
    expect(verify('')).toBeNull();
  });

  it('rejects a well-signed body that is not JSON', () => {
    // Signature valid, payload garbage — must not throw, must return null.
    expect(verify('!!!.notamac')).toBeNull();
  });

  it('does not leak through a length-mismatched mac', () => {
    // timingSafeEqual throws on unequal lengths; verify() must guard first.
    const [body] = sign({ a: 1 }).split('.');
    expect(() => verify(`${body}.short`)).not.toThrow();
    expect(verify(`${body}.short`)).toBeNull();
  });
});

describe('secret handling', () => {
  it('refuses to sign with a short secret', () => {
    const original = process.env.ADMIN_COOKIE_SECRET;
    process.env.ADMIN_COOKIE_SECRET = 'too-short';
    try {
      expect(() => sign({ a: 1 })).toThrow(/32 characters/);
    } finally {
      process.env.ADMIN_COOKIE_SECRET = original;
    }
  });

  it('does not verify a token signed with a different secret', () => {
    const token = sign({ a: 1 });
    const original = process.env.ADMIN_COOKIE_SECRET;
    process.env.ADMIN_COOKIE_SECRET = 'a-completely-different-secret-32-chars';
    try {
      expect(verify(token)).toBeNull();
    } finally {
      process.env.ADMIN_COOKIE_SECRET = original;
    }
  });
});
