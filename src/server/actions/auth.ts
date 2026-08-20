'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validation/admin';
import { endAdminSession, passwordMatches, startAdminSession } from '../admin-auth';

/** /admin is one shared password, so unlimited guesses is the whole attack. */
const LOGIN_LIMIT = { limit: 10, windowSeconds: 15 * 60 };

export type LoginState = { error?: string };

/**
 * PRD 6.9. The error string is identical whether the field was blank, wrong, or
 * nearly right — it must never reveal how close the attempt was.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Throttle before touching the password, so a rejected attempt costs an
  // attacker a slot whether or not the field parsed.
  const limit = rateLimit(clientKey(await headers(), 'admin-login'), LOGIN_LIMIT);
  if (!limit.ok) {
    console.warn(`[admin] login rate-limited, retry in ${limit.retryAfter}s`);
    // Deliberately the same string as a wrong password (PRD 6.9): telling an
    // attacker they hit a limit confirms they found the login and tells them
    // exactly how long to wait.
    return { error: 'Incorrect password.' };
  }

  const parsed = loginSchema.safeParse({ password: formData.get('password') ?? '' });
  if (!parsed.success) return { error: 'Incorrect password.' };

  if (!passwordMatches(parsed.data.password)) {
    console.info('[admin] failed login attempt');
    return { error: 'Incorrect password.' };
  }

  await startAdminSession();
  redirect('/admin');
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect('/admin/login');
}
