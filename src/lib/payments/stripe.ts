import 'server-only';
import Stripe from 'stripe';
import type { CreatedIntent, PaymentMetadata, PaymentProvider } from './provider';

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
    client = new Stripe(key, { typescript: true });
  }
  return client;
}

export const stripeProvider: PaymentProvider = {
  mode: 'stripe',

  async createIntent(amountCents: number, metadata: PaymentMetadata): Promise<CreatedIntent> {
    const intent = await stripe().paymentIntents.create({
      // Amount is the server-computed total. The client never supplies it (PRD 13.2).
      amount: amountCents,
      currency: 'pkr',
      automatic_payment_methods: { enabled: true },
      metadata: {
        cartToken: metadata.cartToken,
        shippingMethod: metadata.shippingMethod,
        email: metadata.email,
        // Stripe metadata values cap at 500 characters; an address fits comfortably.
        address: JSON.stringify(metadata.address),
      },
    });

    if (!intent.client_secret) throw new Error('Stripe did not return a client secret.');
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  },
};

/** Rebuild our metadata shape from the webhook payload. */
export function parseStripeMetadata(
  metadata: Stripe.Metadata | null,
): PaymentMetadata | null {
  if (!metadata?.cartToken || !metadata.address) return null;
  try {
    return {
      cartToken: metadata.cartToken,
      shippingMethod: metadata.shippingMethod as PaymentMetadata['shippingMethod'],
      email: metadata.email ?? '',
      address: JSON.parse(metadata.address),
    };
  } catch {
    return null;
  }
}
