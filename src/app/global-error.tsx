'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { captureError } from '@/lib/monitoring';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-bold">Milevo is having trouble loading.</h1>
          <p className="mt-2 text-sm">Please refresh the page or return to the home page.</p>
          <button className="mt-5 rounded-md border px-4 py-2" onClick={() => window.location.reload()}>Refresh page</button>
          <Link className="mt-3 underline" href="/">Go to home</Link>
        </main>
      </body>
    </html>
  );
}
