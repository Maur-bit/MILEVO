'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/product/ProductCard';
import { FilterPanel, FilterChips } from '@/components/search/FilterPanel';
import { SortDropdown, Pagination } from '@/components/search/SortDropdown';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/shared/States';
import { Button } from '@/components/ui/Button';
import { CATEGORIES, FILTERS_BY_CATEGORY } from '@/data/seedData';
import { track } from '@/lib/analytics';
import type { SearchFilters, SortOption } from '@/types';
import { Skeleton } from '@/components/shared/States';
import { Icon } from '@/components/ui/Icon';
import { captureError } from '@/lib/monitoring';
import { createClient } from '@/lib/supabase/client';
import { isAuthSessionMissingError } from '@/lib/auth-error';

const PAGE_SIZE = 8;
const RECENT_SEARCHES_LIMIT = 8;

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function closestRecentSearch(query: string, searches: string[]): string | null {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length < 5) return null;
  const closest = searches
    .filter((search) => search.toLocaleLowerCase() !== normalized)
    .map((search) => ({ search, distance: editDistance(normalized, search.toLocaleLowerCase()) }))
    .sort((left, right) => left.distance - right.distance)[0];
  return closest && closest.distance <= Math.min(3, Math.floor(normalized.length / 3))
    ? closest.search
    : null;
}

export function SearchClient({
  initialQuery,
  initialCategory,
  initialFilters,
  initialSort,
  initialPage,
}: {
  initialQuery: string;
  initialCategory: string | null;
  initialFilters: SearchFilters;
  initialSort: SortOption;
  initialPage: number;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [recentSearchKey, setRecentSearchKey] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data, isLoading, isFetching, isError, refetch } = useSearchProducts({
    q: initialQuery,
    category: initialCategory ?? undefined,
    filters,
    sort,
  });
  const results = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    setFilters(initialFilters);
    setSort(initialSort);
    setPage(initialPage);
    setDraftQuery(initialQuery);
  }, [initialCategory, initialFilters, initialPage, initialQuery, initialSort]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const configured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    const loadRecentSearches = (key: string) => {
      if (cancelled) return;
      setRecentSearchKey(key);
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        setRecentSearches(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, RECENT_SEARCHES_LIMIT) : []);
      } catch (error) {
        captureError(error, { area: 'recent-searches' });
        setRecentSearches([]);
      }
    };

    if (!configured) {
      loadRecentSearches('milevo_recent_searches:anonymous');
    } else {
      try {
        createClient().auth.getUser().then(({ data: auth, error }) => {
          if (error && !isAuthSessionMissingError(error)) {
            captureError(error, { area: 'recent-searches-auth' });
            return;
          }
          loadRecentSearches(`milevo_recent_searches:${auth.user?.id ?? 'anonymous'}`);
        }).catch((error: unknown) => captureError(error, { area: 'recent-searches-auth' }));
      } catch (error) {
        captureError(error, { area: 'recent-searches-auth' });
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = initialQuery.trim();
    if (!query || isLoading || isError || !data || !recentSearchKey) return;
    let previous: string[] = [];
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(recentSearchKey) ?? '[]');
      if (Array.isArray(stored)) previous = stored.filter((item): item is string => typeof item === 'string');
    } catch (error) {
      captureError(error, { area: 'recent-searches-storage' });
    }
    const next = [query, ...previous.filter((item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase())].slice(0, RECENT_SEARCHES_LIMIT);
    setRecentSearches(next);
    try {
      localStorage.setItem(recentSearchKey, JSON.stringify(next));
    } catch (error) {
      captureError(error, { area: 'recent-searches-storage' });
    }
  }, [data, initialQuery, isError, isLoading, recentSearchKey]);

  const filterDefs = useMemo(() => {
    if (initialCategory) return FILTERS_BY_CATEGORY[initialCategory] ?? [];
    const cats = new Set(results.map((p) => p.category));
    const merged: Record<string, (typeof FILTERS_BY_CATEGORY)[string][number]> = {};
    cats.forEach((c) => (FILTERS_BY_CATEGORY[c] || []).forEach((f) => { merged[f.key] = merged[f.key] || f; }));
    return Object.values(merged);
  }, [initialCategory, results]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Object.values(filters).some((value) => Array.isArray(value) ? value.length > 0 : typeof value === 'number' && value > 0);
  const correction = closestRecentSearch(initialQuery, recentSearches);

  const updateUrl = (nextFilters: SearchFilters, nextSort: SortOption, nextPage: number) => {
    const params = new URLSearchParams();
    if (initialQuery.trim()) params.set('q', initialQuery.trim());
    if (initialCategory) params.set('category', initialCategory);
    const activeFilters = Object.fromEntries(
      Object.entries(nextFilters).filter(([, value]) =>
        typeof value === 'number' ? value >= 0 : Array.isArray(value) && value.length > 0,
      ),
    );
    if (Object.keys(activeFilters).length) params.set('filters', JSON.stringify(activeFilters));
    if (nextSort !== 'relevance') params.set('sort', nextSort);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    router.replace(query ? `/search?${query}` : '/search', { scroll: false });
  };

  const handleFilterChange = (key: string, value: string[] | number | undefined) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    updateUrl(next, sort, 1);
  };

  const handleSortChange = (value: SortOption) => {
    setSort(value);
    setPage(1);
    setSortSheetOpen(false);
    updateUrl(filters, value, 1);
  };

  const handlePageChange = (value: number) => {
    setPage(value);
    updateUrl(filters, sort, value);
  };

  const searchFor = (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (initialCategory) params.set('category', initialCategory);
    const search = params.toString();
    track({ name: 'search_performed' });
    router.push(search ? `/search?${search}` : '/search');
  };

  return (
    <div>
      <div className="border-b border-milevo-border px-4 py-4">
        <h1 className="font-display text-xl">{initialQuery ? `Results for "${initialQuery}"` : 'All products'}</h1>
        <form
          role="search"
          className="mt-3 flex max-w-2xl gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            searchFor(draftQuery);
          }}
        >
          <label className="sr-only" htmlFor="search-page-query">Search products</label>
          <input
            id="search-page-query"
            type="search"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Search products, brands, or models"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-milevo-border bg-transparent px-3"
          />
          <Button type="submit" disabled={!draftQuery.trim()}>Search</Button>
        </form>
      </div>

      <div className="sticky top-0 z-10 flex gap-2 border-b border-milevo-border bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setFilterSheetOpen(true)}
          className={`min-h-touch flex-1 rounded-md border font-semibold text-sm ${hasActiveFilters ? 'border-milevo-primary text-milevo-primary' : 'border-milevo-border'}`}
        >
          <Icon name="filter" size={16} className="mr-1 inline-block align-text-bottom" /> Filters
        </button>
        <button onClick={() => setSortSheetOpen(true)} className="min-h-touch flex-1 rounded-md border border-milevo-border font-semibold text-sm">
          <Icon name="arrow-down-up" size={16} className="mr-1 inline-block align-text-bottom" /> Sort
        </button>
      </div>

      <FilterChips
        filters={filters}
        onRemove={(key, value) => {
          if (key === 'price_max' || key === 'price_min') handleFilterChange(key, undefined);
          else handleFilterChange(key, ((filters[key] as string[]) || []).filter((v) => v !== value));
        }}
        onClearAll={() => { setFilters({}); setPage(1); }}
      />

      <div className="md:grid md:grid-cols-[260px_1fr] md:gap-8 md:px-6 md:py-6 px-4 py-4">
        <aside className="hidden md:block">
          <FilterPanel defs={filterDefs} filters={filters} onChange={handleFilterChange} />
        </aside>
        <div>
          <div className="mb-3 text-sm text-milevo-muted" aria-live="polite">
            {!isFetching && !isError && `${results.length} result${results.length === 1 ? '' : 's'}`}
          </div>
          {isError ? (
            <div role="alert" className="rounded-md border border-milevo-border p-4 text-center">
              <p className="mb-3 text-sm text-red-600">
                {isOnline ? 'Couldn’t load search results. Check your connection and try again.' : 'You’re offline. Reconnect and try your search again.'}
              </p>
              <Button variant="secondary" onClick={() => void refetch()}>Try again</Button>
            </div>
          ) : isLoading || isFetching ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">Searching products…</span>
              {Array.from({ length: PAGE_SIZE }, (_, index) => (
                <div key={index} className="rounded-md border border-milevo-border p-3">
                  <Skeleton className="mb-2 aspect-square" />
                  <Skeleton className="mb-2 h-3 w-1/3" />
                  <Skeleton className="mb-3 h-4 w-4/5" />
                  <Skeleton className="mb-2 h-6 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              title={initialQuery ? `No products found for "${initialQuery}".` : 'No products found.'}
              description="Try a different spelling, use a model number, or browse one of these categories."
              action={
                <div className="space-y-4">
                  {recentSearches.length > 0 && (
                    <div>
                      {correction && (
                        <p className="mb-3 text-sm text-milevo-text">
                          Did you mean{' '}
                          <button type="button" onClick={() => searchFor(correction)} className="font-semibold text-milevo-primary underline">
                            {correction}
                          </button>
                          ?
                        </p>
                      )}
                      <p className="mb-2 text-sm font-semibold text-milevo-text">Recent searches on this device</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {recentSearches.map((query) => (
                          <button key={query} type="button" onClick={() => searchFor(query)} className="rounded-full border border-milevo-border px-3 py-1.5 text-sm hover:border-milevo-primary">
                            {query}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRecentSearches([]);
                          if (recentSearchKey) {
                            try {
                              localStorage.removeItem(recentSearchKey);
                            } catch (error) {
                              captureError(error, { area: 'recent-searches-storage' });
                            }
                          }
                        }}
                        className="mt-2 text-xs font-semibold text-milevo-primary underline"
                      >
                        Clear recent searches
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {CATEGORIES.map((category) => (
                      <Link key={category.slug} href={`/search?category=${encodeURIComponent(category.slug)}`} className="rounded-full border border-milevo-border px-3 py-1.5 text-sm hover:border-milevo-primary">
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {pageResults.map((p) => <ProductCard key={p.slug} product={p} />)}
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
            </>
          )}
        </div>
      </div>

      <BottomSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filters"
        footer={<Button className="w-full" onClick={() => { setFilterSheetOpen(false); track({ name: 'search_filters_applied', resultCount: results.length }); }}>Show results</Button>}
      >
        <FilterPanel defs={filterDefs} filters={filters} onChange={handleFilterChange} />
      </BottomSheet>

      <BottomSheet open={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="Sort by">
        <SortDropdown value={sort} onChange={handleSortChange} />
      </BottomSheet>
    </div>
  );
}
