import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { captureError } from '@/lib/monitoring';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';

const applicationSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  websiteUrl: z.string().trim().url().max(2048).refine((value) => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Store website must use HTTP or HTTPS and must not include login credentials.'),
  contactName: z.string().trim().min(2).max(120),
  details: z.string().trim().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const rate = checkRateLimit(request, 'merchant-application', 3, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many applications. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Merchant applications are not configured for this deployment.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid application request.' }, { status: 400 });
  }
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please review your application.' }, { status: 400 });
  }

  try {
    const userClient = await createClient();
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError) throw new Error(`Unable to verify merchant applicant: ${authError.message}`);
    if (!auth.user) return NextResponse.json({ error: 'Sign in before applying for merchant access.' }, { status: 401 });
    if (!auth.user.email || !auth.user.email_confirmed_at) {
      return NextResponse.json({ error: 'Confirm your email address before applying.' }, { status: 403 });
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (profileError) throw new Error(`Unable to verify account type: ${profileError.message}`);
    if (profile?.role !== 'customer') {
      return NextResponse.json({ error: 'This account already has merchant or administrator access.' }, { status: 409 });
    }

    const service = createServiceRoleClient();
    const { data: existing, error: existingError } = await service
      .from('merchant_applications')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingError) throw new Error(`Unable to check for a pending application: ${existingError.message}`);
    if (existing) return NextResponse.json({ error: 'You already have a pending merchant application.' }, { status: 409 });

    const { error } = await service.from('merchant_applications').insert({
      user_id: auth.user.id,
      store_name: parsed.data.storeName,
      website_url: parsed.data.websiteUrl,
      contact_name: parsed.data.contactName,
      contact_email: auth.user.email,
      details: parsed.data.details,
      status: 'pending',
    });
    if (error) throw new Error(`Unable to save merchant application: ${error.message}`);
    return NextResponse.json({ submitted: true }, { status: 201 });
  } catch (error) {
    captureError(error, { route: '/api/merchant/applications' });
    return NextResponse.json({ error: 'Unable to submit your application right now.' }, { status: 500 });
  }
}
