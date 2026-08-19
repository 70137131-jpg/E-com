'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/cart/CartProvider';
import { formatMoney } from '@/lib/money';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_METHODS,
  DEFAULT_COUNTRY,
  type ShippingMethodKey,
} from '@/lib/shipping';
import { preparePayment } from '@/server/actions/checkout';
import { AddressForm, type AddressFields } from './AddressForm';
import { CheckoutSkeleton } from './CheckoutSkeleton';
import { MockPayment } from './MockPayment';
import { OrderSummary } from './OrderSummary';
import { ShippingMethodPicker } from './ShippingMethodPicker';
import { StripePayment } from './StripePayment';
import type { PaymentHandle } from './payment-handle';

const EMPTY_FORM: AddressFields = {
  email: '',
  name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
};

export function CheckoutForm({
  mode,
  publishableKey,
}: {
  mode: 'stripe' | 'mock';
  publishableKey: string | null;
}) {
  const router = useRouter();
  const { cart, loading, setCart } = useCart();

  const [values, setValues] = React.useState<AddressFields>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [banner, setBanner] = React.useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = React.useState<ShippingMethodKey>('standard');
  const [processing, setProcessing] = React.useState(false);
  const [summaryOpen, setSummaryOpen] = React.useState(false);

  const handleRef = React.useRef<PaymentHandle | null>(null);

  const lines = cart?.lines ?? [];
  const subtotalCents = cart?.subtotalCents ?? 0;

  // Mirrors the server's shippingCostCents(); the server figure still wins at
  // payment time, this is only what the shopper sees while deciding.
  const shippingCents =
    shippingMethod === 'standard' && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
      ? 0
      : SHIPPING_METHODS[shippingMethod].priceCents;
  const totalCents = subtotalCents + shippingCents;

  // An empty cart has nothing to check out (PRD 6.5 states).
  React.useEffect(() => {
    if (cart && cart.lines.length === 0) router.replace('/cart');
  }, [cart, router]);

  // The totals below come from the client-loaded cart; rendering before it
  // arrives would flash an empty summary and a "Pay Rs 0" button.
  if (loading) return <CheckoutSkeleton />;

  function setField(field: keyof AddressFields, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (processing) return;

    setBanner(null);
    setErrors({});
    setProcessing(true);

    try {
      const validation = await handleRef.current?.validate();
      if (validation && !validation.ok) {
        setBanner(validation.reason ?? 'Check your card details.');
        return;
      }

      const prepared = await preparePayment({
        email: values.email,
        address: {
          name: values.name,
          phone: values.phone,
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          postalCode: values.postalCode,
          country: values.country,
        },
        shippingMethod,
      });

      if (!prepared.ok) {
        const fieldMap: Record<string, string> = {};
        const loose: string[] = [];
        for (const error of prepared.errors) {
          if (error.field) fieldMap[error.field] = error.message;
          else loose.push(error.message);
        }
        setErrors(fieldMap);
        if (loose.length) setBanner(loose.join(' '));
        else if (Object.keys(fieldMap).length) setBanner('Please check the highlighted fields.');
        return;
      }

      const result = await handleRef.current?.confirm({
        clientSecret: prepared.clientSecret,
        paymentIntentId: prepared.paymentIntentId,
      });

      if (!result || !result.ok) {
        // Form stays filled and re-editable (PRD 6.5).
        setBanner(`${result?.reason ?? 'Your card was declined'}. Please try another card.`);
        return;
      }

      setCart(null);
      router.push(`/checkout/success?pi=${encodeURIComponent(prepared.paymentIntentId)}`);
    } catch (err) {
      console.error(err);
      setBanner('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  const summary = (
    <OrderSummary
      lines={lines}
      subtotalCents={subtotalCents}
      shippingCents={shippingCents}
      totalCents={totalCents}
    />
  );

  return (
    <form onSubmit={submit} noValidate>
      {/* Mobile: summary collapses into a bar at the top (PRD 6.5). */}
      <div className="mb-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((open) => !open)}
          aria-expanded={summaryOpen}
          aria-controls="mobile-summary"
          className="tap-target flex w-full items-center justify-between rounded-[var(--radius)] border border-border px-4 text-sm"
        >
          <span>{summaryOpen ? 'Hide order summary' : 'Order summary'}</span>
          <span className="tabular font-medium">{formatMoney(totalCents)}</span>
        </button>
        {summaryOpen ? (
          <div id="mobile-summary" className="mt-4 rounded-[var(--radius)] border border-border p-4">
            {summary}
          </div>
        ) : null}
      </div>

      <div className="grid gap-10 lg:grid-cols-[60fr_40fr] lg:gap-16">
        <div className="space-y-8">
          {banner ? <Alert variant="destructive">{banner}</Alert> : null}

          <AddressForm
            values={values}
            errors={errors}
            disabled={processing}
            onChange={setField}
          />

          <ShippingMethodPicker
            value={shippingMethod}
            subtotalCents={subtotalCents}
            disabled={processing}
            onChange={setShippingMethod}
          />

          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="text-h3">
              Payment
            </h2>

            <div className="mt-4">
              {mode === 'stripe' && publishableKey ? (
                <StripePayment
                  publishableKey={publishableKey}
                  totalCents={totalCents}
                  disabled={processing}
                  handleRef={handleRef}
                />
              ) : (
                <MockPayment totalCents={totalCents} disabled={processing} handleRef={handleRef} />
              )}
            </div>

            {/* PRD 9.4 - so the client can buy something unassisted. */}
            <p className="mt-4 rounded-[var(--radius)] bg-muted px-4 py-3 text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">Demo store</strong> — use card{' '}
              <span className="tabular">4242 4242 4242 4242</span>, any future expiry, any CVC, any
              postal code. No real payment is taken.
            </p>
          </section>

          <Button type="submit" size="lg" full loading={processing}>
            {processing ? 'Processing…' : `Pay ${formatMoney(totalCents)}`}
          </Button>
        </div>

        <aside className="hidden lg:block" aria-labelledby="summary-heading">
          <div className="sticky top-24 rounded-[var(--radius)] border border-border p-5">
            <h2 id="summary-heading" className="text-h3 mb-4">
              Order summary
            </h2>
            {summary}
          </div>
        </aside>
      </div>
    </form>
  );
}
