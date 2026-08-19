import type { MetadataRoute } from 'next';
import { commerce, COLLECTION_DEFS } from '@/lib/commerce';
import { siteUrl } from '@/lib/brand';

/** PRD 17.2 — home, collections, products and static pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await commerce.getProducts();

  const staticPages = ['', '/about', '/shipping-returns', '/contact'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.5,
  }));

  const collections = COLLECTION_DEFS.map((collection) => ({
    url: `${base}/collections/${collection.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Only published products are returned, so an unpublished one drops out here too.
  const productPages = products.map((product) => ({
    url: `${base}/products/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...collections, ...productPages];
}
