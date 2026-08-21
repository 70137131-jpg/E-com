import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Mirrors CartContents' shape so nothing jumps when the real cart lands. */
export function CartSkeleton({ variant }: { variant: 'drawer' | 'page' }) {
  return (
    <SkeletonRegion
      label="Loading your cart"
      className={cn(variant === 'drawer' && 'flex min-h-0 flex-1 flex-col')}
    >
      <ul className={cn('space-y-5', variant === 'drawer' ? 'px-4 py-4' : 'py-2')}>
        {Array.from({ length: 2 }).map((_, i) => (
          <li key={i} className="flex gap-3">
            <Skeleton className="h-20 w-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-9 w-28" />
            </div>
            <Skeleton className="h-4 w-14 shrink-0" />
          </li>
        ))}
      </ul>

      <div
        className={cn(
          'space-y-3',
          variant === 'drawer'
            ? 'border-t border-border px-4 py-4'
            : 'mt-6 border-t border-border pt-6',
        )}
      >
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 w-full" />
      </div>
    </SkeletonRegion>
  );
}
