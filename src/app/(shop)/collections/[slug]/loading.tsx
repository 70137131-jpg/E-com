import { Skeleton } from '@/components/ui/skeleton';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';

export default function CollectionLoading() {
  return (
    <div className="container-page pb-16">
      <Skeleton className="my-4 h-5 w-48" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <div className="my-6 flex items-center justify-between border-y border-border py-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-11 w-44" />
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
