'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function HomeDataNotice({ message = 'Some live catalog information couldn’t be loaded. Check your connection and try again.' }: { message?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div role="alert" className="mx-auto mb-6 flex max-w-7xl flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <p>{message}</p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
        className="min-h-10 shrink-0 rounded-lg border border-current px-3 font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}
