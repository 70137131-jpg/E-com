import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from '@/components/layout/Breadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductGrid } from '@/components/product/ProductCard';
import { SortSelect } from '@/components/product/SortSelect';
import { commerce, COLLECTION_DEFS, isSortKey } from '@/lib/commerce';

export const revalidate = 60;

export function generateStaticParams() {
  return COLLECTION_DEFS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<'/collections/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const collection = await commerce.getCollection(slug);
  if (!collection) return { title: 'Not found' };

  return {
    title: collection.title,
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: collection.title,
      description: collection.description,
      images: [{ url: collection.image }],
    },
  };
}

export default async function CollectionPage(props: PageProps<'/collections/[slug]'>) {
  const { slug } = await props.params;
  const { sort } = await props.searchParams;

  const collection = await commerce.getCollection(slug);
  if (!collection) notFound();

  // A repeated search param arrives as an array; only a single string can be a sort key.
  const sortParam = typeof sort === 'string' ? sort : undefined;
  const sortKey = isSortKey(sortParam) ? sortParam : 'featured';
  const products = await commerce.getProducts({ collection: slug, sort: sortKey });

  const trail: Crumb[] = [
    { href: '/', label: 'Home' },
    { href: `/collections/${collection.slug}`, label: collection.title },
  ];

  return (
    <div className="container-page pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />
      <Breadcrumbs trail={trail} />

      <header className="mb-6">
        <h1 className="text-h1">{collection.title}</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">{collection.description}</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <p className="text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
        <SortSelect value={sortKey} />
      </div>

      {products.length > 0 ? (
        <ProductGrid products={products} priorityCount={4} />
      ) : (
        <EmptyState title="No products in this collection yet." action={{ href: '/', label: 'Back to home' }} />
      )}
    </div>
  );
}
