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

export function MerchantFeedUploadForm({ stores }: { stores: { id: string; name: string }[] }) {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!storeId || !file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set('storeId', storeId);
      form.set('file', file);
      const response = await fetch('/api/merchant/feed-import', { method: 'POST', body: form });
      const payload = await response.json() as ImportResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Feed import failed.');
      setResult(payload);
      setFile(null);
      formElement.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Feed import failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 rounded-md border border-milevo-border p-4">
      <h2 className="text-lg font-semibold">Upload product and offer feed</h2>
      <p className="mt-1 text-sm text-milevo-muted">
        CSV import creates or updates products, prices, source-currency observations, and stock from your retailer feed.
      </p>
      {stores.length === 0 ? (
        <p className="mt-3 text-sm text-milevo-muted">A Milevo administrator must link a store to your account before you can import offers.</p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-sm font-medium">
            Store
            <select required value={storeId} onChange={(event) => setStoreId(event.target.value)}
              className="mt-1 block w-full rounded-sm border border-milevo-border bg-white p-2.5">
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          <label className="flex-1 text-sm font-medium">
            CSV file (max 5 MB, 5,000 rows)
            <input required type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-sm border border-milevo-border p-2" />
          </label>
          <Button type="submit" disabled={loading || stores.length === 0} loading={loading} loadingText="Importing…">
            Import feed
          </Button>
        </form>
      )}
      <p className="mt-2 text-xs text-milevo-muted">
        Required columns: product_id, sku, title, price, currency, stock_quantity, category. Optional: product_url.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div role="status" className="mt-4 rounded-sm border border-milevo-border bg-milevo-bg p-3">
          <p className="font-semibold capitalize">{result.status}: {result.productsReceived} rows read</p>
          <p className="mt-1 text-sm">{result.productsCreated} products created · {result.productsUpdated} updated</p>
          {Object.entries(result.rates).filter(([currency]) => currency !== 'GHS').map(([currency, rate]) => (
            <p key={currency} className="mt-1 text-xs text-milevo-muted">
              1 {currency} = {formatGHS(rate)} GHS{result.fxRateAt ? ` as of ${new Date(result.fxRateAt).toLocaleString()}` : ''}
            </p>
          ))}
          {result.errors.length > 0 && (
            <ul className="mt-3 max-h-48 list-inside list-disc overflow-auto text-xs text-red-700">
              {result.errors.map((item, index) => <li key={`${item.line}-${index}`}>Line {item.line} ({item.sku || 'no SKU'}): {item.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
