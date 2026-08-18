'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatMoney } from '@/lib/money';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_METHODS,
  SHIPPING_METHOD_KEYS,
  type ShippingMethodKey,
} from '@/lib/shipping';
import { cn } from '@/lib/utils';

export function ShippingMethodPicker({
  value,
  subtotalCents,
  disabled,
  onChange,
}: {
  value: ShippingMethodKey;
  subtotalCents: number;
  disabled?: boolean;
  onChange: (next: ShippingMethodKey) => void;
}) {
  return (
    <section aria-labelledby="shipping-heading">
      <h2 id="shipping-heading" className="text-h3">
        Shipping method
      </h2>

      <RadioGroup
        className="mt-4"
        value={value}
        disabled={disabled}
        onValueChange={(next) => onChange(next as ShippingMethodKey)}
        aria-label="Shipping method"
      >
        {SHIPPING_METHOD_KEYS.map((key) => {
          const method = SHIPPING_METHODS[key];
          // Mirrors shippingCostCents() so the displayed price matches the charge.
          const free = key === 'standard' && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
          const price = free ? 0 : method.priceCents;

          return (
            <label
              key={key}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-4 py-3 transition-colors',
                value === key ? 'border-primary bg-muted/50' : 'border-border hover:border-muted-foreground',
              )}
            >
              <RadioGroupItem value={key} id={`shipping-${key}`} />
              <span className="flex-1">
                <span className="block text-sm font-medium">{method.name}</span>
                <span className="block text-sm text-muted-foreground">{method.estimate}</span>
              </span>
              <span className="tabular text-sm font-medium">
                {price === 0 ? 'Free' : formatMoney(price)}
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </section>
  );
}
