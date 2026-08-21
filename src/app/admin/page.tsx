import Link from 'next/link';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Table, Td, Th } from '@/components/ui/table';
import { commerce } from '@/lib/commerce';
import { shortDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { requireAdmin } from '@/server/admin-auth';

export const metadata = { title: 'Dashboard' };

// Admin must never serve a cached view of the business.
export const dynamic = 'force-dynamic';

/** PRD 6.10. */
export default async function AdminDashboardPage() {
  await requireAdmin();

  const [stats, recent, lowStock] = await Promise.all([
    commerce.getDashboardStats(),
    commerce.listOrders({ limit: 5 }),
    commerce.getLowStock(3),
  ]);

  return (
    <div className="container-page section">
      <h1 className="text-h1">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders today" value={String(stats.ordersToday)} />
        <StatCard label="Revenue today" value={formatMoney(stats.revenueTodayCents)} />
        <StatCard label="Awaiting fulfilment" value={String(stats.awaitingFulfilment)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section
          className="rounded-[var(--radius)] border border-border bg-background p-5"
          aria-labelledby="recent-heading"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="recent-heading" className="text-h3">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No orders today.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id}>
                    <Td>
                      <Link href={`/admin/orders/${order.id}`} className="font-medium underline-offset-4 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </Td>
                    <Td className="max-w-[16ch] truncate">{order.shippingAddress.name}</Td>
                    <Td className="tabular text-right">{formatMoney(order.totalCents)}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {shortDate.format(order.createdAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section
          className="rounded-[var(--radius)] border border-border bg-background p-5"
          aria-labelledby="low-stock-heading"
        >
          <h2 id="low-stock-heading" className="text-h3 mb-3">
            Low stock
          </h2>

          {lowStock.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">All stock levels healthy.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lowStock.map((row) => (
                <li key={row.sku} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.productTitle}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {row.variantTitle} · {row.sku}
                    </p>
                  </div>
                  <span className="tabular whitespace-nowrap text-sm">
                    {row.stock === 0 ? 'Out of stock' : `${row.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
