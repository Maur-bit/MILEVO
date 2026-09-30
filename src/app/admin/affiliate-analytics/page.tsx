import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AffiliateChart } from './AffiliateChart';

export const metadata: Metadata = { title: 'Affiliate Analytics' };

export default async function AdminAffiliateAnalyticsPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .order('name');
  if (storesError) throw new Error(`Unable to load stores for affiliate analytics: ${storesError.message}`);

  const clicksByStore = await Promise.all((stores ?? []).map(async (store) => {
    const { count, error } = await supabase
      .from('affiliate_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .gte('created_at', since);
    if (error) throw new Error(`Unable to load affiliate clicks for ${store.name}: ${error.message}`);
    return { store: store.name, clicks: count ?? 0 };
  }));

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Affiliate analytics</h1></div>
      <div className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Clicks by store (30 days)</h2>
        <AffiliateChart data={clicksByStore} />
        {clicksByStore.length === 0 ? (
          <p className="py-8 text-center text-sm text-milevo-muted">No stores are configured yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-milevo-muted"><th className="p-2">Store</th><th className="p-2">Clicks (30 days)</th></tr></thead>
            <tbody>
              {clicksByStore.map((item) => (
                <tr key={item.store} className="border-b border-milevo-border">
                  <td className="p-2">{item.store}</td>
                  <td className="p-2">{item.clicks.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-milevo-muted">Conversion and commission figures populate once affiliate networks report back.</p>
      </div>
    </div>
  );
}
