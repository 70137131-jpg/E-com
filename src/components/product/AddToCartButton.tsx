'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/cart/CartProvider';
import { addToCart } from '@/server/actions/cart';
import type { Variant } from '@/lib/commerce/types';

export function AddToCartButton({
  variant,
  quantity,
  hasSelection,
}: {
  variant: Variant | null;
  quantity: number;
  hasSelection: boolean;
}) {
  const { setCart, openCart } = useCart();
  const [pending, startTransition] = React.useTransition();

  const outOfStock = variant !== null && variant.stock <= 0;
  const disabled = !variant || outOfStock;

  // PRD 8.1 - exact strings, in priority order.
  const label = pending
    ? 'Adding…'
    : !hasSelection || !variant
      ? 'Select options'
      : outOfStock
        ? 'Out of stock'
        : 'Add to cart';

  // `trigger` is captured synchronously in the click handler: by the time the
  // transition below resolves, this button is disabled by `loading` and focus
  // has already left it, so the drawer would have nothing to restore to.
  function submit(trigger: HTMLElement | null) {
    if (!variant) return;
    startTransition(async () => {
      const result = await addToCart({ variantId: variant.id, quantity });
      setCart(result.cart);
      if (result.notice) toast.warning(result.notice);
      openCart(trigger);
    });
  }

  return (
    <Button
      size="lg"
      full
      onClick={(event) => submit(event.currentTarget)}
      disabled={disabled}
      loading={pending}
    >
      {label}
    </Button>
  );
}
