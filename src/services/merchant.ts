import { createClient } from '@/lib/supabase/server';

export async function getMerchantContext() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Unable to verify merchant session: ${authError.message}`);
  if (!auth.user) throw new Error('A signed-in merchant is required.');

  const { data, error } = await supabase
    .from('store_users')
    .select('store_id, stores(name)')
    .eq('user_id', auth.user.id);
  if (error) throw new Error(`Unable to load merchant stores: ${error.message}`);

  const stores = (data ?? []).map((item) => {
    const relation = item.stores as { name: string } | { name: string }[] | null;
    const store = Array.isArray(relation) ? relation[0] : relation;
    return { id: item.store_id, name: store?.name ?? 'Store' };
  });

  return { supabase, user: auth.user, stores };
}
