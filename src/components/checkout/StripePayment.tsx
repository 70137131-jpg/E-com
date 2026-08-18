'use client';

import * as React from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CURRENCY } from '@/lib/money';
import { siteUrl } from '@/lib/brand';
import type { PaymentSectionProps } from './payment-handle';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

/**
 * Stripe Elements in deferred-intent mode: the card form mounts immediately with
 * the current total, and the PaymentIntent is created only when the shopper
 * submits, from server-computed figures (PRD 13.2).
 */
function StripeFields({ totalCents, handleRef }: Omit<PaymentSectionProps, 'disabled'>) {
  const stripe = useStripe();
  const elements = useElements();

  // Keep Elements in step with the shipping method the shopper picked.
  React.useEffect(() => {
    if (elements && totalCents > 0) elements.update({ amount: totalCents });
  }, [elements, totalCents]);

  React.useEffect(() => {
    handleRef.current = {
      async validate() {
        if (!elements) return { ok: false, reason: 'Payment form is still loading.' };
        const { error } = await elements.submit();
        if (error) return { ok: false, reason: error.message ?? 'Check your card details.' };
        return { ok: true };
      },

      async confirm({ clientSecret }) {
        if (!stripe || !elements) return { ok: false, reason: 'Payment form is still loading.' };

        const { error } = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: { return_url: `${siteUrl()}/checkout/success` },
          // Stay on the page unless the card demands a redirect for 3-D Secure.
          redirect: 'if_required',
        });

        if (error) return { ok: false, reason: error.message ?? 'Your card was declined' };
        return { ok: true };
      },
    };
  }, [stripe, elements, handleRef]);

  return <PaymentElement options={{ layout: 'tabs' }} />;
}

export function StripePayment({
  publishableKey,
  totalCents,
  handleRef,
}: PaymentSectionProps & { publishableKey: string }) {
  return (
    <Elements
      stripe={getStripe(publishableKey)}
      options={{
        mode: 'payment',
        amount: Math.max(totalCents, 1),
        currency: CURRENCY.toLowerCase(),
        appearance: { theme: 'flat', variables: { borderRadius: '8px' } },
      }}
    >
      <StripeFields totalCents={totalCents} handleRef={handleRef} />
    </Elements>
  );
}
