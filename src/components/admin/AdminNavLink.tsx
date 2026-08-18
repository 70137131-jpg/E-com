'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Marks the current section. Client-side purely because it needs the pathname. */
export function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // /admin must only match exactly, or it would light up on every subpage.
  const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'tap-target inline-flex items-center rounded-[var(--radius)] px-3 text-sm',
        active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </Link>
  );
}
