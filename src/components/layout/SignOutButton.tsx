'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { captureError } from '@/lib/monitoring';
import { Button } from '@/components/ui/Button';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function SignOutButton({ dark = true }: { dark?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) return null;

  const signOut = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) {
        setError('Unable to sign out. Please try again.');
        return;
      }
      router.replace('/login');
      router.refresh();
    } catch (err) {
      captureError(err);
      setError('Unable to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={dark ? 'border-t border-white/20' : ''}>
      <Button
        variant="ghost"
        onClick={signOut}
        loading={loading}
        loadingText="Signing out…"
        className={`w-full justify-start rounded-none px-4 py-3 text-left text-sm ${dark ? 'text-gray-300 hover:text-white' : 'font-semibold text-milevo-primary'}`}
      >
        Sign out
      </Button>
      {error && <p role="alert" className={`px-4 pb-3 text-xs ${dark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>}
    </div>
  );
}
