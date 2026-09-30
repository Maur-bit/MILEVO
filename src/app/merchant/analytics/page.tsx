import type { Metadata } from 'next';
import { getMerchantContext } from '@/services/merchant';
import { MerchantClicksChart } from './MerchantClicksChart';

export const metadata: Metadata = { title: 'Merchant Analytics' };

export default async function MerchantAnalyticsPage() {
  const { supabase, stores } = await getMerchantContext();
  const storeIds = stores.map((store) => store.id);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 13);
  const since = sinceDate.toISOString();

  const { data, error } = storeIds.length
    ? await supabase
        .from('affiliate_clicks')
        .select('created_at, offers(merchant_sku, product_variants(products(name)))')
        .in('store_id', storeIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000)
    : { data: [], error: null };
  if (error) throw new Error(`Unable to load merchant analytics: ${error.message}`);

  const dailyCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    dailyCounts.set(day.toISOString().slice(5, 10), 0);
  }

  for (const event of data ?? []) {
    const day = event.created_at.slice(5, 10);
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);

    const offerRelation = event.offers as
      | { merchant_sku: string | null; product_variants: { products: { name: string } | { name: string }[] | null } | { products: { name: string } | { name: string }[] | null }[] | null }
      | { merchant_sku: string | null; product_variants: { products: { name: string } | { name: string }[] | null } | { products: { name: string } | { name: string }[] | null }[] | null }[]
      | null;
    const offer = Array.isArray(offerRelation) ? offerRelation[0] : offerRelation;
    const variantRelation = offer?.product_variants;
    const variant = Array.isArray(variantRelation) ? variantRelation[0] : variantRelation;
    const productRelation = variant?.products;
    const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
    const label = product?.name ?? offer?.merchant_sku ?? 'Unknown product';
    productCounts.set(label, (productCounts.get(label) ?? 0) + 1);
  }

  const topProducts = [...productCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([name, clicks]) => ({ name, clicks }));

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Analytics</h1></div>
      <div className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Outbound clicks — last 14 days</h2>
        {data?.length === 5000 && (
          <p className="mb-3 text-xs text-milevo-muted">Showing the latest 5,000 click events.</p>
        )}
        <MerchantClicksChart data={[...dailyCounts].map(([day, clicks]) => ({ day, clicks }))} />
        <h2 className="mb-3 text-lg font-semibold">Top products by clicks</h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-milevo-muted">No tracked offer clicks for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {topProducts.map((item) => (
                <tr key={item.name} className="border-b border-milevo-border">
                  <td className="p-2">{item.name}</td><td className="p-2">{item.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
