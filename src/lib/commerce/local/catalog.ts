import { unstable_cache } from 'next/cache';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, variants } from '@/lib/db/schema';
import type { Collection, Product, SortKey, Variant } from '../types';
import { COLLECTION_DEFS, collectionDef } from './collections';

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof variants.$inferSelect;

function toVariant(row: VariantRow): Variant {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    optionValues: row.optionValues,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    stock: row.stock,
    position: row.position,
  };
}

export function toProduct(row: ProductRow, variantRows: VariantRow[]): Product {
  const vs = variantRows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(toVariant);
  const prices = vs.map((v) => v.priceCents);
  const cheapest = vs.reduce<Variant | null>(
    (acc, v) => (acc === null || v.priceCents < acc.priceCents ? v : acc),
    null,
  );
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    collection: row.collection,
    images: row.images,
    optionTypes: row.optionTypes,
    published: row.published,
    featured: row.featured,
    createdAt: row.createdAt,
    variants: vs,
    minPriceCents: prices.length ? Math.min(...prices) : 0,
    maxPriceCents: prices.length ? Math.max(...prices) : 0,
    compareAtCents: cheapest?.compareAtCents ?? null,
    totalStock: vs.reduce((sum, v) => sum + v.stock, 0),
  };
}

function sortProducts(list: Product[], sort: SortKey): Product[] {
  const out = list.slice();
  switch (sort) {
    case 'price-asc':
      return out.sort((a, b) => a.minPriceCents - b.minPriceCents || a.title.localeCompare(b.title));
    case 'price-desc':
      return out.sort((a, b) => b.minPriceCents - a.minPriceCents || a.title.localeCompare(b.title));
    case 'newest':
      return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case 'featured':
    default:
      return out.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      );
  }
}

function groupVariants(rows: ProductRow[], variantRows: VariantRow[]): Product[] {
  const byProduct = new Map<string, VariantRow[]>();
  for (const v of variantRows) {
    const list = byProduct.get(v.productId);
    if (list) list.push(v);
    else byProduct.set(v.productId, [v]);
  }
  return rows.map((r) => toProduct(r, byProduct.get(r.id) ?? []));
}

async function loadProducts(rows: ProductRow[]): Promise<Product[]> {
  if (rows.length === 0) return [];
  const variantRows = await db
    .select()
    .from(variants)
    .where(inArray(variants.productId, rows.map((r) => r.id)))
    .orderBy(asc(variants.position));

  return groupVariants(rows, variantRows);
}

async function getProductsUncached(opts: {
  collection?: string;
  sort?: SortKey;
  limit?: number;
  featured?: boolean;
  includeUnpublished?: boolean;
} = {}): Promise<Product[]> {
  const filters = [];
  if (!opts.includeUnpublished) filters.push(eq(products.published, true));
  if (opts.collection) filters.push(eq(products.collection, opts.collection));
  if (opts.featured) filters.push(eq(products.featured, true));

  const productQuery = db
    .select()
    .from(products)
    .where(filters.length ? and(...filters) : undefined);

  // Loading variants normally needs the product ids first, forcing two
  // sequential round trips. When nothing narrows the product set we are going to
  // want every variant anyway, so both queries can go out at once — this is the
  // admin catalogue path, which deliberately bypasses the cache.
  const wantsEveryProduct = !opts.collection && !opts.featured;

  if (wantsEveryProduct) {
    const [rows, variantRows] = await Promise.all([
      productQuery,
      db.select().from(variants).orderBy(asc(variants.position)),
    ]);
    const assembled = groupVariants(rows, variantRows);
    const sorted = sortProducts(assembled, opts.sort ?? 'featured');
    return opts.limit ? sorted.slice(0, opts.limit) : sorted;
  }

  const rows = await productQuery;
  const sorted = sortProducts(await loadProducts(rows), opts.sort ?? 'featured');
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}

async function getProductUncached(
  slug: string,
  opts: { includeUnpublished?: boolean } = {},
): Promise<Product | null> {
  const filters = [eq(products.slug, slug)];
  if (!opts.includeUnpublished) filters.push(eq(products.published, true));

  const [row] = await db.select().from(products).where(and(...filters)).limit(1);
  if (!row) return null;
  const [full] = await loadProducts([row]);
  return full ?? null;
}

export async function getCollections(): Promise<Collection[]> {
  const rows = await db
    .select({ collection: products.collection })
    .from(products)
    .where(eq(products.published, true));

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.collection, (counts.get(r.collection) ?? 0) + 1);

  return COLLECTION_DEFS.map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    image: c.image,
    productCount: counts.get(c.slug) ?? 0,
  }));
}

export async function getCollection(slug: string): Promise<Collection | null> {
  const def = collectionDef(slug);
  if (!def) return null;

  // Count only this collection. The previous implementation called
  // getCollections(), which scans every published product to build counts for
  // all three and then discards two of them.
  const [row] = await db
    .select({ value: count() })
    .from(products)
    .where(and(eq(products.collection, slug), eq(products.published, true)));

  return { ...def, productCount: row?.value ?? 0 };
}

/**
 * Catalogue caching.
 *
 * The catalogue changes only when an admin edits it, so reads are cached and
 * tagged rather than hitting Postgres on every request. Admin mutations call
 * revalidateTag(CATALOGUE_TAG), which is what keeps PRD 6.12 ("live within 60
 * seconds") honest while making the common case a cache hit.
 *
 * Two rules:
 *  - includeUnpublished bypasses the cache entirely. That flag is only ever set
 *    by admin screens, which must never read a stale or shared catalogue.
 *  - Dates are revived on the way out. The cache serialises values, so a Date
 *    comes back as a string and `createdAt` would quietly stop being a Date.
 */
export const CATALOGUE_TAG = 'catalogue';

const CACHE_OPTIONS = { revalidate: 60, tags: [CATALOGUE_TAG] };

function reviveProduct(product: Product): Product {
  return { ...product, createdAt: new Date(product.createdAt) };
}

export async function getProducts(
  opts: {
    collection?: string;
    sort?: SortKey;
    limit?: number;
    featured?: boolean;
    includeUnpublished?: boolean;
  } = {},
): Promise<Product[]> {
  if (opts.includeUnpublished) return getProductsUncached(opts);

  const cached = await unstable_cache(
    () => getProductsUncached(opts),
    ['catalog:getProducts', JSON.stringify(opts)],
    CACHE_OPTIONS,
  )();

  return cached.map(reviveProduct);
}

export async function getProduct(
  slug: string,
  opts: { includeUnpublished?: boolean } = {},
): Promise<Product | null> {
  if (opts.includeUnpublished) return getProductUncached(slug, opts);

  const cached = await unstable_cache(
    () => getProductUncached(slug, opts),
    ['catalog:getProduct', slug],
    CACHE_OPTIONS,
  )();

  return cached ? reviveProduct(cached) : null;
}
