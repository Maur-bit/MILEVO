import type { Metadata } from 'next';
import { getMerchantContext } from '@/services/merchant';
import { MerchantStoreProfileForm } from './MerchantStoreProfileForm';

export const metadata: Metadata = { title: 'Merchant Store Profile' };

export default async function MerchantStoreProfilePage() {
  const { supabase, stores } = await getMerchantContext();
  const storeIds = stores.map((store) => store.id);
  const { data, error } = storeIds.length
    ? await supabase
        .from('stores')
        .select('id, name, website_url, about, contact_email, delivery_info, returns_info')
        .in('id', storeIds)
        .order('name')
    : { data: [], error: null };
  if (error) throw new Error(`Unable to load merchant store profile: ${error.message}`);

  return (
    <section>
      <div className="border-b border-milevo-border p-5">
        <h1 className="font-display text-xl">Store profile</h1>
        <p className="mt-1 text-sm text-milevo-muted">Manage public store details for stores linked to your account.</p>
      </div>
      <div className="p-4">
        {data?.length ? <MerchantStoreProfileForm stores={data} /> : (
          <p className="rounded-md border border-milevo-border p-4 text-sm text-milevo-muted">
            An administrator must link a store to your merchant account before you can edit its profile.
          </p>
        )}
      </div>
    </section>
  );
}
