'use client';

import { useState } from 'react';
import { formatGHS } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ImportResult {
  status: 'success' | 'partial' | 'failed';
  productsReceived: number;
  productsCreated: number;
  productsUpdated: number;
  errors: { line: number; sku: string; message: string }[];
  rates: Record<string, number>;
  fxRateAt: string | null;
}

export function FeedImportForm({ stores }: { stores: { id: string; name: string }[] }) {
  const [storeOptions, setStoreOptions] = useState(stores);
  const [storeId, setStoreId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingStore, setAddingStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeWebsite, setStoreWebsite] = useState('');
  const [storeError, setStoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importFeed = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!storeId || !file) {
      setError('Choose a store and CSV file before importing.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set('storeId', storeId);
      form.set('file', file);
      const response = await fetch('/api/admin/feed-import', { method: 'POST', body: form });
      const payload = await response.json() as ImportResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Feed import failed.');
      setResult(payload);
      setFile(null);
      formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feed import failed.');
    } finally {
      setLoading(false);
    }
  };

  const addStore = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddingStore(true);
    setStoreError(null);
    try {
      const response = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: storeName, website: storeWebsite }),
      });
      const payload = await response.json() as { store?: { id: string; name: string }; error?: string };
      if (!response.ok || !payload.store) throw new Error(payload.error ?? 'Unable to create store.');
      setStoreOptions((current) => [...current, payload.store!]);
      setStoreId(payload.store.id);
      setStoreName('');
      setStoreWebsite('');
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : 'Unable to create store.');
    } finally {
      setAddingStore(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      'product_id,sku,title,price,currency,stock_quantity,category',
      'PROD-1001,SKU-SHIRT-BLK-M,"Classic Cotton T-Shirt - Black / M",19.99,USD,150,"Apparel > Shirts"',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'milevo-feed-template.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="mb-6 rounded-md border border-milevo-border p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Import live product data</h2>
          <p className="mt-1 max-w-2xl text-sm text-milevo-muted">
            Upload a retailer CSV. New prices are converted to GHS using the current live exchange rate.
            Rows without a product URL link to the store homepage.
          </p>
        </div>
        <button type="button" onClick={downloadTemplate} className="text-sm font-semibold text-milevo-primary">
          Download CSV template
        </button>
      </div>

      {storeOptions.length === 0 && (
        <p className="mb-3 text-sm text-milevo-muted">
          No stores yet. Add a retailer below before importing its catalogue.
        </p>
      )}
      <form onSubmit={importFeed} className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 text-sm font-medium">
          Store
          <select
            required
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            className="mt-1 block w-full rounded-sm border border-milevo-border bg-white p-2.5"
          >
            <option value="">Select a store</option>
            {storeOptions.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </label>
        <label className="flex-1 text-sm font-medium">
          CSV file (max 5 MB, 5,000 rows)
          <input
            required
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full rounded-sm border border-milevo-border p-2"
          />
        </label>
        <Button
          type="submit"
          disabled={loading || storeOptions.length === 0}
          loading={loading}
          loadingText="Importing…"
        >
          Import CSV
        </Button>
      </form>

      <p className="mt-2 text-xs text-milevo-muted">
        Required columns: product_id, sku, title, price, currency, stock_quantity, category.
        Optional columns: product_url. Imported records are associated with the selected store.
      </p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-milevo-primary">Add a retailer store</summary>
        <form onSubmit={addStore} className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-sm font-medium">
            Store name
            <input
              required
              maxLength={120}
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5"
            />
          </label>
          <label className="flex-1 text-sm font-medium">
            Store website
            <input
              required
              type="url"
              placeholder="https://store.example"
              value={storeWebsite}
              onChange={(event) => setStoreWebsite(event.target.value)}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5"
            />
          </label>
          <Button
            type="submit"
            disabled={addingStore}
            variant="secondary"
            loading={addingStore}
            loadingText="Adding…"
          >
            Add store
          </Button>
        </form>
        {storeError && <p role="alert" className="mt-2 text-sm text-red-600">{storeError}</p>}
      </details>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div role="status" className="mt-4 rounded-sm border border-milevo-border bg-milevo-bg p-3">
          <p className="font-semibold capitalize">{result.status}: {result.productsReceived} rows read</p>
          <p className="mt-1 text-sm">
            {result.productsCreated} products created · {result.productsUpdated} updated
          </p>
          {Object.entries(result.rates).filter(([currency]) => currency !== 'GHS').map(([currency, rate]) => (
            <p key={currency} className="mt-1 text-xs text-milevo-muted">
              1 {currency} = {formatGHS(rate)} (GHS), captured {result.fxRateAt
                ? new Date(result.fxRateAt).toLocaleString()
                : 'without an external FX rate'}
            </p>
          ))}
          {result.errors.length > 0 && (
            <div className="mt-3 max-h-48 overflow-auto text-sm">
              <p className="mb-1 font-semibold">{result.errors.length} row errors (also saved to feed history)</p>
              {result.errors.slice(0, 20).map((item, index) => (
                <p key={`${item.line}-${index}`} className="text-red-700">
                  Line {item.line}{item.sku ? ` · ${item.sku}` : ''}: {item.message}
                </p>
              ))}
              {result.errors.length > 20 && <p>Showing the first 20 errors.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
