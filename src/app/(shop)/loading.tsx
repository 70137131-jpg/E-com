import { Skeleton } from '@/components/ui/skeleton';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';

export default function HomeLoading() {
  return (
    <>
      <Skeleton className="h-[50vh] min-h-[340px] w-full rounded-none lg:h-[60vh]" />
      <div className="container-page section">
        <Skeleton className="h-7 w-32" />
        <div className="mt-6">
          <ProductGridSkeleton />
        </div>
      </div>
    </>
  );
}
