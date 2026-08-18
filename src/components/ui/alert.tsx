import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-[var(--radius)] border px-4 py-3 text-sm', {
  variants: {
    variant: {
      info: 'border-border bg-muted text-foreground',
      destructive: 'border-destructive/30 bg-destructive/8 text-destructive',
      success: 'border-success/30 bg-success/8 text-success',
    },
  },
  defaultVariants: { variant: 'info' },
});

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  // Errors are announced to screen readers as they appear (PRD 17.3).
  return <div role="alert" aria-live="polite" className={cn(alertVariants({ variant }), className)} {...props} />;
}
