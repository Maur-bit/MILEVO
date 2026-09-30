'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { captureError } from '@/lib/monitoring';
import { identifyUser, track } from '@/lib/analytics';
import { getFriendlyAuthError } from '@/lib/auth-error';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const submitInProgress = useRef(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || submitInProgress.current) return;
    submitInProgress.current = true;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Faccount`,
        },
      });
      if (authError) setError(getFriendlyAuthError(authError, 'We could not create your account. Please try again.'));
      else {
        if (data.user) {
          identifyUser(data.user.id, data.user.email ? { email: data.user.email } : {});
          track({ name: 'user_registered' });
        }
        if (data.session) {
          setNavigating(true);
          router.replace('/account');
          router.refresh();
        } else {
          setDone(true);
        }
      }
    } catch (err) {
      captureError(err);
      setNavigating(false);
      setError(getFriendlyAuthError(err instanceof Error ? { message: err.message } : {}, 'Something went wrong creating your account.'));
    } finally {
      submitInProgress.current = false;
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-sm p-6 text-center">
        <h1 className="font-display text-2xl mb-2">Check your email</h1>
        <p role="status" aria-live="polite" className="text-sm text-milevo-muted">We sent a confirmation link to {email}.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="font-display text-2xl mb-1">Create an account</h1>
      <p className="text-sm text-milevo-muted mb-6">This creates a customer account for saved products, price alerts, and reviews. Merchant access requires a separate reviewed application.</p>

      {!isSupabaseConfigured && (
        <div className="mb-4 rounded-md border border-milevo-border bg-milevo-bg p-3 text-sm text-milevo-muted">
          Account creation isn&apos;t connected yet — this environment has no Supabase project
          configured (see <code className="text-xs">.env.local.example</code>).
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="text-sm font-medium block mb-1">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border border-milevo-border p-2.5" disabled={!isSupabaseConfigured} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-1" disabled={!isSupabaseConfigured} />
          <span>I acknowledge the <Link href="/terms" className="text-milevo-primary underline">draft terms</Link> and <Link href="/privacy" className="text-milevo-primary underline">draft privacy notice</Link>.</span>
        </label>
        <div>
          <label htmlFor="password" className="text-sm font-medium block mb-1">Password</label>
          <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-sm border border-milevo-border p-2.5" disabled={!isSupabaseConfigured} />
        </div>
        {error && <p role="alert" aria-live="assertive" className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={!isSupabaseConfigured}
          loading={loading || navigating}
          loadingText={navigating ? 'Opening your account…' : 'Creating account…'}
          className="mt-1"
        >
          Create account
        </Button>
      </form>

      <p className="text-sm text-milevo-muted mt-4">
        Already have an account? <Link href="/login" className="text-milevo-primary font-semibold">Sign in</Link>
      </p>
      <p className="mt-3 text-sm text-milevo-muted">
        Selling products? <Link href="/merchant-apply" className="font-semibold text-milevo-primary underline">Apply for merchant access</Link>.
      </p>
    </div>
  );
}
