import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { captureError } from '@/lib/monitoring';
import { createClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';

const confirmationSchema = z.object({ confirmation: z.literal('DELETE') });

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Confirm account deletion to continue.' }, { status: 400 });
  }
  if (!confirmationSchema.safeParse(body).success) {
    return NextResponse.json({ error: 'Type DELETE to confirm account deletion.' }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Account deletion is unavailable because authentication is not configured.' }, { status: 503 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Account deletion is not configured for this deployment.' }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: 'Sign in again before deleting your account.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role === 'admin') {
      return NextResponse.json({ error: 'Administrator accounts must be closed by another administrator.' }, { status: 403 });
    }

    const service = createServiceRoleClient();
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    if (signOutError) throw signOutError;

    const { error: productReviewError } = await service
      .from('product_reviews')
      .delete()
      .eq('user_id', auth.user.id);
    if (productReviewError) throw productReviewError;

    const { error: storeReviewError } = await service
      .from('store_reviews')
      .delete()
      .eq('user_id', auth.user.id);
    if (storeReviewError) throw storeReviewError;

    const { error: clickError } = await service
      .from('affiliate_clicks')
      .update({ user_id: null })
      .eq('user_id', auth.user.id);
    if (clickError) throw clickError;

    const { error: deleteError } = await service.auth.admin.deleteUser(auth.user.id);
    if (deleteError) throw deleteError;

    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    captureError(error, { route: '/api/account/delete' });
    return NextResponse.json({ error: 'Unable to complete account deletion. Please contact support.' }, { status: 500 });
  }
}
