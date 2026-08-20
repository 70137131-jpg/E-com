'use server';

import { commerce, StockError, type Order } from '@/lib/commerce';
import { priceCart } from '@/lib/commerce/local';
import { payments } from '@/lib/payments';
import type { PaymentMetadata } from '@/lib/payments/provider';
import { checkoutSchema, fieldErrors } from '@/lib/validation/address';
import { isShippingMethodKey, type ShippingMethodKey } from '@/lib/shipping';
import { readCartToken } from '../cart-cookie';
import { log } from '@/lib/log';

export type CheckoutError = { field?: string; lineId?: string; message: string };

export type PreparePaymentResult =
  | {
      ok: true;
      clientSecret: string;
      paymentIntentId: string;
      totalCents: number;
      mode: 'stripe' | 'mock';
    }
  | { ok: false; errors: CheckoutError[] };

/**
 * PRD 14 / 13.2.
 *
 * The client submits an address, an email and a shipping key. Nothing else.
 * Prices, shipping cost, totals and stock are all read from the database here,
 * because the browser can lie about every one of them.
 */
export async function preparePayment(input: {
  email: string;
  address: unknown;
  shippingMethod: string;
}): Promise<PreparePaymentResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const cartToken = await readCartToken();
  if (!cartToken) {
    return { ok: false, errors: [{ message: 'Your cart is empty.' }] };
  }

  const shippingMethod = parsed.data.shippingMethod as ShippingMethodKey;

  try {
    const priced = await priceCart(cartToken, shippingMethod);

    const metadata: PaymentMetadata = {
      cartToken,
      shippingMethod,
      email: parsed.data.email,
      address: {
        ...parsed.data.address,
        line2: parsed.data.address.line2 || undefined,
        postalCode: parsed.data.address.postalCode || undefined,
      },
    };

    const intent = await payments.createIntent(priced.totalCents, metadata);

    return {
      ok: true,
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      totalCents: priced.totalCents,
      mode: payments.mode,
    };
  } catch (err) {
    if (err instanceof StockError) {
      // Name the specific item; payment is never attempted (PRD 6.5 states).
      return {
        ok: false,
        errors: err.details.length
          ? err.details.map((d) => ({ lineId: d.variantId, message: d.message }))
          : [{ message: err.message }],
      };
    }
    log.error('checkout.prepare_payment_failed', { err });
    return { ok: false, errors: [{ message: 'Something went wrong. Please try again.' }] };
  }
}

/**
 * Server-side totals for the order summary. Recomputed on every shipping change
 * so the figure on screen is always the figure that will be charged.
 */
export async function quoteTotals(shippingMethod: string): Promise<{
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
} | null> {
  const cartToken = await readCartToken();
  if (!cartToken || !isShippingMethodKey(shippingMethod)) return null;

  try {
    const priced = await priceCart(cartToken, shippingMethod);
    return {
      subtotalCents: priced.subtotalCents,
      shippingCents: priced.shippingCents,
      totalCents: priced.totalCents,
    };
  } catch {
    return null;
  }
}

/**
 * Polled by /checkout/success until the webhook has created the order (PRD 6.6).
 *
 * Returns the whole order rather than an id the client then fetches, so there is
 * no public endpoint that hands out a customer's address given an order id. The
 * PaymentIntent id is the capability here: only the browser that just paid has it.
 */
export async function findOrderByPaymentIntent(paymentIntentId: string): Promise<Order | null> {
  if (!paymentIntentId) return null;
  return commerce.getOrderByPaymentIntent(paymentIntentId);
}
