import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cartItems, carts, products, variants } from '@/lib/db/schema';
import type { Cart, CartLine } from '../types';

export function newCartToken(): string {
  return randomBytes(24).toString('base64url');
}

function assemble(
  cartRow: { id: string; token: string },
  rows: Array<{
    lineId: string;
    variantId: string;
    quantity: number;
    productSlug: string;
    productTitle: string;
    variantTitle: string;
    sku: string;
    images: string[];
    priceCents: number;
    stock: number;
  }>,
): Cart {
  const lines: CartLine[] = rows.map((r) => ({
    id: r.lineId,
    variantId: r.variantId,
    quantity: r.quantity,
    productSlug: r.productSlug,
    productTitle: r.productTitle,
    variantTitle: r.variantTitle,
    sku: r.sku,
    imageUrl: r.images[0] ?? '/products/placeholder.webp',
    unitPriceCents: r.priceCents,
    lineTotalCents: r.priceCents * r.quantity,
    availableStock: r.stock,
  }));

  return {
    id: cartRow.id,
    token: cartRow.token,
    lines,
    // Subtotal is always recomputed from live variant prices (§12.1).
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

async function loadCart(cartRow: { id: string; token: string }): Promise<Cart> {
  const rows = await db
    .select({
      lineId: cartItems.id,
      variantId: variants.id,
      quantity: cartItems.quantity,
      productSlug: products.slug,
      productTitle: products.title,
      variantTitle: variants.title,
      sku: variants.sku,
      images: products.images,
      priceCents: variants.priceCents,
      stock: variants.stock,
    })
    .from(cartItems)
    .innerJoin(variants, eq(cartItems.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(cartItems.cartId, cartRow.id));

  return assemble(cartRow, rows);
}

export async function getCart(token: string): Promise<Cart | null> {
  const [row] = await db.select().from(carts).where(eq(carts.token, token)).limit(1);
  if (!row) return null;
  return loadCart(row);
}

export async function createCart(token = newCartToken()): Promise<Cart> {
  const [row] = await db.insert(carts).values({ token }).returning();
  return assemble(row, []);
}

/** Get the cart for this token, creating it if the row has gone (§13.1 step 2). */
async function ensureCart(token: string) {
  const [existing] = await db.select().from(carts).where(eq(carts.token, token)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(carts).values({ token }).returning();
  return created;
}

export async function addLine(
  token: string,
  variantId: string,
  qty: number,
): Promise<{ cart: Cart; notice?: string }> {
  const cartRow = await ensureCart(token);

  // Verify the variant exists and belongs to a published product (§13.1 step 3).
  const [variant] = await db
    .select({
      id: variants.id,
      stock: variants.stock,
      productTitle: products.title,
      variantTitle: variants.title,
      published: products.published,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(variants.id, variantId))
    .limit(1);

  if (!variant || !variant.published) {
    return { cart: await loadCart(cartRow), notice: 'Something went wrong. Please try again.' };
  }

  const [existingLine] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartRow.id), eq(cartItems.variantId, variantId)))
    .limit(1);

  const requested = (existingLine?.quantity ?? 0) + qty;
  const clamped = Math.min(requested, variant.stock);
  let notice: string | undefined;

  if (variant.stock <= 0) {
    return { cart: await loadCart(cartRow), notice: 'Out of stock' };
  }
  if (clamped < requested) notice = `Only ${variant.stock} available.`;

  if (existingLine) {
    await db.update(cartItems).set({ quantity: clamped }).where(eq(cartItems.id, existingLine.id));
  } else {
    await db.insert(cartItems).values({ cartId: cartRow.id, variantId, quantity: clamped });
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartRow.id));

  return { cart: await loadCart(cartRow), notice };
}

export async function updateLine(
  token: string,
  lineId: string,
  qty: number,
): Promise<{ cart: Cart; notice?: string }> {
  const cartRow = await ensureCart(token);

  const [line] = await db
    .select({ id: cartItems.id, variantId: cartItems.variantId, stock: variants.stock })
    .from(cartItems)
    .innerJoin(variants, eq(cartItems.variantId, variants.id))
    .where(and(eq(cartItems.id, lineId), eq(cartItems.cartId, cartRow.id)))
    .limit(1);

  if (!line) return { cart: await loadCart(cartRow) };

  // Reaching 0 removes the line rather than storing a zero quantity (§6.4).
  if (qty <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, line.id));
    return { cart: await loadCart(cartRow) };
  }

  const clamped = Math.min(qty, line.stock);
  const notice = clamped < qty ? `Only ${line.stock} left. Quantity reduced.` : undefined;

  await db.update(cartItems).set({ quantity: clamped }).where(eq(cartItems.id, line.id));
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartRow.id));

  return { cart: await loadCart(cartRow), notice };
}

export async function removeLine(token: string, lineId: string): Promise<Cart> {
  const cartRow = await ensureCart(token);
  await db.delete(cartItems).where(and(eq(cartItems.id, lineId), eq(cartItems.cartId, cartRow.id)));
  return loadCart(cartRow);
}

export async function deleteCartByToken(token: string): Promise<void> {
  await db.delete(carts).where(eq(carts.token, token));
}
