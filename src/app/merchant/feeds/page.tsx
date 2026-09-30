import type { Metadata } from 'next';
import { getMerchantContext } from '@/services/merchant';
import { MerchantFeedUploadForm } from './MerchantFeedUploadForm';

export const metadata: Metadata = { title: 'Merchant Product Feed' };

export default async function MerchantFeedsPage() {
  const { supabase, stores } = await getMerchantContext();
  const storeIds = stores.map((store) => store.id);
  const { data, error } = storeIds.length
    ? await supabase
        .from('merchant_feeds')
        .select('id, feed_url, format, update_frequency_minutes, is_active, last_run_at, feed_runs(id, status, products_received, products_created, products_updated, error_count, started_at, feed_errors(merchant_sku, error_message))')
        .in('store_id', storeIds)
    : { data: [], error: null };
  if (error) throw new Error(`Unable to load merchant feeds: ${error.message}`);

  const feeds = (data ?? []).map((feed) => {
    const runs = [...(feed.feed_runs ?? [])]
      .sort((left, right) => right.started_at.localeCompare(left.started_at));
    const latest = runs[0];
    return { ...feed, runs, latest };
  });

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Product feeds</h1></div>
      <div className="p-4">
        <MerchantFeedUploadForm stores={stores} />
        {feeds.length === 0 ? (
          <div className="rounded-md border border-milevo-border p-4">
            <h2 className="font-semibold">No feed configured</h2>
            <p className="mt-1 text-sm text-milevo-muted">
              Ask an administrator to add a retailer feed and import its current product catalogue.
            </p>
          </div>
        ) : (
          feeds.map((feed) => (
            <section key={feed.id} className="mb-6 rounded-md border border-milevo-border p-4">
              <h2 className="mb-3 text-lg font-semibold">Feed configuration</h2>
              <table className="mb-6 w-full text-sm">
                <tbody>
                  <tr className="border-b border-milevo-border">
                    <td className="w-1/3 p-2 text-milevo-muted">Source</td>
                    <td className="break-all p-2 font-mono text-xs">
                      {feed.feed_url.startsWith('upload://') ? 'Manual CSV upload' : feed.feed_url}
                    </td>
                  </tr>
                  <tr className="border-b border-milevo-border">
                    <td className="p-2 text-milevo-muted">Format</td><td className="p-2 uppercase">{feed.format}</td>
                  </tr>
                  <tr className="border-b border-milevo-border">
                    <td className="p-2 text-milevo-muted">Update frequency</td>
                    <td className="p-2">{feed.update_frequency_minutes ? `Every ${feed.update_frequency_minutes} minutes` : 'Manual'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-milevo-muted">Status</td>
                    <td className="p-2">{feed.is_active ? 'Active' : 'Paused'}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="mb-3 font-semibold">Run history</h3>
              {feed.runs.length === 0 ? (
                <p className="mb-4 text-sm text-milevo-muted">No imports have run yet.</p>
              ) : (
                <div className="mb-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-milevo-muted">
                        <th className="p-2">Started</th><th className="p-2">Status</th><th className="p-2">Received</th>
                        <th className="p-2">Created</th><th className="p-2">Updated</th><th className="p-2">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feed.runs.slice(0, 10).map((run) => (
                        <tr key={run.id} className="border-b border-milevo-border">
                          <td className="p-2">{new Date(run.started_at).toLocaleString()}</td>
                          <td className="p-2 capitalize">{run.status}</td>
                          <td className="p-2">{run.products_received?.toLocaleString() ?? 0}</td>
                          <td className="p-2">{run.products_created?.toLocaleString() ?? 0}</td>
                          <td className="p-2">{run.products_updated?.toLocaleString() ?? 0}</td>
                          <td className="p-2">{run.error_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {feed.latest && feed.latest.feed_errors?.length > 0 && (
                <>
                  <h3 className="mb-2 font-semibold">Latest run errors</h3>
                  {feed.latest.feed_errors.slice(0, 20).map((item, index) => (
                    <div key={`${item.merchant_sku}-${index}`} className="flex justify-between border-b border-milevo-border py-2 text-sm">
                      <span className="font-mono text-milevo-muted">{item.merchant_sku ?? 'Row'}</span>
                      <span>{item.error_message}</span>
                    </div>
                  ))}
                </>
              )}
            </section>
          ))
        )}
        <p className="mt-4 text-sm text-milevo-muted">Imports are manual. Scheduled feed fetching is not configured.</p>
      </div>
    </div>
  );
}
