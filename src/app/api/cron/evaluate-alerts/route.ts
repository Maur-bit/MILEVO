import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { captureError } from '@/lib/monitoring';
import type { OfferAvailability } from '@/types';
import { selectFreshAlertOffer, shouldTriggerPriceAlert } from '@/lib/alert-evaluation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FRESH_FOR_MS = 48 * 60 * 60 * 1000;

type OfferRow = { id: string; current_price: number | string; availability: OfferAvailability | null; in_stock: boolean; last_checked_at: string };
type AlertRow = {
  id: string;
  user_id: string;
  target_price: number | string;
  product_variant_id: string;
  product_variants: { offers: OfferRow[] | null } | { offers: OfferRow[] | null }[] | null;
};

function related<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('price_alerts')
      .select('id, user_id, target_price, product_variant_id, product_variants(offers(id, current_price, in_stock, availability, last_checked_at))')
      .eq('status', 'active')
      .limit(500);
    if (error) throw new Error(`Unable to load active price alerts: ${error.message}`);

    let triggered = 0;
    let unavailable = 0;
    let stale = 0;
    let unknownAvailability = 0;
    const evaluatedAt = new Date().toISOString();
    for (const alert of (data ?? []) as unknown as AlertRow[]) {
      const offers = related(alert.product_variants)?.offers ?? [];
      const selection = selectFreshAlertOffer(offers.map((offer) => ({
        id: offer.id,
        currentPrice: Number(offer.current_price),
        lastCheckedAt: offer.last_checked_at,
        availability: offer.availability,
      })));
      if (selection.status === 'unknown') {
        const { error: updateError } = await supabase.from('price_alerts')
          .update({ last_evaluated_at: evaluatedAt })
          .eq('id', alert.id).eq('status', 'active');
        if (updateError) throw new Error(`Unable to record unknown-availability alert evaluation: ${updateError.message}`);
        unknownAvailability += 1;
        continue;
      }
      if (selection.status === 'unavailable') {
        const { error: updateError } = await supabase.from('price_alerts')
          .update({ status: 'unavailable', is_active: false, last_evaluated_at: evaluatedAt })
          .eq('id', alert.id).eq('status', 'active');
        if (updateError) throw new Error(`Unable to mark an unavailable alert: ${updateError.message}`);
        unavailable += 1;
        continue;
      }
      if (selection.status === 'stale') {
        const { error: updateError } = await supabase.from('price_alerts')
          .update({ last_evaluated_at: evaluatedAt })
          .eq('id', alert.id).eq('status', 'active');
        if (updateError) throw new Error(`Unable to record stale alert evaluation: ${updateError.message}`);
        stale += 1;
        continue;
      }

      const best = selection.offer;
      if (!shouldTriggerPriceAlert('active', best.currentPrice, Number(alert.target_price))) {
        const { error: updateError } = await supabase.from('price_alerts')
          .update({ last_evaluated_at: evaluatedAt })
          .eq('id', alert.id).eq('status', 'active');
        if (updateError) throw new Error(`Unable to record alert evaluation: ${updateError.message}`);
        continue;
      }

      const { data: changed, error: updateError } = await supabase.from('price_alerts')
        .update({
          status: 'triggered',
          is_active: false,
          triggered_at: evaluatedAt,
          triggered_offer_id: best.id,
          triggered_price: best.currentPrice,
          last_evaluated_at: evaluatedAt,
        })
        .eq('id', alert.id).eq('status', 'active')
        .select('id')
        .maybeSingle();
      if (updateError) throw new Error(`Unable to trigger a price alert: ${updateError.message}`);
      if (!changed) continue; // Another invocation already changed this alert.

      const { error: deliveryError } = await supabase.from('price_alert_deliveries').insert({
        alert_id: alert.id,
        offer_id: best.id,
        observed_price: best.currentPrice,
        channel: 'in_app',
      });
      if (deliveryError) throw new Error(`Unable to record price-alert delivery: ${deliveryError.message}`);
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: alert.user_id,
        type: 'price_alert_triggered',
        payload: { alertId: alert.id, productVariantId: alert.product_variant_id, offerId: best.id, price: best.currentPrice },
      });
      if (notificationError) throw new Error(`Unable to create in-app price-alert notification: ${notificationError.message}`);
      triggered += 1;
    }
    return NextResponse.json({ evaluated: (data ?? []).length, triggered, unavailable, stale, unknownAvailability });
  } catch (error) {
    captureError(error, { route: '/api/cron/evaluate-alerts' });
    return NextResponse.json({ error: 'Price-alert evaluation failed.' }, { status: 500 });
  }
}
