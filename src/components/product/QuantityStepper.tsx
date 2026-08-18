'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuantityStepper({
  value,
  onChange,
  max,
  min = 1,
  disabled,
  label = 'Quantity',
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  max: number;
  min?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;

  return (
    <div
      className={cn('inline-flex items-center rounded-[var(--radius)] border border-border', className)}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="tap-target inline-flex items-center justify-center rounded-l-[var(--radius)] text-foreground disabled:opacity-35"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <output
        aria-live="polite"
        aria-label={label}
        className="tabular w-10 text-center text-sm font-medium"
      >
        {value}
      </output>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={`Increase ${label.toLowerCase()}`}
        className="tap-target inline-flex items-center justify-center rounded-r-[var(--radius)] text-foreground disabled:opacity-35"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
