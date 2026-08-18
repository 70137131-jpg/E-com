import Image from 'next/image';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductGrid } from '@/components/product/ProductCard';
import { commerce, COLLECTION_DEFS } from '@/lib/commerce';
import { BRAND } from '@/lib/brand';

// ISR, 60-second revalidate (PRD 6.1).
export const revalidate = 60;

export default async function HomePage() {
  const [featured, collections] = await Promise.all([
    commerce.getProducts({ featured: true, limit: 8 }),
    commerce.getCollections(),
  ]);

  return (
    <>
      {/* Hero. The image is the LCP element and carries `priority` (PRD 17.1). */}
      <section className="relative h-[50vh] min-h-[340px] w-full overflow-hidden lg:h-[60vh]">
        <Image
          src="/products/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
        <div className="container-page relative flex h-full flex-col items-start justify-end pb-10 lg:pb-16">
          <h1 className="max-w-[16ch] text-3xl font-medium text-white lg:text-5xl">
            Clothes cut for the way we actually live
          </h1>
          <p className="mt-3 max-w-[46ch] text-white/90">
            Small runs of cotton, linen and wool, made in Pakistan and priced without the middle.
          </p>
          <Link
            href={`/collections/${BRAND.primaryCollection}`}
            className={`${buttonVariants({ size: 'lg' })} mt-6 bg-background text-foreground hover:bg-background/90`}
          >
            Shop everyday
          </Link>
        </div>
      </section>

      <section className="container-page section" aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="text-h2">
          Featured
        </h2>
        <p className="mt-1 text-muted-foreground">Eight pieces we would buy first.</p>

        <div className="mt-6">
          {featured.length > 0 ? (
            <ProductGrid products={featured} priorityCount={4} />
          ) : (
            <EmptyState title="Nothing here yet." action={{ href: '/', label: 'Reload' }} />
          )}
        </div>
      </section>

      <section className="container-page section pt-0" aria-labelledby="collections-heading">
        <h2 id="collections-heading" className="text-h2">
          Collections
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {COLLECTION_DEFS.map((def) => {
            const meta = collections.find((c) => c.slug === def.slug);
            return (
              <Link
                key={def.slug}
                href={`/collections/${def.slug}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-[var(--radius)] border border-border"
              >
                <Image
                  src={def.image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="text-h3 text-white">{def.title}</h3>
                  <p className="text-sm text-white/85">{meta?.productCount ?? 0} products</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
