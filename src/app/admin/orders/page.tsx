import Link from 'next/link';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Table, Td, Th } from '@/components/ui/table';
import { commerce, ORDER_STATUSES, isOrderStatus } from '@/lib/commerce';
import { mediumDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { requireAdmin } from '@/server/admin-auth';

export const metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

const TABS = ['all', ...ORDER_STATUSES] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  all: 'All',
  pending: 'Pending',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

/**
 * PRD 6.11. The filter is a search param rather than client state, so a filtered
 * view is a shareable URL and survives a reload.
 */
export default async function AdminOrdersPage(props: PageProps<'/admin/orders'>) {
  await requireAdmin();

  const { status } = await props.searchParams;
  const active = typeof status === 'string' && isOrderStatus(status) ? status : 'all';

  const orders = await commerce.listOrders(active === 'all' ? {} : { status: active });

  return (
    <div className="container-page section">
      <h1 className="text-h1">Orders</h1>

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => {
          const isActive = tab === active;
          return (
            <Link
              key={tab}
              href={tab === 'all' ? '/admin/orders' : `/admin/orders?status=${tab}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'tap-target -mb-px inline-flex items-center border-b-2 px-3 text-sm',
                isActive
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {TAB_LABELS[tab]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[var(--radius)] border border-border bg-background">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {active === 'all' ? 'No orders yet.' : `No ${active} orders.`}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th className="hidden sm:table-cell">Email</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50">
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {mediumDate.format(order.createdAt)}
                  </Td>
                  <Td className="max-w-[18ch] truncate">{order.shippingAddress.name}</Td>
                  <Td className="hidden max-w-[24ch] truncate text-muted-foreground sm:table-cell">
                    {order.email}
                  </Td>
                  <Td className="tabular text-right">{formatMoney(order.totalCents)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                      {order.stockConflict ? (
                        <span
                          title="Payment succeeded but stock could not be decremented."
                          className="text-xs font-medium text-destructive"
                        >
                          Needs review
                        </span>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
