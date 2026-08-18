'use client';

import Image from 'next/image';
import type { CartLine } from '@/lib/commerce/types';
import { formatMoney } from '@/lib/money';

export function OrderSummary({
  lines,
  subtotalCents,
  shippingCents,
  totalCents,
}: {
  lines: CartLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-3">
            <div className="relative shrink-0">
              <Image
                src={line.imageUrl}
                alt={line.productTitle}
                width={64}
                height={64}
                sizes="64px"
                className="rounded-[var(--radius)] border border-border object-cover"
              />
              <span
                className="tabular absolute -right-2 -top-2 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] leading-5 text-primary-foreground"
                aria-hidden="true"
              >
                {line.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{line.productTitle}</p>
              <p className="truncate text-sm text-muted-foreground">{line.variantTitle}</p>
              <p className="sr-only">Quantity {line.quantity}</p>
            </div>
            <span className="tabular text-sm">{formatMoney(line.lineTotalCents)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular">{formatMoney(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="tabular">{shippingCents === 0 ? 'Free' : formatMoney(shippingCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
          <dt>Total</dt>
          <dd className="tabular">{formatMoney(totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
