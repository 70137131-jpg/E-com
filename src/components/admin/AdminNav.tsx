import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { isAdmin } from '@/server/admin-auth';
import { logout } from '@/server/actions/auth';
import { AdminNavLink } from './AdminNavLink';

/**
 * Admin header. Deliberately plainer than the storefront's — this is a tool, and
 * it should not look like the shop it manages.
 */
export async function AdminNav() {
  const signedIn = await isAdmin();

  return (
    <header className="border-b border-border bg-background">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-sm font-medium uppercase tracking-[0.14em]">
            {BRAND.name}
            <span className="ml-2 text-muted-foreground">admin</span>
          </Link>

          {signedIn ? (
            <nav aria-label="Admin sections" className="hidden gap-1 sm:flex">
              <AdminNavLink href="/admin">Dashboard</AdminNavLink>
              <AdminNavLink href="/admin/orders">Orders</AdminNavLink>
              <AdminNavLink href="/admin/products">Products</AdminNavLink>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            View store
          </Link>
          {signedIn ? (
            <form action={logout}>
              <button
                type="submit"
                className="tap-target rounded-[var(--radius)] px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {signedIn ? (
        <nav aria-label="Admin sections" className="container-page flex gap-1 pb-2 sm:hidden">
          <AdminNavLink href="/admin">Dashboard</AdminNavLink>
          <AdminNavLink href="/admin/orders">Orders</AdminNavLink>
          <AdminNavLink href="/admin/products">Products</AdminNavLink>
        </nav>
      ) : null}
    </header>
  );
}
