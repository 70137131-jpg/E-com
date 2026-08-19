import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

export default function AdminOrdersLoading() {
  return (
    <SkeletonRegion label="Loading orders" className="container-page section">
      <Skeleton className="h-9 w-36" />

      <div className="mt-6 flex gap-3 border-b border-border pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>

      <div className="mt-6 space-y-2 rounded-[var(--radius)] border border-border bg-background p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </SkeletonRegion>
  );
}
