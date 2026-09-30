import type { Metadata } from 'next';
import { formatGHS } from '@/lib/utils';
import { getMerchantContext } from '@/services/merchant';

export const metadata: Metadata = { title: 'Merchant Products' };

export default async function MerchantProductsPage() {
  const { supabase, stores } = await getMerchantContext();
  const storeIds = stores.map((store) => store.id);
  const { data, error } = storeIds.length
    ? await supabase
        .from('offers')
        .select('id, merchant_sku, current_price, in_stock, condition, last_checked_at, product_variants(variant_label, products(name))')
        .in('store_id', storeIds)
        .order('last_checked_at', { ascending: false })
    : { data: [], error: null };
  if (error) throw new Error(`Unable to load merchant products: ${error.message}`);

  const products = (data ?? []).map((offer) => {
    const variantRelation = offer.product_variants as
      | { variant_label: string; products: { name: string } | { name: string }[] | null }
      | { variant_label: string; products: { name: string } | { name: string }[] | null }[]
      | null;
    const variant = Array.isArray(variantRelation) ? variantRelation[0] : variantRelation;
    const productRelation = variant?.products;
    const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
    return {
      id: offer.id,
      sku: offer.merchant_sku ?? variant?.variant_label ?? '—',
      name: product?.name ?? 'Unknown product',
      price: Number(offer.current_price),
      stock: offer.in_stock,
      condition: offer.condition,
      checked: offer.last_checked_at,
    };
  });

  return (
    <div>
      <div className="border-b border-milevo-border p-5">
        <h1 className="font-display text-xl">Products</h1>
        <p className="mt-1 text-xs text-milevo-muted">Live offers from your linked stores.</p>
      </div>
      <div className="overflow-x-auto p-4">
        {products.length === 0 ? (
          <p className="py-12 text-center text-sm text-milevo-muted">No products have been imported for your store yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-milevo-muted">
                <th className="p-2">SKU</th><th className="p-2">Product</th><th className="p-2">Price</th>
                <th className="p-2">Stock</th><th className="p-2">Condition</th><th className="p-2">Last checked</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-milevo-border">
                  <td className="p-2 font-mono text-xs">{product.sku}</td>
                  <td className="p-2">{product.name}</td>
                  <td className="p-2">{formatGHS(product.price)}</td>
                  <td className="p-2">{product.stock ? 'In stock' : 'Out of stock'}</td>
                  <td className="p-2 capitalize">{product.condition}</td>
                  <td className="p-2">{new Date(product.checked).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
