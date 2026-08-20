import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { ALERT_EVENTS, log } from '@/lib/log';
import { parseStripeMetadata, stripe } from '@/lib/payments/stripe';
import { stripeConfigured } from '@/lib/payments/provider';
import { fulfilPayment } from '@/server/services/orders';

/**
 * Postgres unique_violation. `createOrder` is idempotent via
 * orders.payment_intent_id UNIQUE, but two deliveries arriving at once can still
 * lose the insert race — that is the constraint doing its job, not an incident.
 */
function isDuplicateDelivery(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

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
    // Not alerted: unsigned traffic hitting a public URL is background noise,
    // and a real Stripe delivery cannot land here.
    log.warn('webhook.bad_signature', { err });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  log.info('webhook.received', { type: event.type, eventId: event.id });

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const metadata = parseStripeMetadata(intent.metadata);
        if (!metadata) {
          // Stripe took the money and we cannot tell what it was for. Nothing
          // downstream will ever create this order.
          log.alert(ALERT_EVENTS.WEBHOOK_FAILED, {
            reason: 'missing_metadata',
            paymentIntentId: intent.id,
            eventId: event.id,
            amountReceived: intent.amount_received,
          });
          break;
        }
        await fulfilPayment(intent.id, metadata);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        log.info('webhook.payment_failed', {
          paymentIntentId: intent.id,
          reason: intent.last_payment_error?.message ?? 'unknown',
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Still acknowledged either way, so Stripe does not hammer us (PRD 13.3).
    // But a swallowed error here means money moved and the order may not exist,
    // which is the single most expensive thing that can fail silently.
    if (isDuplicateDelivery(err)) {
      log.info('webhook.duplicate_ignored', { eventId: event.id });
    } else {
      log.alert(ALERT_EVENTS.WEBHOOK_FAILED, { reason: 'handler_error', eventId: event.id, err });
    }
  }

  return NextResponse.json({ received: true });
}
