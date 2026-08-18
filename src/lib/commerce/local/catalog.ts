import { and, asc, eq, inArray } from 'drizzle-orm';
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

async function loadProducts(rows: ProductRow[]): Promise<Product[]> {
  if (rows.length === 0) return [];
  const variantRows = await db
    .select()
    .from(variants)
    .where(inArray(variants.productId, rows.map((r) => r.id)))
    .orderBy(asc(variants.position));

  const byProduct = new Map<string, VariantRow[]>();
  for (const v of variantRows) {
    const list = byProduct.get(v.productId);
    if (list) list.push(v);
    else byProduct.set(v.productId, [v]);
  }
  return rows.map((r) => toProduct(r, byProduct.get(r.id) ?? []));
}

export async function getProducts(opts: {
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

  const rows = await db
    .select()
    .from(products)
    .where(filters.length ? and(...filters) : undefined);

  const sorted = sortProducts(await loadProducts(rows), opts.sort ?? 'featured');
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}

export async function getProduct(
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
  const all = await getCollections();
  return all.find((c) => c.slug === slug) ?? null;
}
