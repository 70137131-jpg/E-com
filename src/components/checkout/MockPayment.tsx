'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PaymentSectionProps } from './payment-handle';

/**
 * The demo gateway, shown when no Stripe keys are configured.
 *
 * It deliberately looks and behaves like a card form - including declining the
 * same test numbers Stripe declines - so the walkthrough is identical in both
 * modes. No card data leaves the browser except the number, which the server
 * only pattern-matches; nothing is stored.
 */
export function MockPayment({ disabled, handleRef }: PaymentSectionProps) {
  const [number, setNumber] = React.useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = React.useState('12 / 34');
  const [cvc, setCvc] = React.useState('123');
  const [fieldError, setFieldError] = React.useState<string | undefined>();

  React.useEffect(() => {
    handleRef.current = {
      async validate() {
        const digits = number.replace(/\D/g, '');
        if (digits.length < 13) {
          setFieldError('Your card number is incomplete.');
          return { ok: false, reason: 'Your card number is incomplete.' };
        }
        if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) {
          setFieldError('Enter the expiry as MM / YY.');
          return { ok: false, reason: 'Enter the expiry as MM / YY.' };
        }
        if (cvc.replace(/\D/g, '').length < 3) {
          setFieldError('Enter the 3-digit security code.');
          return { ok: false, reason: 'Enter the 3-digit security code.' };
        }
        setFieldError(undefined);
        return { ok: true };
      },

      async confirm({ clientSecret }) {
        const response = await fetch('/api/mock-payment/confirm', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: clientSecret, cardNumber: number }),
        });
        const body = (await response.json()) as { ok: boolean; reason?: string };
        if (!body.ok) return { ok: false, reason: body.reason ?? 'Your card was declined' };
        return { ok: true };
      },
    };
  }, [number, expiry, cvc, handleRef]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="card-number" className="mb-1.5">
          Card number
        </Label>
        <Input
          id="card-number"
          inputMode="numeric"
          autoComplete="cc-number"
          value={number}
          disabled={disabled}
          onChange={(e) => setNumber(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="card-expiry" className="mb-1.5">
            Expiry
          </Label>
          <Input
            id="card-expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={expiry}
            disabled={disabled}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="card-cvc" className="mb-1.5">
            Security code
          </Label>
          <Input
            id="card-cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cvc}
            disabled={disabled}
            onChange={(e) => setCvc(e.target.value)}
          />
        </div>
      </div>

      {fieldError ? (
        <p role="alert" className="text-sm text-destructive">
          {fieldError}
        </p>
      ) : null}
    </div>
  );
}
