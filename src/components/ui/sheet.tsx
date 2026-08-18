'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Side sheet used for the cart drawer and the mobile nav.
 *
 * Radix Dialog gives focus trapping and Escape-to-close for free, which PRD
 * 17.3 requires of the cart drawer.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'right' | 'left';
    title: string;
    description?: string;
  }
>(function SheetContent({ className, children, side = 'right', title, description, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-y-0 z-50 flex h-full w-full flex-col bg-background shadow-xl sm:max-w-md',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          'border-border',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <DialogPrimitive.Title className="text-h3 font-medium">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="tap-target -mr-2 inline-flex items-center justify-center rounded-[var(--radius)] hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        <DialogPrimitive.Description className="sr-only">
          {description ?? title}
        </DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
