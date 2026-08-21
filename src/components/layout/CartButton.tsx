'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

export function CartButton() {
  const { cart, openCart } = useCart();
  const count = cart?.itemCount ?? 0;

  return (
    <button
      type="button"
      onClick={(event) => openCart(event.currentTarget)}
      className="tap-target relative inline-flex items-center justify-center rounded-[var(--radius)] hover:bg-muted"
      aria-label={count === 1 ? 'Open cart, 1 item' : `Open cart, ${count} items`}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      {count > 0 ? (
        <span
          className="tabular absolute right-1 top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] font-medium leading-5 text-primary-foreground"
          aria-hidden="true"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
