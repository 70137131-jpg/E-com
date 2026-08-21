import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { siteUrl } from '@/lib/brand';

export type Crumb = { href: string; label: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <>
                  <Link href={crumb.href} className="tap-link hover:text-foreground">
                    {crumb.label}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** BreadcrumbList JSON-LD (PRD 17.2). */
export function breadcrumbJsonLd(trail: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      item: `${siteUrl()}${crumb.href}`,
    })),
  };
}
