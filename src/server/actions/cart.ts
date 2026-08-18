'use server';

import { revalidatePath } from 'next/cache';
import { commerce, type Cart } from '@/lib/commerce';
import { addToCartSchema, removeLineSchema, updateLineSchema } from '@/lib/validation/cart';
import { ensureCartToken, readCartToken } from '../cart-cookie';

export type CartResult = { cart: Cart | null; notice?: string };

const EMPTY: CartResult = { cart: null };

/** PRD 13.1. Stock is verified server-side regardless of what the page cached. */
export async function addToCart(input: { variantId: string; quantity: number }): Promise<CartResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return { cart: await currentCart(), notice: 'Something went wrong. Please try again.' };

  const token = await ensureCartToken();
  const { cart, notice } = await commerce.addLine(token, parsed.data.variantId, parsed.data.quantity);

  revalidatePath('/cart');
  return { cart, notice };
}

export async function updateCartLine(input: { lineId: string; quantity: number }): Promise<CartResult> {
  const parsed = updateLineSchema.safeParse(input);
  if (!parsed.success) return { cart: await currentCart() };

  const token = await readCartToken();
  if (!token) return EMPTY;

  const { cart, notice } = await commerce.updateLine(token, parsed.data.lineId, parsed.data.quantity);

  revalidatePath('/cart');
  return { cart, notice };
}

export async function removeCartLine(input: { lineId: string }): Promise<CartResult> {
  const parsed = removeLineSchema.safeParse(input);
  if (!parsed.success) return { cart: await currentCart() };

  const token = await readCartToken();
  if (!token) return EMPTY;

  const cart = await commerce.removeLine(token, parsed.data.lineId);

  revalidatePath('/cart');
  return { cart };
}

/** Used by the drawer to resync after a navigation. */
export async function currentCart(): Promise<Cart | null> {
  const token = await readCartToken();
  if (!token) return null;
  return commerce.getCart(token);
}
