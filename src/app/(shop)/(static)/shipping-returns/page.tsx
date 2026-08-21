import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_METHODS,
  SHIPPING_METHOD_KEYS,
} from '@/lib/shipping';

export const metadata: Metadata = {
  title: 'Shipping & Returns',
  description: 'Delivery options, costs and our 7-day return window.',
  alternates: { canonical: '/shipping-returns' },
};

/**
 * PRD 12.3: this page must match the shipping table word for word. It is
 * rendered from that table rather than retyped, so the two cannot drift apart.
 */
export default function ShippingReturnsPage() {
  return (
    <>
      <h1>Shipping &amp; Returns</h1>

      <h2>Delivery</h2>
      <p>
        We ship across Pakistan. Orders placed before 2pm are dispatched the same working day;
        anything later goes out the next morning.
      </p>
      <ul>
        {SHIPPING_METHOD_KEYS.map((key) => {
          const method = SHIPPING_METHODS[key];
          return (
            <li key={key}>
              <strong className="font-medium text-foreground">{method.name}</strong> —{' '}
              {method.estimate} —{' '}
              {method.priceCents === 0 ? 'Free' : formatMoney(method.priceCents)}
            </li>
          );
        })}
      </ul>
      <p>
        Standard delivery is free on orders over {formatMoney(FREE_SHIPPING_THRESHOLD_CENTS)}. Store
        pickup is from our studio at {BRAND.addressLine}, and we will email you when the order is
        ready.
      </p>

      <h2>Returns</h2>
      <p>
        You have <strong className="font-medium text-foreground">7 days</strong> from delivery to
        return anything unworn, unwashed and with its tags attached. Tell us at {BRAND.email} and we
        will arrange collection; return shipping is on us if the piece was faulty or we sent the
        wrong thing, and on you otherwise.
      </p>
      <p>
        Refunds go back to the original payment method within five working days of the piece
        reaching us. Exchanges for a different size are subject to stock — if we cannot match it, we
        refund instead.
      </p>
      <p>
        Pieces altered by a tailor cannot be returned, since we have no way to resell them.
      </p>
    </>
  );
}
