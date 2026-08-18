import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { paymentMode, stripePublishableKey } from '@/lib/payments';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-page section">
      <h1 className="text-h1 mb-8">Checkout</h1>
      <CheckoutForm mode={paymentMode} publishableKey={stripePublishableKey()} />
    </div>
  );
}
