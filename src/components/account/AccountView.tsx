'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSavedProducts, getPriceAlerts, removePriceAlert, getRecentlyViewed, toggleSaved } from '@/services/account';
import { getMyReviews } from '@/services/reviews';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState, Skeleton } from '@/components/shared/States';
import { Button } from '@/components/ui/Button';
import { formatGHS, stars } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import type { PriceAlert, ProductReview, ProductSummary } from '@/types';
import { captureError } from '@/lib/monitoring';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { AccountDataActions } from '@/components/account/AccountDataActions';
import { createClient } from '@/lib/supabase/client';
import { isAuthSessionMissingError } from '@/lib/auth-error';

export function AccountView({ defaultTab = 'saved' }: { defaultTab?: string }) {
  const toast = useToast();
  const [saved, setSaved] = useState<ProductSummary[]>([]);
  const [alerts, setAlerts] = useState<(PriceAlert & { product: ProductSummary | null })[]>([]);
  const [recent, setRecent] = useState<ProductSummary[]>([]);
  const [reviews, setReviews] = useState<(ProductReview & { slug: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const activeUserId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let userId: string | null = null;
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        const { data: auth, error: authError } = await createClient().auth.getUser();
        if (authError && !isAuthSessionMissingError(authError)) throw authError;
        userId = auth.user?.id ?? null;
      }
      if (activeUserId.current !== userId) return;
      const [nextSaved, nextAlerts, nextRecent, nextReviews] = await Promise.all([
        getSavedProducts(),
        getPriceAlerts(),
        getRecentlyViewed(),
        getMyReviews(),
      ]);
      if (activeUserId.current !== userId) return;
      setSaved(nextSaved);
      setAlerts(nextAlerts);
      setRecent(nextRecent);
      setReviews(nextReviews);
    } catch (err) {
      captureError(err);
      setError('Unable to load your account data. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const configured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    if (!configured) {
      void refresh();
      return;
    }

    const supabase = createClient();
    let active = true;
    const updateUser = (userId: string | null) => {
      if (!active || activeUserId.current === userId) return;
      activeUserId.current = userId;
      setSaved([]);
      setAlerts([]);
      setRecent([]);
      setReviews([]);
      if (userId) {
        window.setTimeout(() => {
          if (active) void refresh();
        }, 0);
      } else {
        setError('Sign in to view your account data.');
        setLoading(false);
      }
    };
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError && !isAuthSessionMissingError(authError)) {
        captureError(authError, { area: 'account-auth' });
        setError('Unable to verify your account session. Please sign in again.');
        setLoading(false);
        return;
      }
      updateUser(data.user?.id ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      updateUser(session?.user.id ?? null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [refresh]);

  const removeSaved = async (slug: string) => {
    const actionId = `saved:${slug}`;
    if (removing) return;
    setRemoving(actionId);
    try {
      await toggleSaved(slug);
      await refresh();
      toast('Removed from favourites');
    } catch (err) {
      captureError(err);
      setError('Unable to update your saved products.');
    } finally {
      setRemoving(null);
    }
  };

  const removeAlert = async (id: string | number) => {
    const actionId = `alert:${id}`;
    if (removing) return;
    setRemoving(actionId);
    try {
      await removePriceAlert(id);
      await refresh();
      toast('Alert removed');
    } catch (err) {
      captureError(err);
      setError('Unable to remove this price alert.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-4">
        <h1 className="font-display text-xl">My Account</h1>
        <SignOutButton dark={false} />
      </div>
      {loading ? (
        <div className="space-y-4 px-4 py-6" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading your account…</span>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-md border border-milevo-border p-3">
                <Skeleton className="mb-3 aspect-square" />
                <Skeleton className="mb-2 h-4 w-4/5" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : (
      <Tabs.Root defaultValue={defaultTab}>
        <Tabs.List className="flex overflow-x-auto border-b border-milevo-border px-4">
          {[['saved', 'Saved'], ['alerts', 'Price alerts'], ['recent', 'Recently viewed'], ['reviews', 'My reviews']].map(([v, label]) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-milevo-muted data-[state=active]:border-milevo-primary data-[state=active]:text-milevo-text"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="saved" className="p-4">
          {!loading && !error && saved.length === 0 ? (
            <EmptyState title="Your saved products will appear here." action={<a href="/search"><Button>Explore products</Button></a>} />
          ) : !loading && !error ? (
            <div className="grid grid-cols-2 gap-3">
              {saved.map((p) => (
                <div key={p.slug}>
                  <ProductCard product={p} />
                  <button
                    onClick={() => void removeSaved(p.slug)}
                    className="mt-1 text-xs font-semibold text-milevo-primary disabled:cursor-wait disabled:opacity-60"
                    disabled={removing !== null}
                    aria-busy={removing === `saved:${p.slug}`}
                  >
                    {removing === `saved:${p.slug}` ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Tabs.Content>

        <Tabs.Content value="alerts" className="p-4">
          {!loading && !error && alerts.length === 0 ? (
            <EmptyState title="Set an alert and we'll watch the price for you." action={<a href="/search"><Button>Find a product</Button></a>} />
          ) : !loading && !error ? (
            alerts.map((a, i) => (
              <div key={a.id ?? `${a.slug}-${a.createdAt}-${i}`} className="flex items-center justify-between border-b border-milevo-border py-3">
                <div>
                  <div className="font-semibold">{a.product?.name ?? 'Product unavailable'}</div>
                  <div className="text-sm text-milevo-muted">Notify at {formatGHS(a.targetPrice)}{a.product && ` · current ${formatGHS(a.product.price)}`}</div>
                </div>
                <button
                  onClick={() => void removeAlert(a.id ?? i)}
                  className="min-h-touch px-2 text-sm text-milevo-muted disabled:cursor-wait disabled:opacity-60"
                  disabled={removing !== null}
                  aria-busy={removing === `alert:${a.id ?? i}`}
                >
                  {removing === `alert:${a.id ?? i}` ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))
          ) : null}
        </Tabs.Content>

        <Tabs.Content value="recent" className="p-4">
          {!loading && !error && recent.length === 0 ? (
            <EmptyState title="Nothing viewed yet." />
          ) : !loading && !error ? (
            <div className="grid grid-cols-2 gap-3">{recent.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
          ) : null}
        </Tabs.Content>

        <Tabs.Content value="reviews" className="p-4">
          {!loading && !error && reviews.length === 0 ? (
            <EmptyState title="You haven't written any reviews yet." />
          ) : !loading && !error ? (
            reviews.map((r, i) => (
              <div key={i} className="border-b border-milevo-border py-3">
                <div className="text-milevo-primary">{stars(r.rating)}</div>
                <div className="font-bold">{r.title}</div>
                <p className="text-sm">{r.body}</p>
              </div>
            ))
          ) : null}
        </Tabs.Content>
      </Tabs.Root>
      )}
      {error && <p role="alert" className="px-4 py-3 text-sm text-red-600">{error}</p>}
      <AccountDataActions />
    </div>
  );
}
