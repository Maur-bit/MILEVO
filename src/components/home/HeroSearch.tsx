'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CATEGORIES } from '@/data/seedData';
import { track } from '@/lib/analytics';

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [isPending, startTransition] = useTransition();
  const canSearch = Boolean(q.trim() || category);

  return (
    <form
      role="search"
      className="grid gap-2 rounded-2xl border border-milevo-border bg-white p-2 shadow-[0_14px_40px_-24px_rgba(20,20,20,0.32)] dark:bg-milevo-white sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSearch || isPending) return;
        track({ name: 'search_performed' });
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (category) params.set('category', category);
        startTransition(() => router.push(`/search?${params.toString()}`));
      }}
    >
      <label className="flex min-h-touch min-w-0 items-center gap-3 px-3">
        <Icon name="search" size={20} className="text-milevo-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search products, brands, or models"
          aria-label="Search products"
          className="min-w-0 flex-1 border-none bg-transparent text-base outline-none placeholder:text-milevo-muted/80"
        />
      </label>
      <label className="sr-only" htmlFor="home-search-category">Category</label>
      <select
        id="home-search-category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        className="min-h-touch rounded-xl border border-milevo-border bg-white px-3 text-sm text-milevo-text outline-none focus-visible:ring-2 focus-visible:ring-milevo-primary dark:bg-milevo-white"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
      </select>
      <Button type="submit" loading={isPending} loadingText="Searching…" disabled={!canSearch} className="rounded-xl px-5">
        Search
      </Button>
    </form>
  );
}
