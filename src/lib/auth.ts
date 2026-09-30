import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { hasMerchantPortalAccess } from '@/lib/authorization';

export type AppRole = 'customer' | 'merchant' | 'admin';

export async function requireUser(nextPath: string) {
  if (!isSupabaseConfigured()) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return { supabase, user: data.user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser('/admin');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify administrator access: ${error.message}`);
  if (profile?.role !== 'admin' || profile.account_status !== 'active') {
    redirect('/login?next=%2Fadmin&error=admin');
  }
}

export async function requireMerchant() {
  const { supabase, user } = await requireUser('/merchant');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify merchant access: ${error.message}`);
  if (!hasMerchantPortalAccess(profile?.role)) {
    redirect('/account');
  }
  return { supabase, user };
}
