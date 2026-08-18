import { Skeleton } from '@/components/ui/skeleton';

export default function ProductLoading() {
  return (
    <div className="container-page pb-16">
      <Skeleton className="my-4 h-5 w-64" />
      <div className="grid gap-8 lg:grid-cols-[55fr_45fr] lg:gap-12">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-20 w-20" />
            <Skeleton className="h-20 w-20" />
            <Skeleton className="h-20 w-20" />
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-11 w-56" />
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
