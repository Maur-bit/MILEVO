'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface MerchantStore {
  id: string;
  name: string;
  website_url: string;
  about: string | null;
  contact_email: string | null;
  delivery_info: string | null;
  returns_info: string | null;
}

type StoreFields = Omit<MerchantStore, 'id'>;

function fieldsFromStore(store: MerchantStore): StoreFields {
  return {
    name: store.name,
    website_url: store.website_url,
    about: store.about,
    contact_email: store.contact_email,
    delivery_info: store.delivery_info,
    returns_info: store.returns_info,
  };
}

export function MerchantStoreProfileForm({ stores: initialStores }: { stores: MerchantStore[] }) {
  const [stores, setStores] = useState(initialStores);
  const [storeId, setStoreId] = useState(initialStores[0]?.id ?? '');
  const selected = stores.find((store) => store.id === storeId);
  const [fields, setFields] = useState<StoreFields>(() => selected ? fieldsFromStore(selected) : {
    name: '', website_url: '', about: '', contact_email: '', delivery_info: '', returns_info: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) setFields(fieldsFromStore(selected));
  }, [storeId, selected]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/merchant/stores/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: fields.name,
          websiteUrl: fields.website_url,
          about: fields.about ?? '',
          contactEmail: fields.contact_email ?? '',
          deliveryInfo: fields.delivery_info ?? '',
          returnsInfo: fields.returns_info ?? '',
        }),
      });
      const result = await response.json() as { store?: MerchantStore; error?: string };
      if (!response.ok || !result.store) throw new Error(result.error ?? 'Unable to update this store profile.');
      setStores((current) => current.map((store) => store.id === result.store!.id ? result.store! : store));
      setMessage('Store profile updated.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update this store profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {stores.length > 1 && (
        <label className="mb-4 block max-w-md text-sm font-medium">
          Store
          <select value={storeId} onChange={(event) => { setStoreId(event.target.value); setMessage(null); setError(null); }}
            className="mt-1 block w-full rounded-sm border border-milevo-border bg-white p-2.5">
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </label>
      )}
      {selected && (
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <label className="block text-sm font-medium">
            Store name
            <input required minLength={2} maxLength={120} value={fields.name}
              onChange={(event) => setFields((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
          </label>
          <label className="block text-sm font-medium">
            Website
            <input required type="url" maxLength={2048} value={fields.website_url}
              onChange={(event) => setFields((current) => ({ ...current, website_url: event.target.value }))}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
          </label>
          <label className="block text-sm font-medium">
            About the store
            <textarea maxLength={2000} rows={4} value={fields.about ?? ''}
              onChange={(event) => setFields((current) => ({ ...current, about: event.target.value }))}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
          </label>
          <label className="block text-sm font-medium">
            Contact email
            <input type="email" maxLength={254} value={fields.contact_email ?? ''}
              onChange={(event) => setFields((current) => ({ ...current, contact_email: event.target.value }))}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
          </label>
          <label className="block text-sm font-medium">
            Delivery information
            <textarea maxLength={1000} rows={3} value={fields.delivery_info ?? ''}
              onChange={(event) => setFields((current) => ({ ...current, delivery_info: event.target.value }))}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
          </label>
          <label className="block text-sm font-medium">
            Returns information
            <textarea maxLength={1000} rows={3} value={fields.returns_info ?? ''}
              onChange={(event) => setFields((current) => ({ ...current, returns_info: event.target.value }))}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-milevo-success">{message}</p>}
          <Button type="submit" loading={loading} loadingText="Saving profile…">Save store profile</Button>
        </form>
      )}
    </>
  );
}
