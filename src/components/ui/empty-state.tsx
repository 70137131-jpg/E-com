import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-16 text-center', className)}>
      <p className="text-muted-foreground">{title}</p>
      {action ? (
        <Link href={action.href} className={buttonVariants({ variant: 'outline' })}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
