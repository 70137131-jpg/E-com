'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { updateOrderStatus } from '@/server/actions/admin';
import type { OrderStatus } from '@/lib/commerce/types';

/**
 * PRD 6.11 / 12.5. The buttons shown are derived from the same transition table
 * the server enforces, so the UI cannot offer an action the server will refuse.
 */
export function OrderStatusActions({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<OrderStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const canFulfil = status === 'paid';
  const canCancel = status === 'pending' || status === 'paid';

  async function run(next: OrderStatus) {
    setPending(next);
    const result = await updateOrderStatus({ orderId, status: next });
    setPending(null);
    setConfirmOpen(false);

    if (result.ok) {
      toast.success(result.message ?? 'Order updated.');
      router.refresh();
    } else {
      toast.error(result.message ?? 'Something went wrong. Please try again.');
    }
  }

  if (!canFulfil && !canCancel) {
    return <p className="text-sm text-muted-foreground">No further actions for this order.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {canFulfil ? (
        <Button onClick={() => run('fulfilled')} loading={pending === 'fulfilled'}>
          Mark as fulfilled
        </Button>
      ) : null}

      {canCancel ? (
        <>
          {/* Destructive actions require a confirm dialog (PRD 7.6). */}
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Cancel order
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent
              title={`Cancel order ${orderNumber}?`}
              description="This cannot be undone. The customer is not notified automatically."
            >
              <div className="mt-6 flex justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline">Keep order</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => run('cancelled')}
                  loading={pending === 'cancelled'}
                >
                  Cancel order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
