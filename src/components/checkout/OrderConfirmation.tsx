'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useCart } from '@/components/cart/CartProvider';
import { findOrderByPaymentIntent } from '@/server/actions/checkout';
import type { Order } from '@/lib/commerce/types';
import { formatMoney } from '@/lib/money';
import { SHIPPING_METHODS } from '@/lib/shipping';
import Image from 'next/image';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;

/**
 * PRD 6.6. The order is created by the webhook, which may land a moment after
 * the browser gets here, so this polls rather than assuming.
 *
 * On timeout it never shows an error: the money moved, and telling a paying
 * customer that something failed is worse than telling them it is in progress.
 */
export function OrderConfirmation({
  paymentIntentId,
  initialOrder,
}: {
  paymentIntentId: string;
  initialOrder: Order | null;
}) {
  const { setCart } = useCart();
  const [order, setOrder] = React.useState<Order | null>(initialOrder);
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    // The cart was deleted server-side when the order was created.
    setCart(null);
  }, [setCart]);

  React.useEffect(() => {
    if (order) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      if (cancelled) return;

      const found = await findOrderByPaymentIntent(paymentIntentId);
      if (cancelled) return;

      if (found) {
        setOrder(found);
        return;
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [order, paymentIntentId]);

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center" aria-live="polite">
        {timedOut ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
            <h1 className="text-h1">Your payment went through</h1>
            <p className="max-w-[52ch] text-muted-foreground">
              Your order is being finalised — check your email in a few minutes.
            </p>
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              Continue shopping
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            <h1 className="text-h2">Confirming your order…</h1>
            <p className="text-muted-foreground">This usually takes a second or two.</p>
          </>
        )}
      </div>
    );
  }

  const addr = order.shippingAddress;
  const method = SHIPPING_METHODS[order.shippingMethod];

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
        <h1 className="text-h1">Thank you for your order</h1>
        <p className="text-price font-medium">Order {order.orderNumber}</p>
        <p className="text-muted-foreground">
          A confirmation email is on its way to {order.email}
        </p>
      </div>

      <section className="mt-10 rounded-[var(--radius)] border border-border p-5" aria-labelledby="items-heading">
        <h2 id="items-heading" className="text-h3 mb-4">
          Your order
        </h2>
        <ul className="space-y-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <Image
                src={item.imageUrl}
                alt={item.productTitle}
                width={56}
                height={56}
                sizes="56px"
                className="rounded-[var(--radius)] border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.productTitle}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {item.variantTitle} · Qty {item.quantity}
                </p>
              </div>
              <span className="tabular text-sm">{formatMoney(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular">{formatMoney(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping — {method.name}</dt>
            <dd className="tabular">
              {order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular">{formatMoney(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-[var(--radius)] border border-border p-5" aria-labelledby="address-heading">
        <h2 id="address-heading" className="text-h3 mb-3">
          Shipping to
        </h2>
        <address className="text-sm not-italic leading-relaxed text-muted-foreground">
          {addr.name}
          <br />
          {addr.line1}
          <br />
          {addr.line2 ? (
            <>
              {addr.line2}
              <br />
            </>
          ) : null}
          {addr.city}
          {addr.postalCode ? ` ${addr.postalCode}` : ''}
          <br />
          {addr.phone}
        </address>
      </section>

      <div className="mt-8 text-center">
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
