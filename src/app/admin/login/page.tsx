import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { isAdmin } from '@/server/admin-auth';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Already signed in? Nothing to do here.
  if (await isAdmin()) redirect('/admin');

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <LoginForm />
    </div>
  );
}
