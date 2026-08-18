'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { CartLine } from '@/lib/commerce/types';
import { formatMoney } from '@/lib/money';
import { removeCartLine, updateCartLine } from '@/server/actions/cart';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { useCart } from './CartProvider';

export function CartLineItem({ line, onNavigate }: { line: CartLine; onNavigate?: () => void }) {
  const { setCart } = useCart();
  const [pending, startTransition] = React.useTransition();
  const [notice, setNotice] = React.useState<string | undefined>();

  function change(quantity: number) {
    setNotice(undefined);
    startTransition(async () => {
      const result = await updateCartLine({ lineId: line.id, quantity });
      setCart(result.cart);
      setNotice(result.notice);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCartLine({ lineId: line.id });
      setCart(result.cart);
    });
  }

  return (
    // Only the affected line dims while it updates; the rest stays interactive (PRD 6.4).
    <li className={pending ? 'opacity-55 transition-opacity' : 'transition-opacity'}>
      <div className="flex gap-3">
        <Link
          href={`/products/${line.productSlug}`}
          onClick={onNavigate}
          className="shrink-0 overflow-hidden rounded-[var(--radius)] border border-border"
        >
          <Image
            src={line.imageUrl}
            alt={line.productTitle}
            width={88}
            height={88}
            sizes="88px"
            className="h-22 w-22 object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/products/${line.productSlug}`}
                onClick={onNavigate}
                className="block truncate text-sm font-medium hover:underline"
              >
                {line.productTitle}
              </Link>
              <p className="truncate text-sm text-muted-foreground">{line.variantTitle}</p>
              <p className="tabular mt-1 text-sm text-muted-foreground">
                {formatMoney(line.unitPriceCents)} each
              </p>
            </div>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={`Remove ${line.productTitle} ${line.variantTitle} from cart`}
              className="tap-target -mr-2 -mt-2 inline-flex items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <QuantityStepper
              value={line.quantity}
              onChange={change}
              min={0}
              max={Math.max(line.availableStock, 1)}
              disabled={pending}
              label={`Quantity for ${line.productTitle}`}
            />
            <span className="tabular text-sm font-medium">{formatMoney(line.lineTotalCents)}</span>
          </div>

          {notice ? (
            <p role="status" aria-live="polite" className="mt-2 text-sm text-destructive">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
