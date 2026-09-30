import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { MerchantApplicationQueue } from './MerchantApplicationQueue';

export const metadata: Metadata = { title: 'Merchant Applications' };

export default async function MerchantApplicationsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('merchant_applications')
    .select('id, store_name, website_url, contact_name, contact_email, details, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Unable to load merchant applications: ${error.message}`);
  return <MerchantApplicationQueue applications={data ?? []} />;
}
