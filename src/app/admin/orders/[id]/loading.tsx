import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

export default function AdminOrderDetailLoading() {
  return (
    <SkeletonRegion label="Loading order" className="container-page section">
      <Skeleton className="h-5 w-28" />

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="mt-6 rounded-[var(--radius)] border border-border bg-background p-5">
        <div className="flex gap-3">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-[var(--radius)] border border-border bg-background p-5">
          <Skeleton className="h-6 w-24" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>

        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius)] border border-border bg-background p-5">
              <Skeleton className="h-6 w-32" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
