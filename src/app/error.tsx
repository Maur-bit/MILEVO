'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { captureError } from '@/lib/monitoring';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { digest: error.digest });
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl">Something went wrong.</h1>
      <p className="mt-2 text-sm text-milevo-muted">We couldn&apos;t load this page. Please try again.</p>
      <Button type="button" className="mt-5" onClick={reset}>Try again</Button>
    </section>
  );
}
