import 'server-only';
import { commerce, type Order } from '@/lib/commerce';
import { sendOrderConfirmation } from '@/lib/email/resend';
import { ALERT_EVENTS, log } from '@/lib/log';
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
  log.info('payment.succeeded', { paymentIntentId, cartToken: metadata.cartToken });

  const order = await commerce.createOrder({
    cartToken: metadata.cartToken,
    email: metadata.email,
    address: metadata.address,
    shippingMethod: metadata.shippingMethod,
    paymentIntentId,
  });

  log.info('order.created', {
    orderNumber: order.orderNumber,
    status: order.status,
    totalCents: order.totalCents,
    stockConflict: order.stockConflict,
  });

  if (order.stockConflict) {
    // The shopper has been charged for something the shop may not have. Someone
    // has to reconcile it by hand, and until they do the order sits `pending`
    // where it is easy to miss (PRD 13.4).
    log.alert(ALERT_EVENTS.ORDER_STOCK_CONFLICT, {
      orderNumber: order.orderNumber,
      paymentIntentId,
      totalCents: order.totalCents,
      email: order.email,
    });
  }

  // Outside the transaction on purpose - a mail failure must not roll back a
  // paid order (PRD 13.2 step 11).
  await sendOrderConfirmation(order);

  return order;
}
