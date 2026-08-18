import { and, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cartItems, carts, orderItems, orders, products, variants } from '@/lib/db/schema';
import { shippingCostCents, type ShippingMethodKey } from '@/lib/shipping';
import type {
  CreateOrderInput,
  DashboardStats,
  LowStockRow,
  Order,
  OrderItem,
  OrderStatus,
} from '../types';
import { StockError } from '../types';

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function toOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    email: row.email,
    status: row.status as OrderStatus,
    shippingAddress: row.shippingAddress,
    shippingMethod: row.shippingMethod as ShippingMethodKey,
    shippingCents: row.shippingCents,
    subtotalCents: row.subtotalCents,
    totalCents: row.totalCents,
    currency: row.currency,
    paymentIntentId: row.paymentIntentId,
    stockConflict: row.stockConflict,
    createdAt: row.createdAt,
    items: items.map(
      (i): OrderItem => ({
        id: i.id,
        variantId: i.variantId,
        productTitle: i.productTitle,
        variantTitle: i.variantTitle,
        sku: i.sku,
        imageUrl: i.imageUrl,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
        lineTotalCents: i.unitPriceCents * i.quantity,
      }),
    ),
  };
}

/** Sequential and speakable - customers read these aloud on the phone (PRD 12.2). */
async function nextOrderNumber(tx: Tx | typeof db): Promise<string> {
  const [{ value }] = await tx.select({ value: count() }).from(orders);
  return String(1000 + value + 1);
}

type PricedLine = {
  variantId: string;
  quantity: number;
  unitPriceCents: number;
  productTitle: string;
  variantTitle: string;
  sku: string;
  imageUrl: string;
  stock: number;
  published: boolean;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

/**
 * Load the cart and re-price it from live data. Called both when creating the
 * PaymentIntent and again inside the order transaction, because between those
 * two moments anything could have changed (PRD 13.2).
 */
export async function priceCart(
  cartToken: string,
  shippingMethod: ShippingMethodKey,
  tx: Tx | typeof db = db,
): Promise<PricedCart> {
  const [cartRow] = await tx.select().from(carts).where(eq(carts.token, cartToken)).limit(1);
  if (!cartRow) throw new StockError('Your cart is empty.', []);

  const rows = await tx
    .select({
      variantId: variants.id,
      quantity: cartItems.quantity,
      unitPriceCents: variants.priceCents,
      productTitle: products.title,
      variantTitle: variants.title,
      sku: variants.sku,
      images: products.images,
      stock: variants.stock,
      published: products.published,
    })
    .from(cartItems)
    .innerJoin(variants, eq(cartItems.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(cartItems.cartId, cartRow.id));

  if (rows.length === 0) throw new StockError('Your cart is empty.', []);

  const lines: PricedLine[] = rows.map((r) => ({
    variantId: r.variantId,
    quantity: r.quantity,
    unitPriceCents: r.unitPriceCents,
    productTitle: r.productTitle,
    variantTitle: r.variantTitle,
    sku: r.sku,
    imageUrl: r.images[0] ?? '/products/placeholder.webp',
    stock: r.stock,
    published: r.published,
  }));

  // PRD 13.2 step 3 - any failure names the specific item and stops.
  const problems = lines
    .filter((l) => !l.published || l.stock < l.quantity)
    .map((l) => ({
      variantId: l.variantId,
      message:
        l.stock <= 0 || !l.published
          ? `${l.productTitle} — ${l.variantTitle} just sold out. It has been removed from your cart.`
          : `Only ${l.stock} available.`,
    }));

  if (problems.length) throw new StockError('Some items are no longer available.', problems);

  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const shipping = shippingCostCents(shippingMethod, subtotalCents);

  return {
    lines,
    subtotalCents,
    shippingCents: shipping,
    totalCents: subtotalCents + shipping,
  };
}

class StockConflict extends Error {}

/**
 * Create the order. Called only from the Stripe webhook, which is the only
 * trustworthy signal that money moved (PRD 13.2).
 *
 * Idempotent by `payment_intent_id UNIQUE` - a retried webhook returns the
 * order that already exists rather than creating a second one (PRD 13.3).
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const existing = await getOrderByPaymentIntent(input.paymentIntentId);
  if (existing) return existing;

  try {
    return await db.transaction(async (tx) => {
      const priced = await priceCart(input.cartToken, input.shippingMethod, tx);
      const orderNumber = await nextOrderNumber(tx);

      const [orderRow] = await tx
        .insert(orders)
        .values({
          orderNumber,
          email: input.email,
          status: 'paid',
          shippingAddress: input.address,
          shippingMethod: input.shippingMethod,
          shippingCents: priced.shippingCents,
          subtotalCents: priced.subtotalCents,
          totalCents: priced.totalCents,
          paymentIntentId: input.paymentIntentId,
        })
        .returning();

      const itemRows = await tx
        .insert(orderItems)
        .values(
          priced.lines.map((l) => ({
            orderId: orderRow.id,
            variantId: l.variantId,
            productTitle: l.productTitle,
            variantTitle: l.variantTitle,
            sku: l.sku,
            imageUrl: l.imageUrl,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
          })),
        )
        .returning();

      // PRD 13.4 - guarded decrement. rowCount 0 means someone took the last one.
      for (const line of priced.lines) {
        const res = await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} - ${line.quantity}` })
          .where(and(eq(variants.id, line.variantId), gte(variants.stock, line.quantity)));
        if (res.rowCount === 0) throw new StockConflict(line.variantId);
      }

      await tx.delete(carts).where(eq(carts.token, input.cartToken));

      return toOrder(orderRow, itemRows);
    });
  } catch (err) {
    if (err instanceof StockConflict) {
      // Payment already succeeded, so the order must exist. Record it as pending
      // and flagged so a human resolves it in admin (PRD 13.4).
      return createFlaggedOrder(input);
    }
    // A concurrent webhook retry can lose the unique-constraint race.
    const again = await getOrderByPaymentIntent(input.paymentIntentId);
    if (again) return again;
    throw err;
  }
}

async function createFlaggedOrder(input: CreateOrderInput): Promise<Order> {
  return db.transaction(async (tx) => {
    const [cartRow] = await tx.select().from(carts).where(eq(carts.token, input.cartToken)).limit(1);
    const rows = cartRow
      ? await tx
          .select({
            variantId: variants.id,
            quantity: cartItems.quantity,
            unitPriceCents: variants.priceCents,
            productTitle: products.title,
            variantTitle: variants.title,
            sku: variants.sku,
            images: products.images,
          })
          .from(cartItems)
          .innerJoin(variants, eq(cartItems.variantId, variants.id))
          .innerJoin(products, eq(variants.productId, products.id))
          .where(eq(cartItems.cartId, cartRow.id))
      : [];

    const subtotalCents = rows.reduce((s, r) => s + r.unitPriceCents * r.quantity, 0);
    const shippingCents = shippingCostCents(input.shippingMethod, subtotalCents);
    const orderNumber = await nextOrderNumber(tx);

    const [orderRow] = await tx
      .insert(orders)
      .values({
        orderNumber,
        email: input.email,
        status: 'pending',
        stockConflict: true,
        shippingAddress: input.address,
        shippingMethod: input.shippingMethod,
        shippingCents,
        subtotalCents,
        totalCents: subtotalCents + shippingCents,
        paymentIntentId: input.paymentIntentId,
      })
      .returning();

    const itemRows = rows.length
      ? await tx
          .insert(orderItems)
          .values(
            rows.map((r) => ({
              orderId: orderRow.id,
              variantId: r.variantId,
              productTitle: r.productTitle,
              variantTitle: r.variantTitle,
              sku: r.sku,
              imageUrl: r.images[0] ?? '/products/placeholder.webp',
              unitPriceCents: r.unitPriceCents,
              quantity: r.quantity,
            })),
          )
          .returning()
      : [];

    await tx.delete(carts).where(eq(carts.token, input.cartToken));
    return toOrder(orderRow, itemRows);
  });
}

async function withItems(rows: OrderRow[]): Promise<Order[]> {
  if (rows.length === 0) return [];
  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((r) => r.id),
      ),
    );
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const i of items) {
    const list = byOrder.get(i.orderId);
    if (list) list.push(i);
    else byOrder.set(i.orderId, [i]);
  }
  return rows.map((r) => toOrder(r, byOrder.get(r.id) ?? []));
}

export async function getOrder(id: string): Promise<Order | null> {
  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, row.id));
  return toOrder(row, items);
}

export async function getOrderByPaymentIntent(pi: string): Promise<Order | null> {
  const [row] = await db.select().from(orders).where(eq(orders.paymentIntentId, pi)).limit(1);
  if (!row) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, row.id));
  return toOrder(row, items);
}

export async function listOrders(
  opts: { status?: OrderStatus; limit?: number } = {},
): Promise<Order[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(opts.status ? eq(orders.status, opts.status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(opts.limit ?? 200);
  return withItems(rows);
}

/** PRD 12.5 - the only legal transitions. Enforced here, not just in the UI. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['cancelled'],
  paid: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) throw new Error('Order not found');

  const from = row.status as OrderStatus;
  if (!ALLOWED_TRANSITIONS[from].includes(status)) {
    throw new Error(`Cannot move an order from ${from} to ${status}.`);
  }

  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
  const updated = await getOrder(id);
  if (!updated) throw new Error('Order not found');
  return updated;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const todays = await db
    .select({ total: orders.totalCents, status: orders.status })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

  const [{ value: awaiting }] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, 'paid'));

  const billable = todays.filter((o) => o.status !== 'cancelled');

  return {
    ordersToday: todays.length,
    revenueTodayCents: billable.reduce((sum, o) => sum + o.total, 0),
    awaitingFulfilment: awaiting,
  };
}

export async function getLowStock(threshold = 3): Promise<LowStockRow[]> {
  return db
    .select({
      sku: variants.sku,
      productTitle: products.title,
      variantTitle: variants.title,
      stock: variants.stock,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(lte(variants.stock, threshold))
    .orderBy(variants.stock);
}

export async function updateVariant(
  variantId: string,
  patch: { priceCents?: number; stock?: number },
): Promise<void> {
  const set: Partial<typeof variants.$inferInsert> = {};
  if (patch.priceCents !== undefined) set.priceCents = patch.priceCents;
  if (patch.stock !== undefined) set.stock = patch.stock;
  if (Object.keys(set).length === 0) return;
  await db.update(variants).set(set).where(eq(variants.id, variantId));
}

export async function setProductPublished(productId: string, published: boolean): Promise<void> {
  await db
    .update(products)
    .set({ published, updatedAt: new Date() })
    .where(eq(products.id, productId));
}
