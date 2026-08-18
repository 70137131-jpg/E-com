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

  function submit() {
    if (!variant) return;
    startTransition(async () => {
      const result = await addToCart({ variantId: variant.id, quantity });
      setCart(result.cart);
      if (result.notice) toast.warning(result.notice);
      openCart();
    });
  }

  return (
    <Button size="lg" full onClick={submit} disabled={disabled} loading={pending}>
      {label}
    </Button>
  );
}
