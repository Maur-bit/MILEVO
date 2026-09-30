'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

type Category = { id: string; name: string; slug: string; parent_id: string | null };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function startEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setError('');
    setNotice('');
  }

  function reset() {
    setEditing(null);
    setName('');
    setParentId('');
    setError('');
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { name } : { name, parent_id: parentId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save category.');
      setNotice(editing ? 'Category updated.' : 'Category created.');
      reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save category.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete “${category.name}”? Categories in use by products or child categories cannot be deleted.`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to delete category.');
      if (editing?.id === category.id) reset();
      setNotice('Category deleted.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete category.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
      <ul className="divide-y divide-milevo-border rounded-md border border-milevo-border">
        {categories.length ? categories.map((category) => (
          <li key={category.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{category.name}</p>
              <p className="mt-1 truncate text-xs text-milevo-muted">{category.slug}</p>
            </div>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => startEdit(category)}>Edit</Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove(category)}>Delete</Button>
          </li>
        )) : <li className="p-6 text-center text-sm text-milevo-muted">No categories yet.</li>}
      </ul>
      <form onSubmit={save} className="h-fit space-y-3 rounded-md border border-milevo-border bg-white p-4">
        <h2 className="font-display text-lg font-bold">{editing ? 'Edit category' : 'Add category'}</h2>
        <label className="block text-sm font-medium">Name
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100}
            className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm" />
        </label>
        {!editing && (
          <label className="block text-sm font-medium">Parent category
            <select value={parentId} onChange={(event) => setParentId(event.target.value)}
              className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm">
              <option value="">None</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && <p role="status" className="text-sm text-milevo-success">{notice}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={busy} loadingText="Saving…">{editing ? 'Save changes' : 'Create category'}</Button>
          {editing && <Button type="button" variant="secondary" disabled={busy} onClick={reset}>Cancel</Button>}
        </div>
      </form>
    </div>
  );
}
