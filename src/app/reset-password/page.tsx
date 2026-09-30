'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { captureError } from '@/lib/monitoring';
import { getFriendlyAuthError, isAuthSessionMissingError } from '@/lib/auth-error';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCheckingSession(false);
      return;
    }
    let active = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError && !isAuthSessionMissingError(sessionError)) {
        captureError(sessionError, { area: 'password-recovery-session' });
      }
      setRecoveryReady(Boolean(data.user));
      setCheckingSession(false);
    }).catch((caught: unknown) => {
      if (!active) return;
      captureError(caught, { area: 'password-recovery-session' });
      setCheckingSession(false);
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recoveryReady || loading) return;
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) {
        setError(getFriendlyAuthError(updateError, 'We could not update your password. Request a new reset link and try again.'));
        return;
      }
      setComplete(true);
    } catch (caught) {
      captureError(caught, { area: 'password-recovery-update' });
      setError(getFriendlyAuthError(
        caught instanceof Error ? { message: caught.message } : {},
        'We could not update your password. Request a new reset link and try again.',
      ));
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return <main className="mx-auto max-w-sm p-6"><h1 className="font-display text-2xl">Password reset unavailable</h1><p className="mt-3 text-sm text-milevo-muted">Authentication is not configured for this environment.</p></main>;
  }

  if (checkingSession) {
    return <main className="mx-auto max-w-sm p-6" role="status" aria-live="polite"><h1 className="font-display text-2xl">Checking your reset link</h1><p className="mt-3 text-sm text-milevo-muted">Please wait…</p></main>;
  }

  if (!recoveryReady) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <h1 className="font-display text-2xl">This reset link is invalid or expired</h1>
        <p className="mt-3 text-sm text-milevo-muted">Request a new password-reset link, then open the newest email in the same browser.</p>
        <Link href="/login" className="mt-5 inline-block font-semibold text-milevo-primary underline">Back to sign in</Link>
      </main>
    );
  }

  if (complete) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <h1 className="font-display text-2xl">Password updated</h1>
        <p className="mt-3 text-sm text-milevo-muted">Your password has been changed and you remain signed in.</p>
        <Button className="mt-5" onClick={() => router.replace('/account')}>Go to my account</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="font-display text-2xl">Choose a new password</h1>
      <p className="mt-2 text-sm text-milevo-muted">Use at least 8 characters and avoid reusing an old password.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-sm border border-milevo-border p-2.5" />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-sm border border-milevo-border p-2.5" />
        </div>
        {error && <p role="alert" aria-live="assertive" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} loadingText="Updating password…">Update password</Button>
      </form>
    </main>
  );
}
