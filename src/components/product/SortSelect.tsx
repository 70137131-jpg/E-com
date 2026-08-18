'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { SORT_OPTIONS, type SortKey } from '@/lib/commerce/types';

/**
 * Sort lives in the URL so the state is shareable and survives reload (PRD 6.2).
 * `router.replace` with scroll disabled re-renders the server component without
 * a full page load.
 */
export function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'featured') params.delete('sort');
    else params.set('sort', next);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="whitespace-nowrap">Sort</span>
      <Select value={value} onChange={(e) => change(e.target.value)}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
