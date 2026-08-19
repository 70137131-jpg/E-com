'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { commerce, isOrderStatus } from '@/lib/commerce';
import { CATALOGUE_TAG } from '@/lib/commerce/local/catalog';
import {
  setPublishedSchema,
  updateOrderStatusSchema,
  updateVariantSchema,
} from '@/lib/validation/admin';
import { assertAdmin } from '../admin-auth';

export type ActionResult = { ok: boolean; message?: string };

/**
 * PRD 14. Every one of these re-checks the admin cookie server-side — proxy
 * protection is not sufficient on its own, because a Server Action is a POST to
 * an endpoint, not a page navigation.
 */

/** PRD 12.5. The provider rejects any transition outside the state machine. */
export async function updateOrderStatus(input: {
  orderId: string;
  status: string;
}): Promise<ActionResult> {
  await assertAdmin();

  if (!isOrderStatus(input.status)) return { ok: false, message: 'Unknown status.' };
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Something went wrong. Please try again.' };

  try {
    const order = await commerce.updateOrderStatus(parsed.data.orderId, parsed.data.status);
    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    return { ok: true, message: `Order ${order.orderNumber} is now ${order.status}.` };
  } catch (err) {
    console.error('[admin] updateOrderStatus failed', err);
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    };
  }
}

/**
 * Price arrives in whole rupees from the table and is stored as paisa. Doing the
 * conversion here keeps the "no floats" rule intact — the input is an integer
 * count of rupees, multiplied by 100.
 */
export async function updateVariant(input: {
  variantId: string;
  priceRupees?: number;
  stock?: number;
}): Promise<ActionResult> {
  await assertAdmin();

  const parsed = updateVariantSchema.safeParse({
    variantId: input.variantId,
    priceCents: input.priceRupees === undefined ? undefined : Math.round(input.priceRupees) * 100,
    stock: input.stock,
  });
  if (!parsed.success) return { ok: false, message: 'Enter a whole number.' };

  try {
    await commerce.updateVariant(parsed.data.variantId, {
      priceCents: parsed.data.priceCents,
      stock: parsed.data.stock,
    });
    revalidateCatalogue();
    return { ok: true };
  } catch (err) {
    console.error('[admin] updateVariant failed', err);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}

export async function setProductPublished(input: {
  productId: string;
  published: boolean;
}): Promise<ActionResult> {
  await assertAdmin();

  const parsed = setPublishedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Something went wrong. Please try again.' };

  try {
    await commerce.setProductPublished(parsed.data.productId, parsed.data.published);
    revalidateCatalogue();
    return { ok: true };
  } catch (err) {
    console.error('[admin] setProductPublished failed', err);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}

/**
 * Catalogue routes are ISR with a 60s window (PRD 6.12: a change must be live
 * within 60 seconds). Revalidating explicitly makes it immediate instead.
 *
 * The paths are route-group qualified because these pages live under
 * src/app/(shop)/, and a dynamic segment needs the pattern form plus an explicit
 * type — `revalidatePath('/', 'layout')` alone leaves the prerendered
 * /products/[slug] page serving an unpublished product.
 */
function revalidateCatalogue() {
  // Catalogue reads are cached under this tag; without invalidating it the pages
  // would re-render and read the same cached rows straight back.
  //
  // updateTag, not revalidateTag: this is a read-your-own-writes case. The
  // operator must see the new price on the next request, and revalidateTag's
  // recommended profile serves the stale value once before refreshing.
  updateTag(CATALOGUE_TAG);
  revalidatePath('/(shop)', 'layout');
  revalidatePath('/(shop)/products/[slug]', 'page');
  revalidatePath('/(shop)/collections/[slug]', 'page');
  revalidatePath('/admin/products');
}
