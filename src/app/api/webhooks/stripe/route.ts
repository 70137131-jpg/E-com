import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { parseStripeMetadata, stripe } from '@/lib/payments/stripe';
import { stripeConfigured } from '@/lib/payments/provider';
import { fulfilPayment } from '@/server/services/orders';

/**
 * PRD 14 / 13.2 step 9-11.
 *
 * The webhook is the only trustworthy signal that money moved - the browser can
 * close, lose connection, or lie. Returns 400 on signature failure only;
 * everything else returns 200 so Stripe stops retrying (PRD 13.3).
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ received: true, skipped: 'stripe not configured' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.info(`[webhook] received ${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const metadata = parseStripeMetadata(intent.metadata);
        if (!metadata) {
          console.error(`[webhook] pi=${intent.id} has no usable metadata; ignoring`);
          break;
        }
        await fulfilPayment(intent.id, metadata);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        console.info(
          `[webhook] payment failed pi=${intent.id} reason=${intent.last_payment_error?.message ?? 'unknown'}`,
        );
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // A duplicate delivery loses the unique-constraint race harmlessly; anything
    // else is logged but still acknowledged so Stripe does not hammer us.
    console.error('[webhook] handler error', err);
  }

  return NextResponse.json({ received: true });
}
