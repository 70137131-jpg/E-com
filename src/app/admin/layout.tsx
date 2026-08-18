import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  // Admin is excluded from indexing at the robots.txt level too (PRD 17.5).
  robots: { index: false, follow: false },
};

/**
 * Admin chrome. The login page renders inside this layout as well, so the nav
 * itself decides what to show when there is no session.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      <main id="main" className="flex-1 bg-muted/30">
        {children}
      </main>
    </>
  );
}
