import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A styled native select.
 *
 * Deliberately not a Radix listbox: on mobile the OS picker is faster, more
 * accessible and does not trap scroll, and the only select in this build is the
 * collection sort control.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative inline-flex">
      <select
        ref={ref}
        className={cn(
          'h-11 appearance-none rounded-[var(--radius)] border border-border bg-background',
          'pl-3 pr-9 text-sm',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
});
