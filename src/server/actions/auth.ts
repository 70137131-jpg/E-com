'use server';

import { redirect } from 'next/navigation';
import { loginSchema } from '@/lib/validation/admin';
import { endAdminSession, passwordMatches, startAdminSession } from '../admin-auth';

export type LoginState = { error?: string };

/**
 * PRD 6.9. The error string is identical whether the field was blank, wrong, or
 * nearly right — it must never reveal how close the attempt was.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
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
