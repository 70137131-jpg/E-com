import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

export default function AdminProductsLoading() {
  return (
    <SkeletonRegion label="Loading products" className="container-page section">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />

      <div className="mt-6 rounded-[var(--radius)] border border-border bg-background p-4">
        <Skeleton className="h-8 w-full" />
        <div className="mt-3 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
