'use client';

import { COLOURS } from '@/lib/db/catalog-data';
import type { Variant } from '@/lib/commerce/types';
import { cn } from '@/lib/utils';

export type Selection = Record<string, string | undefined>;

/** Distinct values for an option type, in the order the variants declare them. */
export function optionValues(variants: Variant[], type: string): string[] {
  const seen: string[] = [];
  for (const v of variants) {
    const value = v.optionValues[type];
    if (value && !seen.includes(value)) seen.push(value);
  }
  return seen;
}

/**
 * A value is offered when some in-stock variant carries it and agrees with every
 * other option the shopper has already chosen. Anything else is shown but
 * struck through, so the shopper can see what exists and what has run out.
 */
function isAvailable(
  variants: Variant[],
  selection: Selection,
  type: string,
  value: string,
): boolean {
  return variants.some((v) => {
    if (v.optionValues[type] !== value) return false;
    if (v.stock <= 0) return false;
    return Object.entries(selection).every(
      ([key, chosen]) => key === type || !chosen || v.optionValues[key] === chosen,
    );
  });
}

export function findVariant(
  variants: Variant[],
  optionTypes: string[],
  selection: Selection,
): Variant | null {
  if (optionTypes.some((t) => !selection[t])) return null;
  return (
    variants.find((v) => optionTypes.every((t) => v.optionValues[t] === selection[t])) ?? null
  );
}

export function VariantPicker({
  variants,
  optionTypes,
  selection,
  onSelect,
}: {
  variants: Variant[];
  optionTypes: string[];
  selection: Selection;
  onSelect: (type: string, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {optionTypes.map((type) => {
        const values = optionValues(variants, type);
        const isColour = type.toLowerCase() === 'colour' || type.toLowerCase() === 'color';

        return (
          <fieldset key={type}>
            <legend className="mb-2 text-sm font-medium">
              {type}
              {selection[type] ? (
                <span className="ml-2 font-normal text-muted-foreground">{selection[type]}</span>
              ) : null}
            </legend>

            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const available = isAvailable(variants, selection, type, value);
                const selected = selection[type] === value;
                const swatch = isColour ? COLOURS[value] : undefined;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSelect(type, value)}
                    aria-pressed={selected}
                    aria-label={available ? value : `${value} — unavailable`}
                    className={cn(
                      'tap-target relative rounded-[var(--radius)] border px-4 text-sm transition-colors',
                      isColour && 'flex items-center gap-2 pl-3',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-muted-foreground',
                      !available && 'text-muted-foreground line-through opacity-60',
                    )}
                  >
                    {swatch ? (
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 rounded-full border border-black/15"
                        style={{ backgroundColor: swatch.hex }}
                      />
                    ) : null}
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
