import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/commerce/types';

/** One colour per status, used everywhere a status is shown (PRD 6.11). */
const VARIANTS: Record<OrderStatus, React.ComponentProps<typeof Badge>['variant']> = {
  pending: 'accent',
  paid: 'success',
  fulfilled: 'neutral',
  cancelled: 'destructive',
};

const LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
