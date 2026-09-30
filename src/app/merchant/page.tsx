import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { getMerchantContext } from '@/services/merchant';

export const metadata: Metadata = { title: 'Merchant Dashboard' };

export default async function MerchantDashboardPage() {
  const { supabase, stores } = await getMerchantContext();
  const storeIds = stores.map((store) => store.id);
  if (storeIds.length === 0) {
    return (
      <div className="p-6">
        <h1 className="font-display text-xl">Merchant dashboard</h1>
        <p className="mt-2 text-sm text-milevo-muted">No store is linked to this account yet. Ask an administrator to add your store membership.</p>
      </div>
    );
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [offersResult, feedsResult, clicksResult, clickEventsResult] = await Promise.all([
    supabase.from('offers').select('id, in_stock').in('store_id', storeIds),
    supabase
      .from('merchant_feeds')
      .select('id, feed_runs(status, products_received, products_updated, error_count, started_at)')
      .in('store_id', storeIds),
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).in('store_id', storeIds).gte('created_at', since),
    supabase
      .from('affiliate_clicks')
      .select('offers(merchant_sku, product_variants(products(name)))')
      .in('store_id', storeIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);
  if (offersResult.error) throw new Error(`Unable to load merchant offers: ${offersResult.error.message}`);
  if (feedsResult.error) throw new Error(`Unable to load merchant feed history: ${feedsResult.error.message}`);
  if (clicksResult.error) throw new Error(`Unable to load merchant clicks: ${clicksResult.error.message}`);
  if (clickEventsResult.error) throw new Error(`Unable to load merchant product click totals: ${clickEventsResult.error.message}`);

  const runs = (feedsResult.data ?? []).flatMap((feed) => feed.feed_runs ?? [])
    .sort((left, right) => right.started_at.localeCompare(left.started_at));
  const latestRun = runs[0];
  const offers = offersResult.data ?? [];
  const clickTotals = new Map<string, number>();
  for (const event of clickEventsResult.data ?? []) {
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
    clickTotals.set(label, (clickTotals.get(label) ?? 0) + 1);
  }
  const topProducts = [...clickTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
  const metrics = [
    [offers.length, 'Offers'],
    [offers.filter((offer) => offer.in_stock).length, 'In-stock offers'],
    [clicksResult.count ?? 0, 'Clicks (7 days)'],
    [latestRun?.error_count ?? 0, 'Feed errors (latest run)'],
  ];

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Dashboard</h1></div>
      <div className="p-4">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map(([value, label], index) => (
            <div key={label} className={`rounded-md border border-milevo-border p-4 ${index === 3 && Number(value) > 0 ? 'text-milevo-primary' : ''}`}>
              <div className="text-2xl font-extrabold">{value}</div>
              <div className="mt-1 text-xs text-milevo-muted">{label}</div>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-lg font-semibold">Feed health</h2>
        {runs.length === 0 ? (
          <p className="py-5 text-sm text-milevo-muted">No feed imports have run for this store yet.</p>
        ) : (
          <div className="mb-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-milevo-muted"><th className="p-2">Run</th><th className="p-2">Status</th><th className="p-2">Received</th><th className="p-2">Updated</th><th className="p-2">Errors</th></tr></thead>
              <tbody>
                {runs.slice(0, 5).map((run, index) => (
                  <tr key={`${run.started_at}-${index}`} className="border-b border-milevo-border">
                    <td className="p-2">{new Date(run.started_at).toLocaleString()}</td>
                    <td className="capitalize p-2">{run.status}</td>
                    <td className="p-2">{run.products_received?.toLocaleString() ?? 0}</td>
                    <td className="p-2">{run.products_updated?.toLocaleString() ?? 0}</td>
                    <td className="p-2">{run.error_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href="/merchant/feeds" className="inline-flex items-center gap-1 text-sm font-semibold text-milevo-primary">View feed history <Icon name="arrow-right" size={16} /></Link>

        <h2 className="mb-3 mt-6 text-lg font-semibold">Top products by clicks (7 days)</h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-milevo-muted">No tracked product clicks for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {topProducts.map(([name, count]) => (
                <tr key={name} className="border-b border-milevo-border"><td className="p-2">{name}</td><td className="p-2">{count}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
