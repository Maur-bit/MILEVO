// src/lib/supabase/client.ts
// Used from Client Components. Only ever holds the public anon key — RLS
// (see database/schema.sql + admin-policies.sql) is what keeps this safe.
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
