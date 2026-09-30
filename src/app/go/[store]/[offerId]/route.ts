import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProductOffers } from '@/services/products';
import { STORES } from '@/data/seedData';
import { createClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { captureError } from '@/lib/monitoring';
import { logPostHogInfo, logPostHogWarn } from '@/lib/posthog-logs';
import { checkRateLimit } from '@/lib/rate-limit';

const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ store: string; offerId: string }> },
) {
  const rate = checkRateLimit(request, 'affiliate-redirect', 90, 60_000);
  if (!rate.allowed) {
    return new NextResponse('Too many redirects. Please try again shortly.', {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfterSeconds) },
    });
  }
  const { store: storeSlug, offerId } = await params;
  const sourcePage = request.nextUrl.searchParams.get('src') ?? undefined;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('id, product_url, store_id, product_variants(product_id)')
        .eq('id', offerId)
        .maybeSingle();

      if (offerError) throw new Error(`Unable to look up affiliate offer: ${offerError.message}`);
      if (!offer) return new NextResponse('Offer not found', { status: 404 });

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('slug')
        .eq('id', offer.store_id)
        .maybeSingle();
      if (storeError) throw new Error(`Unable to look up offer store: ${storeError.message}`);
      if (!store || store.slug !== storeSlug) return new NextResponse('Offer not found', { status: 404 });

      const serviceClient = hasServiceRoleKey ? createServiceRoleClient() : null;
      let program: { base_tracking_url: string; param_template: unknown } | null = null;
      if (serviceClient) {
        const { data, error: programError } = await serviceClient
          .from('affiliate_programs')
          .select('base_tracking_url, param_template')
          .eq('store_id', offer.store_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (programError) throw new Error(`Unable to look up affiliate program: ${programError.message}`);
        program = data;
      }

      const clickId = crypto.randomUUID();
      const destination = program
        ? buildTrackingUrl(program.base_tracking_url, program.param_template, {
            click_id: clickId,
            offer_id: offerId,
          })
        : offer.product_url;
      const safeDestination = new URL(destination);
      if (safeDestination.protocol !== 'https:' && safeDestination.protocol !== 'http:') {
        throw new Error('The offer destination must use HTTP or HTTPS.');
      }

      if (serviceClient) {
        const variantRelation = offer.product_variants as
          | { product_id: string }
          | { product_id: string }[]
          | null;
        const variant = Array.isArray(variantRelation) ? variantRelation[0] : variantRelation;
        if (!variant?.product_id) throw new Error('The affiliate offer is missing its product relation.');

        const { error: clickError } = await serviceClient.from('affiliate_clicks').insert({
          offer_id: offer.id,
          product_id: variant.product_id,
          store_id: offer.store_id,
          source_page: sourcePage,
          device_type: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
          click_id: clickId,
        });
        if (clickError) {
          captureError(clickError, { storeSlug, offerId, operation: 'affiliate_click_insert' });
          if (request.cookies.get('milevo-analytics-consent')?.value === 'yes') {
            await logPostHogWarn('affiliate_click_tracking_failed', { store_slug: storeSlug });
          }
        }
      }

      if (request.cookies.get('milevo-analytics-consent')?.value === 'yes') {
        await logPostHogInfo('affiliate_redirect_resolved', {
          redirect_mode: 'configured',
          store_slug: storeSlug,
        });
      }
      return NextResponse.redirect(safeDestination, { status: 302 });
    } catch (error) {
      captureError(error, { storeSlug, offerId });
      return new NextResponse('Unable to resolve this offer right now.', { status: 500 });
    }
  }

  const store = STORES[storeSlug];
  if (!store) return new NextResponse('Store not found', { status: 404 });
  const demoOfferPattern = /^demo-(.+)-(\d+)$/;
  const match = demoOfferPattern.exec(offerId);
  if (match) {
    const [, slug] = match;
    const offers = await getProductOffers(slug);
    if (offers.some((offer) => offer.offerId === offerId && offer.store === storeSlug)) {
      if (request.cookies.get('milevo-analytics-consent')?.value === 'yes') {
        await logPostHogInfo('affiliate_redirect_resolved', {
          redirect_mode: 'demo',
          store_slug: storeSlug,
        });
      }
    }
  }
  return NextResponse.redirect(store.website, { status: 302 });
}

function buildTrackingUrl(
  baseUrl: string,
  template: unknown,
  context: Record<string, string>,
) {
  const parameters = z.record(z.string()).safeParse(template);
  if (!parameters.success) throw new Error('Affiliate URL parameters must be string values.');

  const url = new URL(baseUrl);
  for (const [param, valueTemplate] of Object.entries(parameters.data)) {
    const value = valueTemplate.replace(/\{(\w+)\}/g, (_, key: string) => context[key] ?? '');
    url.searchParams.set(param, value);
  }
  return url.toString();
}
