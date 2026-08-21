'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { CartContents } from './CartContents';
import { useCart } from './CartProvider';

export function CartDrawer() {
  const { isOpen, closeCart, openCart, restoreOpenerFocus } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
      <SheetContent
        title="Your cart"
        description="Items in your shopping cart"
        // Radix aims its own restore at a `Trigger` this drawer does not have:
        // its handler calls preventDefault() and then focuses a null ref, so the
        // FocusScope restore never runs and focus lands on <body>. Restoring the
        // opener ourselves is the only way back (PRD 17.3). If the opener has
        // since unmounted there is nothing better to aim at, and focus falls to
        // <body> as before.
        onCloseAutoFocus={(event) => {
          if (restoreOpenerFocus()) event.preventDefault();
        }}
      >
        <CartContents variant="drawer" onNavigate={closeCart} />
      </SheetContent>
    </Sheet>
  );
}
