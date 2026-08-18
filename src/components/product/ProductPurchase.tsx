'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/commerce/types';
import { formatMoney, savingsPercent } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { AddToCartButton } from './AddToCartButton';
import { QuantityStepper } from './QuantityStepper';
import { findVariant, VariantPicker, type Selection } from './VariantPicker';

/** PRD 8.4 - stock copy, exact strings. */
function stockLabel(stock: number): { text: string; tone: 'success' | 'accent' | 'muted' } {
  if (stock <= 0) return { text: 'Out of stock', tone: 'muted' };
  if (stock <= 3) return { text: `Only ${stock} left`, tone: 'accent' };
  return { text: 'In stock', tone: 'success' };
}

export function ProductPurchase({ product }: { product: Product }) {
  const [selection, setSelection] = React.useState<Selection>(() => {
    // A one-size product has nothing to choose, so pre-select it.
    if (product.optionTypes.length === 0) return {};
    return {};
  });
  const [quantity, setQuantity] = React.useState(1);

  const variant =
    product.optionTypes.length === 0
      ? (product.variants[0] ?? null)
      : findVariant(product.variants, product.optionTypes, selection);

  const hasSelection = product.optionTypes.every((t) => Boolean(selection[t]));

  // Never carry a quantity above what the newly chosen variant can supply.
  React.useEffect(() => {
    if (variant && quantity > variant.stock) setQuantity(Math.max(1, variant.stock));
  }, [variant, quantity]);

  function select(type: string, value: string) {
    setSelection((prev) => ({ ...prev, [type]: prev[type] === value ? undefined : value }));
  }

  const price = variant?.priceCents ?? product.minPriceCents;
  const compareAt = variant ? variant.compareAtCents : product.compareAtCents;
  const saving = compareAt && compareAt > price ? savingsPercent(price, compareAt) : 0;
  const stock = variant ? stockLabel(variant.stock) : null;

  return (
    <div className="space-y-6">
      <div className="tabular flex flex-wrap items-baseline gap-3">
        {compareAt && compareAt > price ? (
          <span className="text-price text-muted-foreground line-through">
            {formatMoney(compareAt)}
          </span>
        ) : null}
        <span className="text-price font-medium">{formatMoney(price)}</span>
        {saving > 0 ? (
          <Badge variant="accent" className="bg-accent text-accent-foreground">
            Save {saving}%
          </Badge>
        ) : null}
      </div>

      {product.optionTypes.length > 0 ? (
        <VariantPicker
          variants={product.variants}
          optionTypes={product.optionTypes}
          selection={selection}
          onSelect={select}
        />
      ) : null}

      {/* Hidden until a variant is chosen (PRD 6.3 states). */}
      <div aria-live="polite" className="min-h-6">
        {stock ? (
          <p
            className={
              stock.tone === 'success'
                ? 'text-sm text-success'
                : stock.tone === 'accent'
                  ? 'text-sm font-medium text-accent'
                  : 'text-sm text-muted-foreground'
            }
          >
            {stock.text}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={Math.max(variant?.stock ?? 1, 1)}
          disabled={!variant || variant.stock <= 0}
        />
        <span className="text-sm text-muted-foreground">
          {variant ? `SKU ${variant.sku}` : 'Select options to see availability'}
        </span>
      </div>

      <AddToCartButton variant={variant} quantity={quantity} hasSelection={hasSelection} />

      <p className="text-sm text-muted-foreground">
        Free standard delivery over Rs 5,000.{' '}
        <Link href="/shipping-returns" className="underline underline-offset-2 hover:text-foreground">
          Shipping &amp; Returns
        </Link>
      </p>
    </div>
  );
}
