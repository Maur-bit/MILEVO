import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getDeals,
  getPriceHistory,
  getProduct,
  getProductOffers,
  getRelatedProducts,
  searchProducts,
} from '@/services/products';
import { captureError } from '@/lib/monitoring';
import { checkRateLimit } from '@/lib/rate-limit';
import type { SearchFilters } from '@/types';

export const dynamic = 'force-dynamic';

const sortSchema = z.enum(['relevance', 'price_low', 'price_high', 'rating', 'reviews']);
const filtersSchema = z.record(z.union([z.array(z.string()), z.number()]));

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(request, 'catalog', 120, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many catalog requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }
  const params = request.nextUrl.searchParams;
  const view = params.get('view');

  try {
    let data: unknown;

    switch (view) {
      case 'search': {
        const sort = sortSchema.safeParse(params.get('sort') ?? 'relevance');
        if (!sort.success) {
          return NextResponse.json({ error: 'Invalid sort option.' }, { status: 400 });
        }

        let filters: SearchFilters = {};
        const filtersParam = params.get('filters');
        if (filtersParam) {
          let parsedFilters: unknown;
          try {
            parsedFilters = JSON.parse(filtersParam);
          } catch {
            return NextResponse.json({ error: 'Invalid filters.' }, { status: 400 });
          }
          const result = filtersSchema.safeParse(parsedFilters);
          if (!result.success) {
            return NextResponse.json({ error: 'Invalid filters.' }, { status: 400 });
          }
          filters = result.data;
        }

        data = await searchProducts({
          q: params.get('q') ?? '',
          category: params.get('category') || undefined,
          filters,
          sort: sort.data,
        });
        break;
      }
      case 'product':
        data = await getProduct(requiredSlug(params.get('slug')));
        break;
      case 'offers':
        data = await getProductOffers(requiredSlug(params.get('slug')));
        break;
      case 'history': {
        const days = z.coerce.number().int().min(1).max(365).safeParse(params.get('days') ?? 90);
        if (!days.success) {
          return NextResponse.json({ error: 'Invalid history range.' }, { status: 400 });
        }
        data = await getPriceHistory(requiredSlug(params.get('slug')), days.data);
        break;
      }
      case 'deals':
        data = await getDeals();
        break;
      case 'related':
        data = await getRelatedProducts(requiredSlug(params.get('slug')));
        break;
      default:
        return NextResponse.json({ error: 'Unknown catalog view.' }, { status: 400 });
    }

    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof CatalogInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    captureError(error, { route: '/api/catalog', view });
    return NextResponse.json({ error: 'Unable to load catalog data.' }, { status: 500 });
  }
}

function requiredSlug(slug: string | null): string {
  const result = z.string().min(1).max(200).safeParse(slug);
  if (!result.success) throw new CatalogInputError('A valid product slug is required.');
  return result.data;
}

class CatalogInputError extends Error {}
