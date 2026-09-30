import { formatGHS } from '@/lib/utils';
import type { FilterDef, SearchFilters } from '@/types';
import { Icon } from '@/components/ui/Icon';

export function FilterPanel({
  defs, filters, onChange,
}: { defs: FilterDef[]; filters: SearchFilters; onChange: (key: string, value: string[] | number | undefined) => void }) {
  return (
    <div className="space-y-5">
      {defs.map((def) => (
        <div key={def.key}>
          <h4 className="text-sm font-semibold mb-2">{def.label}</h4>
          {def.type === 'range' ? (
            <div className="space-y-2">
              <label className="sr-only" htmlFor="search-min-price">Minimum price (GH₵)</label>
              <input
                id="search-min-price"
                type="number"
                min="0"
                placeholder="Min price (GH₵)"
                value={filters.price_min ?? ''}
                onChange={(e) => onChange('price_min', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-sm border border-milevo-border p-2.5"
              />
              <label className="sr-only" htmlFor="search-max-price">Maximum price (GH₵)</label>
              <input
                id="search-max-price"
                type="number"
                min="0"
                placeholder="Max price (GH₵)"
                value={filters.price_max ?? ''}
                onChange={(e) => onChange('price_max', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-sm border border-milevo-border p-2.5"
              />
            </div>
          ) : (
            def.options?.map((opt) => {
              const selected = (filters[def.key] as string[] | undefined) ?? [];
              return (
                <label key={opt} className="flex items-center gap-2 py-1 text-sm min-h-[32px]">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...selected, opt] : selected.filter((v) => v !== opt);
                      onChange(def.key, next);
                    }}
                  />
                  {opt}
                </label>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}

export function FilterChips({ filters, onRemove, onClearAll }: { filters: SearchFilters; onRemove: (key: string, value: string) => void; onClearAll: () => void }) {
  const chips: { key: string; value: string; label: string }[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (!value || (Array.isArray(value) && value.length === 0)) continue;
    if (Array.isArray(value)) value.forEach((v) => chips.push({ key, value: v, label: v }));
    else chips.push({
      key,
      value: String(value),
      label: key === 'price_min' ? `From ${formatGHS(Number(value))}` : `Under ${formatGHS(Number(value))}`,
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {chips.map((c) => (
        <span key={`${c.key}-${c.value}`} className="inline-flex items-center gap-1.5 rounded-full border border-milevo-border bg-milevo-bg px-2.5 py-1.5 text-xs font-medium">
          {c.label}
          <button
            onClick={() => onRemove(c.key, c.value)}
            aria-label={`Remove ${c.label}`}
            className="flex h-6 w-6 items-center justify-center rounded-full text-milevo-muted hover:bg-milevo-border hover:text-milevo-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary"
          >
            <Icon name="close" size={14} />
          </button>
        </span>
      ))}
      <button onClick={onClearAll} className="rounded-full border border-milevo-primary px-2.5 py-1.5 text-xs font-medium text-milevo-primary">
        Clear all
      </button>
    </div>
  );
}
