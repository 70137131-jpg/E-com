import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

/** Mirrors the dashboard's three stat cards, orders table and low-stock list. */
export default function AdminDashboardLoading() {
  return (
    <SkeletonRegion label="Loading dashboard" className="container-page section">
      <Skeleton className="h-9 w-48" />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-border bg-background p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-[var(--radius)] border border-border bg-background p-5">
          <Skeleton className="h-6 w-36" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-background p-5">
          <Skeleton className="h-6 w-28" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
