'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticationRequiredError, isSaved, toggleSaved } from '@/services/account';
import { track } from '@/lib/analytics';
import { captureError } from '@/lib/monitoring';
import { useToast } from '@/components/shared/Toast';

export function useFavorite(slug: string) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestInProgress = useRef(false);

  useEffect(() => {
    let active = true;
    isSaved(slug)
      .then((value) => {
        if (active) setSaved(value);
      })
      .catch((err: unknown) => {
        captureError(err);
        if (active) setError('Unable to load your saved products.');
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const toggle = useCallback(async () => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setLoading(true);
    setError(null);
    try {
      const nowSaved = await toggleSaved(slug);
      setSaved(nowSaved);
      if (nowSaved) track({ name: 'product_saved', slug });
      toast(nowSaved ? 'Product saved.' : 'Removed from saved products.');
    } catch (err) {
      if (err instanceof AuthenticationRequiredError) {
        router.push(`/login?next=${encodeURIComponent(`/product/${slug}`)}`);
        return;
      }
      captureError(err);
      setError('Unable to update your saved products.');
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  }, [router, slug, toast]);

  return { saved, toggle, error, loading };
}
