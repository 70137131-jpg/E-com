'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CartLineItem } from './CartLineItem';
import { useCart } from './CartProvider';

/**
 * One component renders both the drawer and /cart (PRD 6.4). The drawer is the
 * primary surface; the page exists so a direct link still works.
 */
export function CartContents({
  variant,
  onNavigate,
}: {
  variant: 'drawer' | 'page';
  onNavigate?: () => void;
}) {
  const { cart } = useCart();
  const lines = cart?.lines ?? [];

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty."
        action={{ href: '/collections/everyday', label: 'Continue shopping' }}
      />
    );
  }

  return (
    <div className={cn(variant === 'drawer' && 'flex min-h-0 flex-1 flex-col')}>
      <ul
        className={cn(
          'space-y-5',
          variant === 'drawer' ? 'min-h-0 flex-1 overflow-y-auto px-4 py-4' : 'py-2',
        )}
      >
        {lines.map((line) => (
          <CartLineItem key={line.id} line={line} onNavigate={onNavigate} />
        ))}
      </ul>

      <div
        className={cn(
          'space-y-3',
          variant === 'drawer' ? 'border-t border-border px-4 py-4' : 'mt-6 border-t border-border pt-6',
        )}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Subtotal</span>
          <span className="tabular text-price font-medium">
            {formatMoney(cart?.subtotalCents ?? 0)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Shipping calculated at checkout</p>

        <Link
          href="/checkout"
          onClick={onNavigate}
          className={cn(buttonVariants({ size: 'lg', full: true }))}
        >
          Checkout
        </Link>

        {variant === 'drawer' ? (
          <Link
            href="/cart"
            onClick={onNavigate}
            className={cn(buttonVariants({ variant: 'outline', full: true }))}
          >
            View cart
          </Link>
        ) : (
          <Link
            href="/collections/everyday"
            className={cn(buttonVariants({ variant: 'ghost', full: true }))}
          >
            Continue shopping
          </Link>
        )}
      </div>
    </div>
  );
}
