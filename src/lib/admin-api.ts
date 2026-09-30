import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isAuthSessionMissingError } from '@/lib/auth-error';

export async function authorizeAdminRequest(
  request: NextRequest,
  options: { readOnly?: boolean } = {},
) {
  if (!isSupabaseConfigured()) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 }) };
  }
  const origin = request.headers.get('origin');
  if ((origin && origin !== request.nextUrl.origin) || (!origin && !options.readOnly)) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 }) };
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) {
    throw new Error(`Unable to verify administrator session: ${authError.message}`);
  }
  if (!auth.user) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Unable to verify administrator access: ${profileError.message}`);
  if (profile?.role !== 'admin' || profile.account_status !== 'active') {
    return { authorized: false as const, response: NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 }) };
  }

  if (!options.readOnly) {
    const rate = checkRateLimit(request, 'admin-write', 60, 60_000);
    if (!rate.allowed) {
      return {
        authorized: false as const,
        response: NextResponse.json(
          { error: 'Too many administrator changes. Please try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
        ),
      };
    }
  }

  return { authorized: true as const, supabase, user: auth.user as User };
}

export async function readJson(request: NextRequest): Promise<unknown | NextResponse> {
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
}
