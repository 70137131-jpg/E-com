'use client';

import { Button } from '@/components/ui/button';

/** Never expose a stack trace to a shopper (PRD 6.8, 17.5). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-h1">Something went wrong.</h1>
      <p className="max-w-[48ch] text-muted-foreground">
        The page failed to load. Trying again usually fixes it.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
