import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { canManageMerchantStore } from '@/lib/authorization';

export async function authorizeMerchantStoreRequest(request: NextRequest, storeId: string) {
  if (!isSupabaseConfigured()) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 }) };
  }
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 }) };
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Unable to verify merchant session: ${authError.message}`);
  if (!auth.user) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Unable to verify merchant access: ${profileError.message}`);
  if (profile?.role !== 'merchant') {
    return { authorized: false as const, response: NextResponse.json({ error: 'Merchant access is required.' }, { status: 403 }) };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('store_users')
    .select('store_id')
    .eq('user_id', auth.user.id)
    .eq('store_id', storeId)
    .maybeSingle();
  if (membershipError) throw new Error(`Unable to verify merchant store membership: ${membershipError.message}`);
  if (!canManageMerchantStore(profile?.role, Boolean(membership))) {
    return { authorized: false as const, response: NextResponse.json({ error: 'You are not authorized to manage this store.' }, { status: 403 }) };
  }

  const rate = checkRateLimit(request, 'merchant-feed-import', 20, 60 * 60 * 1000);
  if (!rate.allowed) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Too many feed imports. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      ),
    };
  }

  return {
    authorized: true as const,
    user: auth.user,
    service: createServiceRoleClient(),
  };
}
