import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { COLLECTION_DEFS } from '@/lib/commerce';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em]">{BRAND.name}</p>
          <p className="mt-2 max-w-[32ch] text-sm text-muted-foreground">{BRAND.tagline}</p>
        </div>

        <nav aria-label="Shop">
          <h2 className="text-sm font-medium">Shop</h2>
          <ul className="mt-3 space-y-2">
            {COLLECTION_DEFS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="tap-link text-sm text-muted-foreground hover:text-foreground"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Information">
          <h2 className="text-sm font-medium">Information</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/about" className="tap-link text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link
                href="/shipping-returns"
                className="tap-link text-sm text-muted-foreground hover:text-foreground"
              >
                Shipping &amp; Returns
              </Link>
            </li>
            <li>
              <Link href="/contact" className="tap-link text-sm text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container-page border-t border-border py-6">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {BRAND.name}. A demonstration store — no real orders are
          fulfilled.
        </p>
      </div>
    </footer>
  );
}
