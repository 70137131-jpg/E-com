import 'server-only';
import { Resend } from 'resend';
import { BRAND } from '@/lib/brand';
import { ALERT_EVENTS, log } from '@/lib/log';
import type { Order } from '@/lib/commerce/types';
import { orderConfirmationHtml, orderConfirmationSubject } from './templates/order-confirmation';

/**
 * Email is a nice-to-have, not a blocker (PRD R6). Without RESEND_API_KEY the
 * rendered message is logged instead of sent, so the checkout flow never fails
 * because of mail configuration.
 */
export async function sendOrderConfirmation(order: Order): Promise<void> {
  const subject = orderConfirmationSubject(order);
  const html = orderConfirmationHtml(order);
  // resend.dev is Resend's shared sandbox sender: it works without domain setup
  // but fails SPF/DKIM alignment for your own domain, so real mail lands in
  // spam. lib/env.ts refuses to boot a non-demo build with EMAIL_FROM unset.
  const from = process.env.EMAIL_FROM || `${BRAND.name} <onboarding@resend.dev>`;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    log.info('email.skipped_no_key', {
      orderNumber: order.orderNumber,
      to: order.email,
      subject,
    });
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to: order.email, subject, html });
    if (error) {
      // The shopper paid and will hear nothing. Silent by design so checkout
      // cannot fail on mail, which is exactly why it needs an alert.
      log.alert(ALERT_EVENTS.EMAIL_FAILED, {
        reason: 'provider_error',
        orderNumber: order.orderNumber,
        to: order.email,
        err: error,
      });
      return;
    }
    log.info('email.sent', { orderNumber: order.orderNumber, to: order.email });
  } catch (err) {
    // Never let a mail failure surface to the shopper - the money already moved.
    log.alert(ALERT_EVENTS.EMAIL_FAILED, {
      reason: 'threw',
      orderNumber: order.orderNumber,
      to: order.email,
      err,
    });
  }
}
