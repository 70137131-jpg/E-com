import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
} from '@/lib/admin-session';

/**
 * PRD 13.5 and 14.
 *
 * `proxy.ts` keeps unauthenticated browsers out of /admin, but that is a
 * convenience: every admin page and every admin action calls requireAdmin()
 * itself, because proxy protection alone is not sufficient (PRD 14).
 */

/**
 * Compare in constant time. Both sides are hashed first so the comparison
 * operates on equal-length buffers — timingSafeEqual throws on a length
 * mismatch, and the length of the real password should not leak either.
 */
export function passwordMatches(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const a = createHash('sha256').update(submitted).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/** Use at the top of every admin page. Redirects rather than throwing. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}

/**
 * Use at the top of every admin server action. Throws rather than redirecting,
 * because an action's job is to refuse, not to navigate.
 */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error('Not authorised.');
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
