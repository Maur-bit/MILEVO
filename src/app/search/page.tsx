import type { Metadata } from 'next';
import { SearchClient } from './SearchClient';
import { z } from 'zod';
import type { SearchFilters, SortOption } from '@/types';

export const metadata: Metadata = { title: 'Search' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const filtersSchema = z.record(z.union([z.array(z.string()), z.number().finite().nonnegative()]));
const sortOptions = ['relevance', 'price_low', 'price_high', 'rating', 'reviews'] as const;
const sortSchema = z.enum(sortOptions);

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const value = (key: string) => {
    const parameter = params[key];
    return Array.isArray(parameter) ? parameter[0] : parameter;
  };
  const serializedFilters = value('filters');
  let initialFilters: SearchFilters = {};
  if (serializedFilters) {
    try {
      const parsed = filtersSchema.safeParse(JSON.parse(serializedFilters));
      if (parsed.success) initialFilters = parsed.data;
    } catch {
      initialFilters = {};
    }
  }
  const sort = sortSchema.safeParse(value('sort'));
  const parsedPage = z.coerce.number().int().min(1).max(100).safeParse(value('page'));

  return (
    <SearchClient
      initialQuery={value('q') ?? ''}
      initialCategory={value('category') ?? null}
      initialFilters={initialFilters}
      initialSort={sort.success ? sort.data : 'relevance'}
      initialPage={parsedPage.success ? parsedPage.data : 1}
    />
  );
}
