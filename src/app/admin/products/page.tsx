import { ProductTable } from '@/components/admin/ProductTable';
import { commerce } from '@/lib/commerce';
import { requireAdmin } from '@/server/admin-auth';

export const metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

/** PRD 6.12. Unpublished products must appear here — that is how you re-publish. */
export default async function AdminProductsPage() {
  await requireAdmin();

  const products = await commerce.getProducts({ includeUnpublished: true });

  return (
    <div className="container-page section">
      <h1 className="text-h1">Products</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Expand a product to edit variant prices and stock. Changes save when you leave the field and
        appear on the storefront immediately.
      </p>

      <div className="mt-6 rounded-[var(--radius)] border border-border bg-background">
        <ProductTable products={products} />
      </div>
    </div>
  );
}
