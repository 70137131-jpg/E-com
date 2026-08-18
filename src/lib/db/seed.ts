/**
 * Seed the catalogue and a short order history - PRD 16.
 *
 * Idempotent: it truncates the commerce tables first, so running it twice does
 * not produce two of everything.
 *
 *   npm run db:seed
 */
import { sql } from 'drizzle-orm';
import { db, pool } from './index';
import { orderItems, orders, products, variants } from './schema';
import { buildVariants, CATALOG, productImages } from './catalog-data';
import { shippingCostCents, type ShippingMethodKey } from '../shipping';

type SeededVariant = { id: string; sku: string; title: string; priceCents: number };

/** Historical orders so admin is never empty during the demo (PRD 6.10, 16). */
const ORDER_HISTORY: Array<{
  daysAgo: number;
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled';
  email: string;
  name: string;
  city: string;
  line1: string;
  phone: string;
  shippingMethod: ShippingMethodKey;
  lines: Array<{ sku: string; quantity: number }>;
}> = [
  {
    daysAgo: 12,
    status: 'fulfilled',
    email: 'sana.qureshi@example.com',
    name: 'Sana Qureshi',
    city: 'Lahore',
    line1: '14-B Gulberg III, Main Boulevard',
    phone: '+92 300 4415582',
    shippingMethod: 'standard',
    lines: [
      { sku: 'NLK-M-IVO', quantity: 1 },
      { sku: 'CCD-OS-IVO', quantity: 2 },
    ],
  },
  {
    daysAgo: 8,
    status: 'fulfilled',
    email: 'bilal.ahmad@example.com',
    name: 'Bilal Ahmad',
    city: 'Karachi',
    line1: 'Flat 302, Seaview Apartments, Clifton Block 2',
    phone: '+92 321 2098447',
    shippingMethod: 'express',
    lines: [{ sku: 'DSK-L-NAT', quantity: 1 }],
  },
  {
    daysAgo: 4,
    status: 'paid',
    email: 'hina.raza@example.com',
    name: 'Hina Raza',
    city: 'Islamabad',
    line1: 'House 27, Street 8, F-7/3',
    phone: '+92 333 5512096',
    shippingMethod: 'standard',
    lines: [
      { sku: 'KPS-OS-CHA', quantity: 1 },
      { sku: 'ZSD-OS-EME', quantity: 1 },
    ],
  },
  {
    daysAgo: 2,
    status: 'cancelled',
    email: 'omar.sheikh@example.com',
    name: 'Omar Sheikh',
    city: 'Faisalabad',
    line1: '88 Kohinoor City, Jaranwala Road',
    phone: '+92 345 7781203',
    shippingMethod: 'pickup',
    lines: [{ sku: 'AET-L-NAT', quantity: 3 }],
  },
  {
    daysAgo: 0,
    status: 'paid',
    email: 'ayesha.k@example.com',
    name: 'Ayesha Khan',
    city: 'Rawalpindi',
    line1: '5 Bahria Town Phase 4, Sector C',
    phone: '+92 312 9043318',
    shippingMethod: 'express',
    lines: [
      { sku: 'MRPS-S-CHA', quantity: 1 },
      { sku: 'RCT-L-SAN', quantity: 1 },
    ],
  },
];

async function main() {
  console.log('Seeding Karakoram Threads...\n');

  // Order matters: children before parents.
  await db.execute(
    sql`truncate table ${orderItems}, ${orders}, ${variants}, ${products} restart identity cascade`,
  );

  const bySku = new Map<string, SeededVariant>();
  let variantCount = 0;

  for (const spec of CATALOG) {
    const { optionTypes, variants: variantSpecs } = buildVariants(spec);

    const [product] = await db
      .insert(products)
      .values({
        slug: spec.slug,
        title: spec.title,
        description: spec.description,
        collection: spec.collection,
        images: productImages(spec),
        optionTypes,
        published: true,
        featured: spec.featured,
        // Stagger creation dates so "Newest" sorting is meaningful.
        createdAt: new Date(Date.now() - CATALOG.indexOf(spec) * 36 * 60 * 60 * 1000),
      })
      .returning();

    const rows = await db
      .insert(variants)
      .values(
        variantSpecs.map((v) => ({
          productId: product.id,
          sku: v.sku,
          title: v.title,
          optionValues: v.optionValues,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents,
          stock: v.stock,
          position: v.position,
        })),
      )
      .returning();

    for (const row of rows) {
      bySku.set(row.sku, {
        id: row.id,
        sku: row.sku,
        title: row.title,
        priceCents: row.priceCents,
      });
    }
    variantCount += rows.length;

    const stockNote = variantSpecs
      .filter((v) => v.stock <= 3)
      .map((v) => `${v.title}=${v.stock}`)
      .join(', ');
    console.log(
      `  ${spec.title.padEnd(30)} ${String(rows.length).padStart(2)} variants${stockNote ? `  [${stockNote}]` : ''}`,
    );
  }

  console.log(`\nSeeding ${ORDER_HISTORY.length} historical orders...`);

  const imageBySku = new Map<string, { title: string; image: string }>();
  for (const spec of CATALOG) {
    for (const v of buildVariants(spec).variants) {
      imageBySku.set(v.sku, { title: spec.title, image: productImages(spec)[0] });
    }
  }

  let orderNumber = 1001;
  for (const spec of ORDER_HISTORY) {
    const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000);

    const lines = spec.lines.map((l) => {
      const variant = bySku.get(l.sku);
      const meta = imageBySku.get(l.sku);
      if (!variant || !meta) throw new Error(`Seed order references unknown SKU ${l.sku}`);
      return { variant, meta, quantity: l.quantity };
    });

    const subtotalCents = lines.reduce((s, l) => s + l.variant.priceCents * l.quantity, 0);
    const shipping = shippingCostCents(spec.shippingMethod, subtotalCents);

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: String(orderNumber++),
        email: spec.email,
        status: spec.status,
        shippingAddress: {
          name: spec.name,
          line1: spec.line1,
          city: spec.city,
          country: 'PK',
          phone: spec.phone,
        },
        shippingMethod: spec.shippingMethod,
        shippingCents: shipping,
        subtotalCents,
        totalCents: subtotalCents + shipping,
        paymentIntentId: `pi_seed_${orderNumber - 1}`,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        variantId: l.variant.id,
        productTitle: l.meta.title,
        variantTitle: l.variant.title,
        sku: l.variant.sku,
        imageUrl: l.meta.image,
        unitPriceCents: l.variant.priceCents,
        quantity: l.quantity,
      })),
    );

    console.log(`  #${order.orderNumber}  ${spec.status.padEnd(9)} ${spec.name}`);
  }

  console.log(
    `\nDone. ${CATALOG.length} products, ${variantCount} variants, ${ORDER_HISTORY.length} orders.`,
  );
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
