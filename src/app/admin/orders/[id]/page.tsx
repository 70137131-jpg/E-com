import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { OrderStatusActions } from '@/components/admin/OrderStatusActions';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Alert } from '@/components/ui/alert';
import { Table, Td, Th } from '@/components/ui/table';
import { commerce } from '@/lib/commerce';
import { longDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { SHIPPING_METHODS } from '@/lib/shipping';
import { requireAdmin } from '@/server/admin-auth';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: PageProps<'/admin/orders/[id]'>) {
  const { id } = await props.params;
  const order = await commerce.getOrder(id);
  return { title: order ? `Order ${order.orderNumber}` : 'Order' };
}

/** PRD 6.11. Every figure here comes from the order's own snapshot fields. */
export default async function AdminOrderDetailPage(props: PageProps<'/admin/orders/[id]'>) {
  await requireAdmin();

  const { id } = await props.params;
  const order = await commerce.getOrder(id);
  if (!order) notFound();

  const address = order.shippingAddress;
  const method = SHIPPING_METHODS[order.shippingMethod];

  return (
    <div className="container-page section">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{longDateTime.format(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.stockConflict ? (
        <Alert variant="destructive" className="mt-6">
          Payment succeeded but stock could not be decremented for every line, so this order was
          left pending for review. Check stock levels before fulfilling.
        </Alert>
      ) : null}

      <div className="mt-6 rounded-[var(--radius)] border border-border bg-background p-5">
        <OrderStatusActions
          orderId={order.id}
          orderNumber={order.orderNumber}
          status={order.status}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section
          className="rounded-[var(--radius)] border border-border bg-background p-5"
          aria-labelledby="items-heading"
        >
          <h2 id="items-heading" className="text-h3 mb-4">
            Items
          </h2>

          <Table>
            <thead>
              <tr>
                <Th colSpan={2}>Product</Th>
                <Th className="hidden sm:table-cell">SKU</Th>
                <Th className="text-right">Unit</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <Td className="w-14">
                    <Image
                      src={item.imageUrl}
                      alt={item.productTitle}
                      width={44}
                      height={44}
                      sizes="44px"
                      className="rounded-[var(--radius)] border border-border object-cover"
                    />
                  </Td>
                  <Td>
                    <p className="font-medium">{item.productTitle}</p>
                    <p className="text-muted-foreground">{item.variantTitle}</p>
                  </Td>
                  <Td className="hidden text-muted-foreground sm:table-cell">{item.sku}</Td>
                  <Td className="tabular text-right">{formatMoney(item.unitPriceCents)}</Td>
                  <Td className="tabular text-right">{item.quantity}</Td>
                  <Td className="tabular text-right">{formatMoney(item.lineTotalCents)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular">{formatMoney(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping — {method.name}</dt>
              <dd className="tabular">
                {order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
              <dt>Total</dt>
              <dd className="tabular">{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <section
            className="rounded-[var(--radius)] border border-border bg-background p-5"
            aria-labelledby="customer-heading"
          >
            <h2 id="customer-heading" className="text-h3 mb-3">
              Customer
            </h2>
            <p className="text-sm">{address.name}</p>
            <p className="break-words text-sm text-muted-foreground">{order.email}</p>
            <p className="text-sm text-muted-foreground">{address.phone}</p>
          </section>

          <section
            className="rounded-[var(--radius)] border border-border bg-background p-5"
            aria-labelledby="shipping-heading"
          >
            <h2 id="shipping-heading" className="text-h3 mb-3">
              Shipping address
            </h2>
            <address className="text-sm not-italic leading-relaxed text-muted-foreground">
              {address.line1}
              <br />
              {address.line2 ? (
                <>
                  {address.line2}
                  <br />
                </>
              ) : null}
              {address.city}
              {address.postalCode ? ` ${address.postalCode}` : ''}
              <br />
              {address.country}
            </address>
            <p className="mt-3 text-sm">
              {method.name} — {method.estimate}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
