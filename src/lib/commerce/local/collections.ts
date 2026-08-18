/**
 * Collection metadata. There is no collections table (§11) — a product carries
 * its collection slug and the presentational copy lives here.
 */
export const COLLECTION_DEFS = [
  {
    slug: 'everyday',
    title: 'Everyday',
    description: 'Cotton basics cut for Karachi heat and Lahore winters alike.',
    image: '/products/collection-everyday.webp',
  },
  {
    slug: 'occasion',
    title: 'Occasion',
    description: 'Hand-finished pieces for weddings, Eid, and everything in between.',
    image: '/products/collection-occasion.webp',
  },
  {
    slug: 'outerwear',
    title: 'Outerwear',
    description: 'Shawls, jackets and layers built from northern-valley wool.',
    image: '/products/collection-outerwear.webp',
  },
] as const;

export type CollectionSlug = (typeof COLLECTION_DEFS)[number]['slug'];

export const COLLECTION_SLUGS = COLLECTION_DEFS.map((c) => c.slug);

export function collectionDef(slug: string) {
  return COLLECTION_DEFS.find((c) => c.slug === slug) ?? null;
}
