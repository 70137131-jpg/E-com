import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

/**
 * The checkout total is derived from the client-loaded cart, so without this the
 * page renders "Pay Rs 0" and an empty summary for a beat before the cart lands.
 */
export function CheckoutSkeleton() {
  return (
    <SkeletonRegion label="Loading checkout">
      <div className="mb-6 lg:hidden">
        <Skeleton className="h-11 w-full" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[60fr_40fr] lg:gap-16">
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, section) => (
            <div key={section} className="space-y-4">
              <Skeleton className="h-6 w-40" />
              {Array.from({ length: section === 1 ? 6 : 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
          ))}
          <Skeleton className="h-12 w-full" />
        </div>

        <aside className="hidden lg:block">
          <div className="space-y-4 rounded-[var(--radius)] border border-border p-5">
            <Skeleton className="h-6 w-36" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-14 w-12 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
            <div className="space-y-2 border-t border-border pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        </aside>
      </div>
    </SkeletonRegion>
  );
}
