'use client';

import * as React from 'react';
import type { Cart } from '@/lib/commerce/types';
import { currentCart } from '@/server/actions/cart';

type CartContextValue = {
  cart: Cart | null;
  /**
   * True until the first load resolves. Without this, `cart === null` means both
   * "still loading" and "genuinely empty", and the cart flashes its empty state
   * on every page load before the real contents arrive.
   */
  loading: boolean;
  setCart: (cart: Cart | null) => void;
  isOpen: boolean;
  /**
   * `opener` is the control to hand focus back to on close. Pass it explicitly
   * when opening from inside a transition: by then the triggering button may
   * already be disabled by its own loading state, so `document.activeElement`
   * has moved to <body> and the fallback below finds nothing worth keeping.
   */
  openCart: (opener?: HTMLElement | null) => void;
  closeCart: () => void;
  /**
   * Returns focus to whatever opened the drawer. The drawer is opened
   * programmatically and has no Radix `Trigger`, so Radix's own restore is a
   * no-op and focus would otherwise land on <body> (PRD 17.3 keyboard
   * operability). Returns false when there is nothing to focus.
   */
  restoreOpenerFocus: () => boolean;
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
  const [loading, setLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  // Captured at open time: the cart button, or the add-to-cart button that
  // opened the drawer as a side effect.
  const openerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    currentCart()
      .then((loaded) => {
        if (!cancelled) setCart(loaded);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      setCart,
      isOpen,
      openCart: (opener) => {
        const active = document.activeElement;
        const fallback =
          active instanceof HTMLElement && active !== document.body ? active : null;
        openerRef.current = opener ?? fallback;
        setIsOpen(true);
      },
      closeCart: () => setIsOpen(false),
      restoreOpenerFocus: () => {
        const opener = openerRef.current;
        // A line-item control can be unmounted by the time the drawer closes.
        if (!opener || !opener.isConnected) return false;
        opener.focus();
        return true;
      },
    }),
    [cart, loading, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
