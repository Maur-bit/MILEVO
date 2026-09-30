import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ProductManager, type ManagedProduct } from './ProductManager';

export const metadata: Metadata = { title: 'Product Management' };

type ImageRecord = { id: string; url: string; alt_text: string | null; position: number };

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [productsResult, categoriesResult, brandsResult, imagesResult] = await Promise.all([
    supabase.from('products')
      .select('id, slug, name, description, gtin, mpn, category_id, brand_id')
      .order('name'),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('product_images').select('id, product_id, url, alt_text, position').order('position'),
  ]);
  if (productsResult.error) throw new Error(`Unable to load products: ${productsResult.error.message}`);
  if (categoriesResult.error) throw new Error(`Unable to load categories: ${categoriesResult.error.message}`);
  if (brandsResult.error) throw new Error(`Unable to load brands: ${brandsResult.error.message}`);
  if (imagesResult.error) throw new Error(`Unable to load product images: ${imagesResult.error.message}`);

  const imagesByProduct = new Map<string, ImageRecord[]>();
  for (const image of imagesResult.data ?? []) {
    const entries = imagesByProduct.get(image.product_id) ?? [];
    entries.push({ id: image.id, url: image.url, alt_text: image.alt_text, position: image.position });
    imagesByProduct.set(image.product_id, entries);
  }
  const products: ManagedProduct[] = (productsResult.data ?? []).map((product) => ({
    ...product,
    images: imagesByProduct.get(product.id) ?? [],
  }));

  return (
    <section>
      <div className="border-b border-milevo-border p-5">
        <h1 className="font-display text-xl font-bold">Product management</h1>
        <p className="mt-1 text-sm text-milevo-muted">Manage catalog details and image URLs used by the storefront.</p>
      </div>
      <ProductManager products={products} categories={categoriesResult.data ?? []} brands={brandsResult.data ?? []} />
    </section>
  );
}
