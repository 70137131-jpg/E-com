import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-h1">We couldn&apos;t find that page.</h1>
      <p className="max-w-[48ch] text-muted-foreground">
        The link may be out of date, or the piece may have sold out and been retired.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants()}>
          Back to home
        </Link>
        <Link href="/collections/everyday" className={buttonVariants({ variant: 'outline' })}>
          Shop everyday
        </Link>
      </div>
    </div>
  );
}
