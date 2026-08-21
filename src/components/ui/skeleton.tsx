import { cn } from '@/lib/utils';

/**
 * Loading placeholder. The `.skeleton` utility in globals.css carries the
 * left-slanted highlight that sweeps across while content loads.
 *
 * Skeletons are decorative: they are hidden from assistive technology, and the
 * region they sit in should carry aria-busy so screen readers hear "loading"
 * once rather than a wall of empty boxes.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton rounded-[var(--radius)]', className)}
      {...props}
    />
  );
}

/**
 * Wrapper for a loading region. Announces the wait to screen readers, which the
 * individual skeleton blocks deliberately do not.
 */
export function SkeletonRegion({
  label = 'Loading',
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
