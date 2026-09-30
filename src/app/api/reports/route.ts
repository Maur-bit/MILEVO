import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { captureError } from '@/lib/monitoring';
import { checkRateLimit } from '@/lib/rate-limit';
import { isAuthSessionMissingError } from '@/lib/auth-error';

const reportSchema = z.object({
  category: z.enum(['incorrect-price', 'incorrect-information', 'broken-link', 'broken-feature', 'accessibility', 'account', 'privacy', 'merchant', 'general', 'other']),
  details: z.string().trim().min(10).max(3000),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  pagePath: z.string().trim().max(500).regex(/^\/(?!\/)[^\s]*$/).optional(),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const rate = checkRateLimit(request, 'report', 4, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many reports from this connection. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Problem reporting is temporarily unavailable.' }, { status: 503 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Problem reporting is not configured for this deployment.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please review the report details.' }, { status: 400 });
  }

  try {
    const userClient = await createClient();
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError && !isAuthSessionMissingError(authError)) {
      throw new Error(`Unable to verify optional report ownership: ${authError.message}`);
    }
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('problem_reports').insert({
      user_id: auth.user?.id ?? null,
      category: parsed.data.category,
      details: parsed.data.details,
      contact_email: parsed.data.email || null,
      page_path: parsed.data.pagePath || null,
      status: 'pending',
    });
    if (error) throw new Error(`Unable to save problem report: ${error.message}`);
    return NextResponse.json({ submitted: true }, { status: 201 });
  } catch (error) {
    captureError(error, { route: '/api/reports' });
    return NextResponse.json({ error: 'Unable to submit your report right now. Please try again later.' }, { status: 500 });
  }
}
