import type { Metadata } from 'next';
import { CartContents } from '@/components/cart/CartContents';

export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="container-page section max-w-3xl">
      <h1 className="text-h1">Your cart</h1>
      <div className="mt-6">
        <CartContents variant="page" />
      </div>
    </div>
  );
}
