import type { Metadata } from 'next';
import Link from 'next/link';
import { MerchantApplicationForm } from './MerchantApplicationForm';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { isAuthSessionMissingError } from '@/lib/auth-error';

export const metadata: Metadata = { title: 'Apply for merchant access' };

export default async function MerchantApplicationPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="font-display text-2xl">Apply for merchant access</h1>
        <p className="mt-3 text-sm text-milevo-muted">Merchant applications are unavailable until Supabase is configured.</p>
      </div>
    );
  }
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error && !isAuthSessionMissingError(error)) {
    throw new Error(`Unable to load merchant application page: ${error.message}`);
  }

  if (!auth.user) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="font-display text-2xl">Apply for merchant access</h1>
        <p className="mt-3 text-sm text-milevo-muted">Sign in to a confirmed Milevo account before submitting business details. Merchant access is reviewed separately.</p>
        <div className="mt-4 flex gap-4 text-sm font-semibold text-milevo-primary">
          <Link href="/login?next=%2Fmerchant-apply" className="underline">Sign in</Link>
          <Link href="/register" className="underline">Create a customer account</Link>
        </div>
      </div>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Unable to load account type: ${profileError.message}`);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-2xl">Apply for merchant access</h1>
      {profile?.role === 'merchant' || profile?.role === 'admin' ? (
        <p className="mt-3 text-sm text-milevo-muted">
          This account already has portal access. <Link href="/merchant" className="font-semibold text-milevo-primary underline">Open the merchant portal</Link>.
        </p>
      ) : (
        <div className="mt-4">
          <MerchantApplicationForm email={auth.user.email ?? 'your account'} />
        </div>
      )}
    </div>
  );
}
