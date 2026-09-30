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

export function LoginForm({ nextPath, notice }: { nextPath: string; notice: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const submitInProgress = useRef(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured || submitInProgress.current) return;
    submitInProgress.current = true;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(getFriendlyAuthError(authError, 'We could not sign you in. Please try again.'));
        return;
      }
      if (data.user) {
        identifyUser(data.user.id, data.user.email ? { email: data.user.email } : {});
        track({ name: 'user_signed_in' });
      }
      setNavigating(true);
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      captureError(err);
      setNavigating(false);
      setError(getFriendlyAuthError(
        err instanceof Error ? { message: err.message } : {},
        'Something went wrong signing in. Please try again.',
      ));
    } finally {
      submitInProgress.current = false;
      setLoading(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        return;
      }
      router.refresh();
    } catch (err) {
      captureError(err);
      setError('Something went wrong signing out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!isSupabaseConfigured || !email.trim() || resetLoading) return;
    setResetLoading(true);
    setError(null);
    setResetNotice(null);
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
      });
      if (resetError) {
        setError(getFriendlyAuthError(resetError, 'We could not request a password reset. Please try again.'));
        return;
      }
      // Supabase intentionally does not disclose whether this email has an account.
      setResetNotice('If an account exists for this email, we sent a password-reset link. Check your inbox and spam folder.');
    } catch (err) {
      captureError(err);
      setError(getFriendlyAuthError(
        err instanceof Error ? { message: err.message } : {},
        'We could not request a password reset. Please try again.',
      ));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-1 font-display text-2xl">Sign in</h1>
      <p className="mb-6 text-sm text-milevo-muted">Sign in to your customer account or your approved merchant account. Merchant portal access is granted only after business review.</p>

      {!isSupabaseConfigured && (
        <div className="mb-4 rounded-md border border-milevo-border bg-milevo-bg p-3 text-sm text-milevo-muted">
          Sign-in is unavailable until the Supabase project URL and publishable key are configured.
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded-md border border-milevo-border bg-milevo-bg p-3 text-sm text-milevo-muted">
          {notice}
          {notice.startsWith('This account') && (
            <Button type="button" variant="secondary" className="mt-3 w-full" onClick={signOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-sm border border-milevo-border p-2.5"
            disabled={!isSupabaseConfigured}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-sm border border-milevo-border p-2.5"
            disabled={!isSupabaseConfigured}
          />
        </div>
        <div className="-mt-1 text-right">
          <button
            type="button"
            onClick={() => void requestPasswordReset()}
            disabled={!isSupabaseConfigured || !email.trim() || resetLoading}
            className="text-sm font-semibold text-milevo-primary underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetLoading ? 'Sending reset link…' : 'Forgot password?'}
          </button>
        </div>
        {error && <p role="alert" aria-live="assertive" className="text-sm text-red-600">{error}</p>}
        {resetNotice && <p role="status" aria-live="polite" className="text-sm text-milevo-muted">{resetNotice}</p>}
        <Button
          type="submit"
          disabled={!isSupabaseConfigured}
          loading={loading || navigating}
          loadingText={navigating ? 'Opening your account…' : 'Signing in…'}
          className="mt-1"
        >
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-sm text-milevo-muted">
        No account? <Link href="/register" className="font-semibold text-milevo-primary">Create one</Link>
      </p>
    </div>
  );
}
