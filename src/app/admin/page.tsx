import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Admin Overview' };

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [users, merchants, products, clicks, matches, reviews, reports] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('merchants').select('store_id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('product_matches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('problem_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const metrics = [
    [count(users.count, users.error, 'users'), 'Total users'],
    [count(merchants.count, merchants.error, 'merchants'), 'Active merchants'],
    [count(products.count, products.error, 'products'), 'Master products'],
    [count(clicks.count, clicks.error, 'affiliate clicks'), 'Clicks (30 days)'],
  ];
  const pendingMatches = count(matches.count, matches.error, 'pending matches');
  const pendingReviews = count(reviews.count, reviews.error, 'pending reviews');
  const pendingReports = count(reports.count, reports.error, 'pending problem reports');

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Overview</h1></div>
      <div className="p-4">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map(([value, label]) => (
            <div key={label} className="rounded-md border border-milevo-border p-4">
              <div className="text-2xl font-extrabold">{value}</div>
              <div className="mt-1 text-xs text-milevo-muted">{label}</div>
            </div>
          ))}
        </div>
        <h2 className="mb-3 text-lg font-semibold">Needs attention</h2>
        <div className="flex justify-between border-b border-milevo-border py-2 text-sm">
          <span>Product matches awaiting review</span>
          <Link href="/admin/matching" className="inline-flex items-center gap-1 font-semibold text-milevo-primary">{pendingMatches} pending <Icon name="arrow-right" size={16} /></Link>
        </div>
        <div className="flex justify-between border-b border-milevo-border py-2 text-sm">
          <span>Reviews awaiting moderation</span>
          <Link href="/admin/reviews" className="inline-flex items-center gap-1 font-semibold text-milevo-primary">{pendingReviews} pending <Icon name="arrow-right" size={16} /></Link>
        </div>
        <div className="flex justify-between border-b border-milevo-border py-2 text-sm">
          <span>Problem reports awaiting review</span>
          <Link href="/admin/reports" className="inline-flex items-center gap-1 font-semibold text-milevo-primary">{pendingReports} pending <Icon name="arrow-right" size={16} /></Link>
        </div>
        <div className="flex justify-between border-b border-milevo-border py-2 text-sm">
          <span>Merchant feeds</span>
          <Link href="/admin/feeds" className="inline-flex items-center gap-1 font-semibold text-milevo-primary">View feed health <Icon name="arrow-right" size={16} /></Link>
        </div>
      </div>
    </div>
  );
}

function count(value: number | null, error: { message: string } | null, label: string) {
  if (error) throw new Error(`Unable to load ${label}: ${error.message}`);
  return value ?? 0;
}
