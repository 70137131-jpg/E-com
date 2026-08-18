'use client';

import * as React from 'react';
import type { Cart } from '@/lib/commerce/types';
import { currentCart } from '@/server/actions/cart';

type CartContextValue = {
  cart: Cart | null;
  setCart: (cart: Cart | null) => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

/**
 * Holds the cart client-side so the header badge and drawer update the instant
 * a server action returns, without a round trip to refetch.
 *
 * The cart is loaded after mount rather than passed down from the layout on
 * purpose: reading the cart cookie during render would opt every page out of
 * ISR, and the catalogue routes are required to be statically cached (PRD 6.1-6.3).
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<Cart | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    currentCart().then((loaded) => {
      if (!cancelled) setCart(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      setCart,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [cart, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
