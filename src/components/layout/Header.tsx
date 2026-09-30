'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from './ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { captureError } from '@/lib/monitoring';
import { isAuthSessionMissingError } from '@/lib/auth-error';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountLink, setAccountLink] = useState({ href: '/account', label: 'My account' });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;
    let activeUserId: string | null = null;
    const updateAccountLink = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (error) {
        captureError(error, { area: 'header-profile' });
        return;
      }
      if (!active || activeUserId !== userId) return;
      if (active && data?.role === 'merchant') {
        setAccountLink({ href: '/merchant', label: 'Merchant portal' });
      } else if (active) {
        setAccountLink({ href: '/account', label: 'My account' });
      }
    };
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error && !isAuthSessionMissingError(error)) {
        captureError(error, { area: 'header-auth' });
        return;
      }
      if (active) {
        activeUserId = data.user?.id ?? null;
        setIsAuthenticated(Boolean(data.user));
      }
      if (data.user) void updateAccountLink(data.user.id);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      activeUserId = session?.user.id ?? null;
      if (active) setIsAuthenticated(Boolean(session?.user));
      if (session?.user) void updateAccountLink(session.user.id);
      else if (active) setAccountLink({ href: '/account', label: 'My account' });
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-milevo-border bg-white/95 backdrop-blur-md dark:bg-[#1b1b1b]/95">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <Link href="/" aria-label="Milevo home" className="inline-flex shrink-0 items-center gap-2 font-display text-lg font-extrabold tracking-tight sm:text-xl">
          <Image src="/milevo-logo.png" alt="" width={38} height={38} priority className="h-9 w-9 object-contain" />
          <span>Milevo</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 text-sm font-medium text-milevo-muted lg:flex xl:gap-7">
          <Link href="/" className="transition-colors hover:text-milevo-primary">Home</Link>
          <Link href="/category/all" className="transition-colors hover:text-milevo-primary">Categories</Link>
          <Link href="/deals" className="transition-colors hover:text-milevo-primary">Deals</Link>
          <Link href="/price-drops" className="transition-colors hover:text-milevo-primary">Price drops</Link>
          <Link href="/merchant-apply" className="transition-colors hover:text-milevo-primary">For merchants</Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/search" aria-label="Search products" className="flex h-10 w-10 items-center justify-center rounded-lg text-milevo-muted transition-colors hover:bg-milevo-bg hover:text-milevo-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary">
            <Icon name="search" size={19} />
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href={accountLink.href} className="hidden min-h-10 items-center rounded-lg bg-milevo-bg px-3 text-sm font-semibold transition-colors hover:bg-orange-50 dark:hover:bg-white/10 sm:inline-flex">
              {accountLink.label}
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-milevo-bg sm:inline-flex">Sign in</Link>
              <Link href="/register" className="hidden min-h-10 items-center justify-center rounded-lg bg-milevo-primary px-3 text-xs font-semibold text-[#171717] transition-colors hover:bg-[#ff8a3d] dark:hover:bg-[#ff9a52] sm:inline-flex sm:px-4 sm:text-sm">Create account</Link>
            </>
          )}
          <Link href={isAuthenticated ? accountLink.href : "/login"} aria-label={isAuthenticated ? accountLink.label : "Sign in"} className="flex h-10 w-10 items-center justify-center rounded-lg text-milevo-muted transition-colors hover:bg-milevo-bg hover:text-milevo-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary sm:hidden">
            <Icon name="user" size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}
