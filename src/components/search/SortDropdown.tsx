import { cn } from '@/lib/utils';
import type { SortOption } from '@/types';
import { Icon } from '@/components/ui/Icon';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_low', label: 'Lowest price' },
  { value: 'price_high', label: 'Highest price' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'rating', label: 'Highest rated' },
];

export function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <div>
      {SORT_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="flex w-full items-center justify-between border-b border-milevo-border py-3 text-base min-h-touch"
        >
          <span>{o.label}</span>
          <span className={cn('h-[18px] w-[18px] rounded-full border-2 border-milevo-border', value === o.value && 'border-milevo-primary bg-milevo-primary/30')} />
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex justify-center gap-2 py-5" aria-label="Pagination">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className="min-h-touch min-w-touch rounded-sm border border-milevo-border disabled:opacity-40"><Icon name="chevron-left" /></button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn('min-h-touch min-w-touch rounded-sm border font-semibold', p === page ? 'border-milevo-text bg-milevo-text text-white' : 'border-milevo-border')}
        >
          {p}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page" className="min-h-touch min-w-touch rounded-sm border border-milevo-border disabled:opacity-40"><Icon name="chevron-right" /></button>
    </nav>
  );
}
