// src/lib/supabase/server.ts
// Used from Server Components, Route Handlers, and Server Actions. Reads/
// writes the auth cookie so `supabase.auth.getUser()` reflects the signed-in
// user for RLS-scoped queries (favorites, alerts, merchant/admin data).
// Next.js 15: cookies() is async, so this factory is async too.
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error('Supabase is not configured. Set the public project URL and publishable key.');
  }

  const cookieStore = await cookies();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies; middleware refreshes sessions.
          }
        },
      },
    },
  );
}

// Service-role client — Route Handlers only (e.g. the /go affiliate
// redirect), NEVER imported into anything that ships to the browser.
// Requires SUPABASE_SERVICE_ROLE_KEY, a server-only env var. No cookies
// involved, so this one stays synchronous.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('The server-only Supabase service role key is not configured.');
  }

  return createSupabaseClient(
    url,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );
}
