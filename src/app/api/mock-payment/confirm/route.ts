import { NextResponse } from 'next/server';
import { mockCardOutcome, parseMockToken } from '@/lib/payments/mock';
import { stripeConfigured } from '@/lib/payments/provider';
import { fulfilPayment } from '@/server/services/orders';

/**
 * The mock gateway's equivalent of the Stripe webhook.
 *
 * Refuses to run whenever real Stripe keys are present, so this route can never
 * become a way to mint orders on a configured store. The signed token is the
 * authority for amount and cart - the browser only chooses which card to use.
 */
export async function POST(request: Request) {
  if (stripeConfigured()) {
    return NextResponse.json({ ok: false, reason: 'Mock gateway is disabled' }, { status: 404 });
  }

  let body: { token?: string; cardNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Malformed request' }, { status: 400 });
  }

  const payload = body.token ? parseMockToken(body.token) : null;
  if (!payload) {
    return NextResponse.json(
      { ok: false, reason: 'This payment session has expired. Please try again' },
      { status: 400 },
    );
  }

  const outcome = mockCardOutcome(body.cardNumber ?? '');
  if (!outcome.ok) {
    console.info(`[payment] declined pi=${payload.paymentIntentId} reason=${outcome.reason}`);
    return NextResponse.json({ ok: false, reason: outcome.reason });
  }

  try {
    const order = await fulfilPayment(payload.paymentIntentId, payload.metadata);
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  } catch (err) {
    console.error('[payment] mock confirm failed', err);
    return NextResponse.json(
      { ok: false, reason: 'Something went wrong. Please try again' },
      { status: 500 },
    );
  }
}
