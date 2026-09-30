import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { FeedImportForm } from './FeedImportForm';

export const metadata: Metadata = { title: 'Feed Monitoring' };

type FeedRun = { status: string; error_count: number | null; started_at: string };
type FeedRow = {
  id: string;
  format: string;
  is_active: boolean;
  last_run_at: string | null;
  stores: { name: string } | { name: string }[] | null;
  feed_runs: FeedRun[] | null;
};

const statusColor: Record<string, string> = {
  success: 'bg-green-50 text-milevo-success',
  partial: 'bg-orange-50 text-milevo-primary',
  failed: 'bg-red-50 text-red-600',
  running: 'bg-blue-50 text-blue-700',
};

export default async function AdminFeedsPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: stores, error: storesError }] = await Promise.all([
    supabase
      .from('merchant_feeds')
      .select('id, format, is_active, last_run_at, stores(name), feed_runs(status, error_count, started_at)')
      .order('last_run_at', { ascending: false, nullsFirst: true }),
    supabase.from('stores').select('id, name').order('name'),
  ]);
  if (error) throw new Error(`Unable to load merchant feeds: ${error.message}`);
  if (storesError) throw new Error(`Unable to load stores: ${storesError.message}`);

  const feeds = ((data ?? []) as unknown as FeedRow[]).map((feed) => {
    const relation = feed.stores;
    const store = Array.isArray(relation) ? relation[0] : relation;
    const latestRun = [...(feed.feed_runs ?? [])]
      .sort((left, right) => right.started_at.localeCompare(left.started_at))[0];
    return {
      id: feed.id,
      store: store?.name ?? 'Unknown store',
      format: feed.format,
      active: feed.is_active,
      lastRun: latestRun?.started_at ?? feed.last_run_at,
      status: latestRun?.status ?? 'not run',
      errors: latestRun?.error_count ?? 0,
    };
  });

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Feed monitoring</h1></div>
      <div className="overflow-x-auto p-4">
        <FeedImportForm stores={stores ?? []} />
        {feeds.length === 0 ? (
          <p className="py-12 text-center text-sm text-milevo-muted">No merchant feeds have been configured.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-milevo-muted">
                <th className="p-2">Store</th><th className="p-2">Format</th><th className="p-2">Last run</th>
                <th className="p-2">Status</th><th className="p-2">Errors</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((feed) => (
                <tr key={feed.id} className="border-b border-milevo-border">
                  <td className="p-2">{feed.store}{!feed.active && ' · paused'}</td>
                  <td className="p-2 uppercase">{feed.format}</td>
                  <td className="p-2">{feed.lastRun ? new Date(feed.lastRun).toLocaleString() : 'Never'}</td>
                  <td className="p-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[feed.status] ?? 'bg-milevo-bg text-milevo-muted'}`}>
                      {feed.status}
                    </span>
                  </td>
                  <td className="p-2">{feed.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
