import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from '@/components/layout/Breadcrumbs';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductPurchase } from '@/components/product/ProductPurchase';
import { commerce, collectionDef } from '@/lib/commerce';
import { CURRENCY } from '@/lib/money';
import { siteUrl } from '@/lib/brand';

// The catalogue shell is cached; stock is always re-verified server-side on
// add-to-cart regardless of what this cached page said (PRD 6.3).
export const revalidate = 60;

export async function generateStaticParams() {
  const products = await commerce.getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await commerce.getProduct(slug);
  if (!product) return { title: 'Not found' };

  const description = product.description.slice(0, 155);
  return {
    title: product.title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      images: [{ url: product.images[0], width: 1200, height: 1200, alt: product.title }],
    },
  };
}

export default async function ProductPage(props: PageProps<'/products/[slug]'>) {
  const { slug } = await props.params;
  const product = await commerce.getProduct(slug);
  if (!product) notFound();

  const collection = collectionDef(product.collection);
  const trail: Crumb[] = [
    { href: '/', label: 'Home' },
    ...(collection
      ? [{ href: `/collections/${collection.slug}`, label: collection.title }]
      : []),
    { href: `/products/${product.slug}`, label: product.title },
  ];

  // Product + Offer JSON-LD (PRD 17.2).
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map((src) => `${siteUrl()}${src}`),
    sku: product.variants[0]?.sku,
    offers: product.variants.map((variant) => ({
      '@type': 'Offer',
      sku: variant.sku,
      name: variant.title,
      price: (variant.priceCents / 100).toFixed(2),
      priceCurrency: CURRENCY,
      availability:
        variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl()}/products/${product.slug}`,
    })),
  };

  return (
    <div className="container-page pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />

      <Breadcrumbs trail={trail} />

      {/* Gallery first on mobile, two columns from lg (PRD 6.3). */}
      <div className="grid gap-8 lg:grid-cols-[55fr_45fr] lg:gap-12">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          <h1 className="text-h1">{product.title}</h1>
          <div className="mt-5">
            <ProductPurchase product={product} />
          </div>

          <section className="mt-10 border-t border-border pt-6" aria-labelledby="description-heading">
            <h2 id="description-heading" className="text-h3">
              Details
            </h2>
            <p className="mt-3 max-w-[65ch] text-muted-foreground">{product.description}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
