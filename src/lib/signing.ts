import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-signed payloads. Used for the admin session cookie (PRD 13.5) and for
 * the mock gateway's payment token, so neither can be forged client-side.
 */
function secret(): string {
  const value = process.env.ADMIN_COOKIE_SECRET;
  if (!value || value.length < 32) {
    throw new Error('ADMIN_COOKIE_SECRET must be set to at least 32 characters.');
  }
  return value;
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

export function sign<T>(payload: T): string {
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verify<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;

  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
