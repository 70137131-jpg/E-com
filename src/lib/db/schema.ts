/**
 * Database schema — PRD §11.
 *
 * Money is stored as integer minor units (paisa). There are no floats anywhere
 * in this codebase; see src/lib/money.ts for the only conversion boundary.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

export type Address = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country: string;
  phone: string;
};

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    collection: text('collection').notNull(),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    optionTypes: jsonb('option_types').$type<string[]>().notNull().default([]),
    published: boolean('published').notNull().default(true),
    featured: boolean('featured').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('products_collection_idx').on(t.collection),
    index('products_published_idx').on(t.published),
  ],
);

export const variants = pgTable(
  'variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull().unique(),
    title: text('title').notNull(),
    optionValues: jsonb('option_values').$type<Record<string, string>>().notNull(),
    priceCents: integer('price_cents').notNull(),
    compareAtCents: integer('compare_at_cents'),
    stock: integer('stock').notNull().default(0),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('variants_product_idx').on(t.productId)],
);

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id),
    quantity: integer('quantity').notNull(),
  },
  (t) => [unique('cart_items_cart_variant_uq').on(t.cartId, t.variantId)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: text('order_number').notNull().unique(),
    email: text('email').notNull(),
    status: text('status').notNull().default('pending'),
    shippingAddress: jsonb('shipping_address').$type<Address>().notNull(),
    shippingMethod: text('shipping_method').notNull(),
    shippingCents: integer('shipping_cents').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    currency: text('currency').notNull().default('PKR'),
    paymentIntentId: text('payment_intent_id').unique(),
    /**
     * Set when payment succeeded but the stock decrement failed (§13.4). The
     * order lands as `pending` and admin surfaces the flag rather than silently
     * losing the fact that money moved.
     */
    stockConflict: boolean('stock_conflict').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_status_idx').on(t.status),
    index('orders_created_idx').on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id),
    // Snapshot fields — a historical order must never be rendered by joining to
    // live catalogue data (§11, invariant 1).
    productTitle: text('product_title').notNull(),
    variantTitle: text('variant_title').notNull(),
    sku: text('sku').notNull(),
    imageUrl: text('image_url').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);
