import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/commerce/types';
import { formatMoney, savingsPercent } from '@/lib/money';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const soldOut = product.totalStock <= 0;
  const compareAt = product.compareAtCents;
  const saving = compareAt ? savingsPercent(product.minPriceCents, compareAt) : 0;

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius)] border border-border bg-muted">
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            // 2 columns mobile, 3 tablet, 4 desktop (PRD 7.4).
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          {soldOut ? (
            <div className="absolute inset-x-0 bottom-0 bg-background/92 py-2 text-center text-sm font-medium">
              Out of stock
            </div>
          ) : saving > 0 ? (
            <Badge variant="accent" className="absolute left-2 top-2 bg-accent text-accent-foreground">
              Save {saving}%
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-medium leading-snug">{product.title}</h3>
          <p className="tabular flex items-baseline gap-2 text-sm">
            {compareAt && compareAt > product.minPriceCents ? (
              <span className="text-muted-foreground line-through">{formatMoney(compareAt)}</span>
            ) : null}
            <span className="font-medium">{formatMoney(product.minPriceCents)}</span>
          </p>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: Product[];
  priorityCount?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < priorityCount} />
      ))}
    </div>
  );
}
