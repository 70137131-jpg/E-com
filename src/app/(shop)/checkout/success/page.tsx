import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrderConfirmation } from '@/components/checkout/OrderConfirmation';
import { findOrderByPaymentIntent } from '@/server/actions/checkout';

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
};

/**
 * PRD 6.6. The order is created by the webhook, so it may not exist the instant
 * the browser lands here — OrderConfirmation polls for it.
 *
 * We still look it up once server-side: in normal operation the webhook has
 * already landed, so the page renders complete on first paint and the client
 * never polls at all.
 */
export default async function CheckoutSuccessPage(props: PageProps<'/checkout/success'>) {
  const { pi } = await props.searchParams;
  const paymentIntentId = typeof pi === 'string' ? pi : '';

  // Invalid or missing `pi` param: redirect home (PRD 6.6 states).
  if (!paymentIntentId) redirect('/');

  const order = await findOrderByPaymentIntent(paymentIntentId);

  return (
    <div className="container-page">
      <OrderConfirmation paymentIntentId={paymentIntentId} initialOrder={order} />
    </div>
  );
}
