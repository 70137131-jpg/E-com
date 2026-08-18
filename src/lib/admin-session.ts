import { sign, verify } from './signing';

/**
 * Admin session token — PRD 13.5.
 *
 * Deliberately free of `next/headers` so `proxy.ts` can verify a token without
 * pulling in request-scoped APIs it has no access to. Cookie reading and writing
 * lives in src/server/admin-auth.ts.
 */
export const ADMIN_COOKIE = 'admin_session';

/** 24 hours (PRD 6.9). */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24;

type SessionPayload = { issuedAt: number; expiresAt: number };

export function createSessionToken(now = Date.now()): string {
  return sign<SessionPayload>({
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_MAX_AGE * 1000,
  });
}

/**
 * An expiry inside the signed payload as well as on the cookie: the cookie's own
 * maxAge is a client-side hint the browser could ignore, this one it cannot.
 */
export function verifySessionToken(token: string | undefined): boolean {
  const payload = verify<SessionPayload>(token);
  if (!payload) return false;
  return typeof payload.expiresAt === 'number' && payload.expiresAt > Date.now();
}
