'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { CatalogImageUploader } from '@/components/admin/CatalogImageUploader';

export type ManagedProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  gtin: string | null;
  mpn: string | null;
  category_id: string;
  brand_id: string | null;
  images: { id: string; url: string; alt_text: string | null; position: number }[];
};

type Option = { id: string; name: string };
type ProductFields = Pick<ManagedProduct, 'name' | 'description' | 'gtin' | 'mpn' | 'category_id' | 'brand_id'>;
const emptyFields: ProductFields = { name: '', description: '', gtin: '', mpn: '', category_id: '', brand_id: null };

export function ProductManager({
  products,
  categories,
  brands,
}: {
  products: ManagedProduct[];
  categories: Option[];
  brands: Option[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  const [fields, setFields] = useState<ProductFields>(emptyFields);
  const [images, setImages] = useState<ManagedProduct['images']>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? products.filter((product) =>
      `${product.name} ${product.slug} ${product.gtin ?? ''} ${product.mpn ?? ''}`.toLocaleLowerCase().includes(needle),
    ) : products;
  }, [products, query]);

  function editProduct(product: ManagedProduct | null) {
    setSelected(product);
    setFields(product ? {
      name: product.name,
      description: product.description ?? '',
      gtin: product.gtin ?? '',
      mpn: product.mpn ?? '',
      category_id: product.category_id,
      brand_id: product.brand_id,
    } : { ...emptyFields, category_id: categories[0]?.id ?? '' });
    setImages(product?.images ?? []);
    setError('');
    setNotice('');
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...fields,
        description: fields.description?.trim() || null,
        gtin: fields.gtin?.trim() || null,
        mpn: fields.mpn?.trim() || null,
      };
      const response = await fetch(selected ? `/api/admin/products/${selected.id}` : '/api/admin/products', {
        method: selected ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save product.');
      setNotice(selected ? 'Product updated.' : 'Product created.');
      if (!selected) {
        setSelected({ ...payload, id: result.product.id, slug: result.product.slug, images: [] });
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save product.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct() {
    if (!selected || !window.confirm(`Delete “${selected.name}”? Its variants, offers, and price history will also be deleted.`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${selected.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to delete product.');
      editProduct(null);
      setNotice(result.warning ?? 'Product deleted.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete product.');
    } finally {
      setBusy(false);
    }
  }

  async function addImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await saveImageRecord(imageUrl, imageAlt.trim() || null);
      setImageUrl('');
      setImageAlt('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add image.');
    } finally {
      setBusy(false);
    }
  }

  async function saveImageRecord(url: string, altText: string | null) {
    if (!selected) throw new Error('Save the product before adding an image.');
    const response = await fetch(`/api/admin/products/${selected.id}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, alt_text: altText }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to add image.');
    setImages((current) => [...current, result.image]);
    router.refresh();
  }

  async function removeImage(imageId: string) {
    if (!selected || !window.confirm('Remove this product image?')) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${selected.id}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to remove image.');
      setImages((current) => current.filter((image) => image.id !== imageId));
      if (result.warning) setNotice(result.warning);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label className="sr-only" htmlFor="product-search">Search products</label>
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-milevo-muted" />
            <input id="product-search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products" className="min-h-touch w-full rounded-md border border-milevo-border bg-white pl-10 pr-3 text-sm" />
          </div>
          <Button variant="secondary" onClick={() => editProduct(null)}><Icon name="package" size={16} className="mr-2" /> Add product</Button>
        </div>
        {filtered.length ? (
          <ul className="divide-y divide-milevo-border rounded-md border border-milevo-border">
            {filtered.map((product) => (
              <li key={product.id}>
                <button type="button" onClick={() => editProduct(product)}
                  className="flex min-h-[68px] w-full items-center justify-between gap-4 p-3 text-left transition-colors hover:bg-milevo-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{product.name}</span>
                    <span className="mt-1 block truncate text-xs text-milevo-muted">{product.slug} · {product.images.length} images</span>
                  </span>
                  <Icon name="chevron-right" size={18} className="text-milevo-muted" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-milevo-border p-8 text-center text-sm text-milevo-muted">
            {query ? 'No matching products.' : 'No products yet. Add the first catalog product.'}
          </div>
        )}
      </div>

      <section className="h-fit rounded-md border border-milevo-border bg-white p-4">
        <h2 className="mb-4 font-display text-lg font-bold">{selected ? 'Edit product' : 'New product'}</h2>
        {categories.length === 0 ? (
          <p className="rounded-md bg-milevo-bg p-3 text-sm text-milevo-muted">Create a category before adding products. Existing product categories are managed through the feed import.</p>
        ) : (
          <form onSubmit={saveProduct} className="space-y-3">
            <Field label="Product name" value={fields.name} maxLength={180} required onChange={(name) => setFields({ ...fields, name })} />
            <label className="block text-sm font-medium">Category
              <select value={fields.category_id} required onChange={(event) => setFields({ ...fields, category_id: event.target.value })}
                className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm">
                <option value="" disabled>Select category</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Brand
              <select value={fields.brand_id ?? ''} onChange={(event) => setFields({ ...fields, brand_id: event.target.value || null })}
                className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm">
                <option value="">No brand</option>
                {brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Description
              <textarea value={fields.description ?? ''} maxLength={10000} rows={3}
                onChange={(event) => setFields({ ...fields, description: event.target.value })}
                className="mt-1 w-full rounded-md border border-milevo-border bg-white p-3 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="GTIN / barcode" value={fields.gtin ?? ''} maxLength={64} onChange={(gtin) => setFields({ ...fields, gtin })} />
              <Field label="MPN" value={fields.mpn ?? ''} maxLength={120} onChange={(mpn) => setFields({ ...fields, mpn })} />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {notice && <p role="status" className="text-sm text-milevo-success">{notice}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" loading={busy} loadingText="Saving…">{selected ? 'Save changes' : 'Create product'}</Button>
              {selected && <Button type="button" variant="secondary" disabled={busy} onClick={deleteProduct}>Delete product</Button>}
              {selected && <Button type="button" variant="ghost" disabled={busy} onClick={() => editProduct(null)}>New</Button>}
            </div>
          </form>
        )}

        {selected && (
          <div className="mt-6 border-t border-milevo-border pt-4">
            <h3 className="mb-1 text-sm font-semibold">Product images</h3>
            <p className="mb-3 text-xs text-milevo-muted">Upload an image or add a publicly accessible HTTP(S) image URL.</p>
            {images.length > 0 && (
              <ul className="mb-3 space-y-2">
                {images.map((image) => (
                  <li key={image.id} className="flex items-center gap-2 rounded-md bg-milevo-bg p-2 text-xs">
                    <Image src={image.url} alt={image.alt_text || 'Product image'} width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded border border-milevo-border object-contain" />
                    <a href={image.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-milevo-primary underline">{image.alt_text || image.url}</a>
                    <button type="button" aria-label={`Remove image ${image.alt_text || image.url}`} disabled={busy}
                      onClick={() => void removeImage(image.id)} className="flex h-8 w-8 items-center justify-center rounded text-milevo-muted hover:bg-milevo-border">
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <CatalogImageUploader
              entity="products"
              entityId={selected.id}
              label="Upload an image"
              onUploaded={(url) => saveImageRecord(url, imageAlt.trim() || null)}
            />
            <form onSubmit={addImage} className="space-y-2">
              <p className="text-xs text-milevo-muted">Or add an image URL:</p>
              <Field label="Image URL" value={imageUrl} type="url" maxLength={2048} required onChange={setImageUrl} />
              <Field label="Alt text" value={imageAlt} maxLength={250} onChange={setImageAlt} />
              <Button type="submit" variant="secondary" loading={busy} loadingText="Adding image…">Add image URL</Button>
            </form>
          </div>
        )}
      </section>
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
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label htmlFor={id} className="block text-sm font-medium">{label}
      <input id={id} type={type} value={value} maxLength={maxLength} required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm" />
    </label>
  );
}
