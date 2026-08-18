import type { Address } from '@/lib/commerce/types';
import type { ShippingMethodKey } from '@/lib/shipping';

/**
 * The payment boundary.
 *
 * PRD 9.1 lists Stripe test keys as required. They are treated as optional here
 * so the demo stays clickable before an account exists: with no keys the mock
 * gateway runs and the rest of the flow - order creation, stock decrement,
 * email, admin - is byte-for-byte the same code path. See README "Payment modes".
 */
export type PaymentMetadata = {
  cartToken: string;
  shippingMethod: ShippingMethodKey;
  email: string;
  address: Address;
};

export type CreatedIntent = {
  clientSecret: string;
  paymentIntentId: string;
};

export type PaymentSucceeded = {
  paymentIntentId: string;
  metadata: PaymentMetadata;
  amountCents: number;
};

export interface PaymentProvider {
  readonly mode: 'stripe' | 'mock';
  createIntent(amountCents: number, metadata: PaymentMetadata): Promise<CreatedIntent>;
}

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

/** Safe to call from client components - reads only the public key. */
export function stripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}
