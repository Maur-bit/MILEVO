import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { StoreManager } from './StoreManager';

export const metadata: Metadata = { title: 'Store Management' };

export default async function AdminStoresPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('stores')
    .select('id, slug, name, website_url, logo_url, about, contact_email, delivery_info')
    .order('name');
  if (error) throw new Error(`Unable to load stores: ${error.message}`);
  return (
    <section>
      <div className="border-b border-milevo-border p-5">
        <h1 className="font-display text-xl font-bold">Store management</h1>
        <p className="mt-1 text-sm text-milevo-muted">Maintain retailer details shown alongside live offers.</p>
      </div>
      <StoreManager stores={data ?? []} />
    </section>
  );
}
