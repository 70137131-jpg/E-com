'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { CartContents } from './CartContents';
import { useCart } from './CartProvider';

export function CartDrawer() {
  const { isOpen, closeCart, openCart } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
      <SheetContent title="Your cart" description="Items in your shopping cart">
        <CartContents variant="drawer" onNavigate={closeCart} />
      </SheetContent>
    </Sheet>
  );
}
