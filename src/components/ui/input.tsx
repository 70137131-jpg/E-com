import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-[var(--radius)] border border-border bg-background px-3 text-base',
          'placeholder:text-muted-foreground',
          'aria-[invalid=true]:border-destructive',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
          className,
        )}
        {...props}
      />
    );
  },
);
