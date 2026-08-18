import 'server-only';
import { cookies } from 'next/headers';
import { newCartToken } from '@/lib/commerce/local';

export const CART_COOKIE = 'cart_token';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Read-only: safe during render. Returns null before the shopper adds anything. */
export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/**
 * Read the token, minting and setting one if absent. Only callable from a
 * Server Action or Route Handler - Next.js forbids writing cookies during a
 * render pass.
 *
 * httpOnly so client script can never read or forge it (PRD 17.5).
 */
export async function ensureCartToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const token = newCartToken();
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
  return token;
}

export async function clearCartCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}
