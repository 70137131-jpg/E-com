'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = React.useState(0);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius)] border border-border bg-muted">
        <Image
          src={images[active] ?? images[0]}
          alt={title}
          fill
          sizes="(min-width: 1024px) 55vw, 100vw"
          // The LCP element on this route (PRD 17.1).
          priority
          className="object-cover"
        />
      </div>

      {/* A single-image product hides the strip entirely (PRD 6.3). */}
      {images.length > 1 ? (
        <ul className="flex gap-3 overflow-x-auto pb-1" aria-label={`${title} images`}>
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={cn(
                  'relative block h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius)] border transition-colors',
                  i === active ? 'border-primary' : 'border-border hover:border-muted-foreground',
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
