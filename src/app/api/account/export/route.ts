import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { captureError } from '@/lib/monitoring';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: 'Sign in to export your account data.' }, { status: 401 });
    }

    const userId = auth.user.id;
    const [profile, favorites, alerts, recentlyViewed, productReviews, storeReviews] = await Promise.all([
      supabase.from('profiles').select('full_name, role, created_at').eq('id', userId).maybeSingle(),
      supabase.from('favorites').select('product_id, created_at').eq('user_id', userId),
      supabase.from('price_alerts').select('product_variant_id, target_price, is_active, created_at, triggered_at').eq('user_id', userId),
      supabase.from('recently_viewed').select('product_id, viewed_at').eq('user_id', userId),
      supabase.from('product_reviews').select('product_id, rating, title, body, source, is_approved, created_at').eq('user_id', userId),
      supabase.from('store_reviews').select('store_id, overall_rating, delivery_rating, service_rating, returns_rating, body, source, is_approved, created_at').eq('user_id', userId),
    ]);
    const queryError = [profile, favorites, alerts, recentlyViewed, productReviews, storeReviews]
      .find((result) => result.error)?.error;
    if (queryError) throw queryError;

    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        account: {
          email: auth.user.email ?? null,
          fullName: profile.data?.full_name ?? null,
          role: profile.data?.role ?? null,
          createdAt: profile.data?.created_at ?? auth.user.created_at,
        },
        savedProducts: favorites.data ?? [],
        priceAlerts: alerts.data ?? [],
        recentlyViewed: recentlyViewed.data ?? [],
        productReviews: productReviews.data ?? [],
        storeReviews: storeReviews.data ?? [],
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'Content-Disposition': 'attachment; filename="milevo-account-data.json"',
        },
      },
    );
  } catch (error) {
    captureError(error, { route: '/api/account/export' });
    return NextResponse.json({ error: 'Unable to export your account data right now.' }, { status: 500 });
  }
}
