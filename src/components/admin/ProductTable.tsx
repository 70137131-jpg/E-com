'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Table, Td, Th } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import type { Product } from '@/lib/commerce/types';
import { setProductPublished, updateVariant } from '@/server/actions/admin';

/**
 * PRD 6.12. Price and stock are inline inputs that save on blur; a failed save
 * reverts the value and shows a toast, so the table never displays a number the
 * database does not hold.
 */
export function ProductTable({ products }: { products: Product[] }) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-8" />
          <Th colSpan={2}>Product</Th>
          <Th className="hidden sm:table-cell">Collection</Th>
          <Th className="text-right">Stock</Th>
          <Th className="text-right">Published</Th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
          const isOpen = expanded.has(product.id);
          return (
            <React.Fragment key={product.id}>
              <tr className="hover:bg-muted/50">
                <Td className="w-8">
                  <button
                    type="button"
                    onClick={() => toggle(product.id)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Hide' : 'Show'} variants of ${product.title}`}
                    className="tap-target inline-flex items-center justify-center rounded-[var(--radius)] hover:bg-muted"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </Td>
                <Td className="w-14">
                  <Image
                    src={product.images[0] ?? '/products/placeholder.webp'}
                    alt={product.title}
                    width={40}
                    height={40}
                    sizes="40px"
                    className="rounded-[var(--radius)] border border-border object-cover"
                  />
                </Td>
                <Td>
                  <Link
                    href={`/products/${product.slug}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {product.title}
                  </Link>
                  <p className="text-muted-foreground">
                    {product.variants.length} variant{product.variants.length === 1 ? '' : 's'}
                  </p>
                </Td>
                <Td className="hidden capitalize text-muted-foreground sm:table-cell">
                  {product.collection}
                </Td>
                <Td className="tabular text-right">{product.totalStock}</Td>
                <Td className="text-right">
                  <PublishedToggle productId={product.id} published={product.published} />
                </Td>
              </tr>

              {isOpen
                ? product.variants.map((variant) => (
                    <tr key={variant.id} className="bg-muted/30">
                      <Td />
                      <Td colSpan={2}>
                        <p className="font-medium">{variant.title}</p>
                        <p className="text-muted-foreground">{variant.sku}</p>
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <NumberField
                          label={`Price for ${variant.title}`}
                          prefix="Rs"
                          initial={Math.round(variant.priceCents / 100)}
                          onSave={(value) =>
                            updateVariant({ variantId: variant.id, priceRupees: value })
                          }
                        />
                      </Td>
                      <Td className="text-right">
                        <NumberField
                          label={`Stock for ${variant.title}`}
                          initial={variant.stock}
                          onSave={(value) => updateVariant({ variantId: variant.id, stock: value })}
                        />
                      </Td>
                      <Td className="text-right text-muted-foreground sm:hidden">
                        {formatMoney(variant.priceCents)}
                      </Td>
                      <Td className="hidden sm:table-cell" />
                    </tr>
                  ))
                : null}
            </React.Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}

/** Saves on blur, but only when the value actually changed. */
function NumberField({
  label,
  initial,
  prefix,
  onSave,
}: {
  label: string;
  initial: number;
  prefix?: string;
  onSave: (value: number) => Promise<{ ok: boolean; message?: string }>;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(String(initial));
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const committed = React.useRef(initial);

  async function commit() {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setValue(String(committed.current));
      toast.error('Enter a whole number.');
      return;
    }
    if (parsed === committed.current) return;

    setPending(true);
    const result = await onSave(parsed);
    setPending(false);

    if (result.ok) {
      committed.current = parsed;
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      router.refresh();
    } else {
      // Revert to the last value the server confirmed (PRD 6.12).
      setValue(String(committed.current));
      toast.error(result.message ?? 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {prefix ? <span className="text-muted-foreground">{prefix}</span> : null}
      <Input
        aria-label={label}
        inputMode="numeric"
        value={value}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        className="h-9 w-24 text-right text-sm tabular"
      />
      <span className={cn('w-4 text-success transition-opacity', saved ? 'opacity-100' : 'opacity-0')}>
        <Check className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{saved ? 'Saved' : ''}</span>
      </span>
    </div>
  );
}

function PublishedToggle({ productId, published }: { productId: string; published: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(published);
  const [pending, setPending] = React.useState(false);

  async function toggle() {
    const next = !checked;
    setChecked(next);
    setPending(true);
    const result = await setProductPublished({ productId, published: next });
    setPending(false);

    if (result.ok) {
      toast.success(next ? 'Published.' : 'Unpublished — removed from the storefront.');
      router.refresh();
    } else {
      setChecked(!next);
      toast.error(result.message ?? 'Something went wrong. Please try again.');
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Published"
      disabled={pending}
      onClick={toggle}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-success' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-background transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
