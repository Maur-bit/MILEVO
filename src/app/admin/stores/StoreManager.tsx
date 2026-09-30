'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CatalogImageUploader } from '@/components/admin/CatalogImageUploader';
import { removeCatalogImage } from '@/lib/catalog-image-storage';

export type ManagedStore = {
  id: string;
  slug: string;
  name: string;
  website_url: string;
  logo_url: string | null;
  about: string | null;
  contact_email: string | null;
  delivery_info: string | null;
};

type StoreFields = Omit<ManagedStore, 'id' | 'slug'>;
const empty: StoreFields = { name: '', website_url: '', logo_url: null, about: '', contact_email: '', delivery_info: '' };

export function StoreManager({ stores }: { stores: ManagedStore[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ManagedStore | null>(null);
  const [fields, setFields] = useState<StoreFields>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function choose(store: ManagedStore | null) {
    setSelected(store);
    setFields(store ? {
      name: store.name,
      website_url: store.website_url,
      logo_url: store.logo_url,
      about: store.about ?? '',
      contact_email: store.contact_email ?? '',
      delivery_info: store.delivery_info ?? '',
    } : { ...empty });
    setError('');
    setNotice('');
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const payload = {
      name: fields.name.trim(),
      website: fields.website_url.trim(),
      logo_url: fields.logo_url,
      about: (fields.about ?? '').trim() || null,
      contact_email: (fields.contact_email ?? '').trim() || null,
      delivery_info: (fields.delivery_info ?? '').trim() || null,
    };
    try {
      const response = await fetch(selected ? `/api/admin/stores/${selected.id}` : '/api/admin/stores', {
        method: selected ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save store.');
      if (selected) setSelected({ ...selected, ...fields, name: fields.name.trim(), website_url: fields.website_url.trim() });
      if (!selected) {
        const created: ManagedStore = {
          id: result.store.id,
          slug: result.store.slug,
          name: fields.name.trim(),
          website_url: fields.website_url.trim(),
          logo_url: fields.logo_url,
          about: fields.about,
          contact_email: fields.contact_email,
          delivery_info: fields.delivery_info,
        };
        setSelected(created);
        setNotice('Store created. You can upload its image now.');
      } else {
        setNotice('Store updated.');
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save store.');
    } finally {
      setBusy(false);
    }
  }

  async function saveLogo(url: string | null) {
    if (!selected) throw new Error('Create the store before adding its image.');
    const response = await fetch(`/api/admin/stores/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fields.name.trim(),
        website: fields.website_url.trim(),
        about: (fields.about ?? '').trim() || null,
        contact_email: (fields.contact_email ?? '').trim() || null,
        delivery_info: (fields.delivery_info ?? '').trim() || null,
        logo_url: url,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to save store image.');
    setFields((current) => ({ ...current, logo_url: url }));
    setSelected((current) => current ? { ...current, logo_url: url } : current);
    router.refresh();
  }

  async function removeLogo() {
    if (!selected || !fields.logo_url || !window.confirm(`Remove the image for ${selected.name}?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const oldUrl = fields.logo_url;
      await saveLogo(null);
      const cleanupError = oldUrl ? await removeCatalogImage(oldUrl) : null;
      setNotice(cleanupError ? `Store image removed, but the stored file could not be deleted: ${cleanupError}` : 'Store image removed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove store image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
      <ul className="divide-y divide-milevo-border rounded-md border border-milevo-border">
        {stores.length ? stores.map((store) => (
          <li key={store.id}>
            <button type="button" onClick={() => choose(store)}
              className="flex min-h-[68px] w-full items-center justify-between gap-4 p-3 text-left hover:bg-milevo-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{store.name}</span>
                <span className="mt-1 block truncate text-xs text-milevo-muted">{store.website_url}</span>
              </span>
              <span className="text-xs font-semibold text-milevo-primary">Edit</span>
            </button>
          </li>
        )) : <li className="p-6 text-center text-sm text-milevo-muted">No stores yet.</li>}
      </ul>
      <form onSubmit={save} className="h-fit space-y-3 rounded-md border border-milevo-border bg-white p-4">
        <h2 className="font-display text-lg font-bold">{selected ? 'Edit store' : 'Add store'}</h2>
        <Field label="Store name" value={fields.name} required maxLength={120} onChange={(name) => setFields({ ...fields, name })} />
        <Field label="Website URL" value={fields.website_url} required type="url" maxLength={2048} onChange={(website_url) => setFields({ ...fields, website_url })} />
        {selected && (
          <div className="space-y-2 rounded-md border border-milevo-border p-3">
            <CatalogImageUploader
              entity="stores"
              entityId={selected.id}
              label="Store image"
              currentUrl={fields.logo_url}
              onUploaded={saveLogo}
            />
            {fields.logo_url && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void removeLogo()}>
                Remove store image
              </Button>
            )}
          </div>
        )}
        <Field label="Contact email" value={fields.contact_email ?? ''} type="email" maxLength={254} onChange={(contact_email) => setFields({ ...fields, contact_email })} />
        <label className="block text-sm font-medium">About
          <textarea value={fields.about ?? ''} maxLength={5000} rows={3}
            onChange={(event) => setFields({ ...fields, about: event.target.value })}
            className="mt-1 w-full rounded-md border border-milevo-border bg-white p-3 text-sm" />
        </label>
        <label className="block text-sm font-medium">Delivery information
          <textarea value={fields.delivery_info ?? ''} maxLength={2000} rows={2}
            onChange={(event) => setFields({ ...fields, delivery_info: event.target.value })}
            className="mt-1 w-full rounded-md border border-milevo-border bg-white p-3 text-sm" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && <p role="status" className="text-sm text-milevo-success">{notice}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={busy} loadingText="Saving…">{selected ? 'Save changes' : 'Create store'}</Button>
          {selected && <Button type="button" variant="secondary" disabled={busy} onClick={() => choose(null)}>New</Button>}
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, maxLength, required = false, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium">{label}
      <input type={type} value={value} maxLength={maxLength} required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm" />
    </label>
  );
}
