'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { captureError } from '@/lib/monitoring';
import { createClient } from '@/lib/supabase/client';
import { isAuthSessionMissingError } from '@/lib/auth-error';

export function AccountDataActions() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let active = true;
    let activeUserId: string | null = null;
    async function loadProfile(userId: string | null) {
      activeUserId = userId;
      setFullName('');
      if (!userId) return;
      try {
        const supabase = createClient();
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();
        if (profileError) throw profileError;
        if (active && activeUserId === userId) setFullName(data?.full_name ?? '');
      } catch (caught) {
        captureError(caught, { action: 'account-profile-load' });
        if (active) setError('Unable to load your account settings.');
      }
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError && !isAuthSessionMissingError(authError)) {
        captureError(authError, { action: 'account-profile-auth' });
        if (active) setError('Unable to verify your account session.');
        return;
      }
      if (active) void loadProfile(data.user?.id ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void loadProfile(session?.user.id ?? null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError && !isAuthSessionMissingError(authError)) throw authError;
      if (!auth.user) throw new Error('Sign in to update your account settings.');
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', auth.user.id)
        .select('full_name')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('Your account settings could not be updated.');
      setFullName(data.full_name ?? '');
      setMessage('Account settings updated.');
    } catch (caught) {
      captureError(caught, { action: 'account-profile-update' });
      setError(caught instanceof Error ? caught.message : 'Unable to update your account settings.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function exportData() {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/account/export', { cache: 'no-store' });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? 'Unable to export your account data.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'milevo-account-data.json';
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Your data export has been downloaded.');
    } catch (caught) {
      captureError(caught, { action: 'account-export' });
      setError(caught instanceof Error ? caught.message : 'Unable to export your account data.');
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== 'DELETE' || deleting) return;

    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? 'Unable to complete account deletion.');
      }

      const { error: signOutError } = await createClient().auth.signOut({ scope: 'local' });
      if (signOutError) captureError(signOutError, { action: 'account-delete-local-signout' });
      router.replace('/');
      router.refresh();
    } catch (caught) {
      captureError(caught, { action: 'account-delete' });
      setError(caught instanceof Error ? caught.message : 'Unable to complete account deletion.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mx-4 my-6 rounded-2xl border border-milevo-border p-4 sm:p-6" aria-labelledby="account-data-heading">
      <h2 id="account-data-heading" className="font-display text-lg font-semibold">Manage your data</h2>
      <p className="mt-2 max-w-2xl text-sm text-milevo-muted">
        Export your profile, saved products, alerts, recently viewed products, and reviews. Deleting your account permanently removes those account records and signs out your sessions; public catalog and store records are retained.
      </p>
      <form onSubmit={saveProfile} className="mt-5 max-w-sm">
        <h3 className="font-semibold">Account settings</h3>
        <label className="mt-2 block text-sm font-medium">
          Name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={120}
            autoComplete="name"
            className="mt-1 block min-h-11 w-full rounded-md border border-milevo-border bg-transparent px-3"
          />
        </label>
        <Button type="submit" variant="secondary" className="mt-3" disabled={savingProfile || exporting || deleting}
          loading={savingProfile} loadingText="Saving settings…">Save name</Button>
      </form>
      <Button type="button" variant="secondary" className="mt-4" onClick={() => void exportData()} loading={exporting} loadingText="Preparing export…" disabled={exporting || deleting}>
        Export my data
      </Button>

      <form onSubmit={deleteAccount} className="mt-6 border-t border-milevo-border pt-5">
        <h3 className="font-semibold">Delete account</h3>
        <p className="mt-1 text-sm text-milevo-muted">
          This cannot be undone. Your saved products, alerts, activity, and reviews will be removed. Store/catalog records are not deleted. Type DELETE to confirm.
        </p>
        <label className="mt-3 block max-w-sm text-sm font-medium">
          Confirmation
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            className="mt-1 block min-h-11 w-full rounded-md border border-milevo-border bg-transparent px-3"
          />
        </label>
        <Button type="submit" variant="secondary" className="mt-3 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950" disabled={confirmation !== 'DELETE' || deleting || exporting} loading={deleting} loadingText="Deleting account…">
          Delete my account
        </Button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-milevo-success">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
