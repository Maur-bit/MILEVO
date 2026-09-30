'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { identifyUser, resetUser } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
  }));

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        identifyUser(session.user.id, session.user.email ? { email: session.user.email } : {});
      }

      if (event === 'SIGNED_OUT') resetUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
