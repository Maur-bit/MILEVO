'use client';

import { useQuery } from '@tanstack/react-query';
import type { DealProduct, OfferWithStore, PricePoint, ProductSummary, SearchParamsShape } from '@/types';

async function loadCatalog<T>(view: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ view, ...params });
  const response = await fetch(`/api/catalog?${query.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status})`);
  }
  const result = (await response.json()) as { data: T };
  return result.data;
}

export function useSearchProducts(params: SearchParamsShape) {
  return useQuery({
    queryKey: ['products', 'search', params],
    queryFn: () => loadCatalog<ProductSummary[]>('search', {
      q: params.q ?? '',
      category: params.category ?? '',
      sort: params.sort ?? 'relevance',
      filters: JSON.stringify(params.filters ?? {}),
    }),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['products', 'detail', slug],
    queryFn: () => loadCatalog<ProductSummary | null>('product', { slug }),
    enabled: Boolean(slug),
  });
}

export function useProductOffers(slug: string) {
  return useQuery({
    queryKey: ['products', 'offers', slug],
    queryFn: () => loadCatalog<OfferWithStore[]>('offers', { slug }),
    enabled: Boolean(slug),
  });
}

export function usePriceHistory(slug: string, days: number) {
  return useQuery({
    queryKey: ['products', 'price-history', slug, days],
    queryFn: () => loadCatalog<PricePoint[]>('history', { slug, days: String(days) }),
    enabled: Boolean(slug),
  });
}

export function useDeals() {
  return useQuery({
    queryKey: ['products', 'deals'],
    queryFn: () => loadCatalog<DealProduct[]>('deals'),
  });
}

export function useRelatedProducts(slug: string) {
  return useQuery({
    queryKey: ['products', 'related', slug],
    queryFn: () => loadCatalog<ProductSummary[]>('related', { slug }),
    enabled: Boolean(slug),
  });
}
