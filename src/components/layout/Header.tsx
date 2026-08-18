import Link from 'next/link';
import { COLLECTION_DEFS } from '@/lib/commerce';
import { BRAND } from '@/lib/brand';
import { CartButton } from './CartButton';
import { MobileNav } from './MobileNav';

const NAV_LINKS = [
  ...COLLECTION_DEFS.map((c) => ({ href: `/collections/${c.slug}`, label: c.title })),
  { href: '/about', label: 'About' },
  { href: '/shipping-returns', label: 'Shipping & Returns' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-2">
        <MobileNav links={NAV_LINKS} />

        <Link
          href="/"
          className="mr-auto text-base font-medium tracking-[0.14em] uppercase lg:mr-0"
        >
          {BRAND.name}
        </Link>

        <nav aria-label="Collections" className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-8">
            {COLLECTION_DEFS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <CartButton />
      </div>
    </header>
  );
}
