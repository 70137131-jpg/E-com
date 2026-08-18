import 'server-only';
import { commerce, type Order } from '@/lib/commerce';
import { sendOrderConfirmation } from '@/lib/email/resend';
import type { PaymentMetadata } from '@/lib/payments/provider';

/**
 * The one place a successful payment becomes an order.
 *
 * Both the Stripe webhook and the mock gateway funnel through here, so the two
 * payment modes exercise identical order, stock and email code (PRD 13.2 step 10-11).
 */
export async function fulfilPayment(
  paymentIntentId: string,
  metadata: PaymentMetadata,
): Promise<Order> {
  console.info(`[payment] succeeded pi=${paymentIntentId} cart=${metadata.cartToken}`);

  const order = await commerce.createOrder({
    cartToken: metadata.cartToken,
    email: metadata.email,
    address: metadata.address,
    shippingMethod: metadata.shippingMethod,
    paymentIntentId,
  });

  console.info(
    `[order] created ${order.orderNumber} status=${order.status} total=${order.totalCents}` +
      (order.stockConflict ? ' STOCK_CONFLICT' : ''),
  );

  // Outside the transaction on purpose - a mail failure must not roll back a
  // paid order (PRD 13.2 step 11).
  await sendOrderConfirmation(order);

  return order;
}
