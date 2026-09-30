import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export { getStore } from './products';

export async function getStoreReviews(slug: string): Promise<{ rating: number; body: string; date: string }[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (storeError) throw new Error(`Unable to load store reviews: ${storeError.message}`);
  if (!store) return [];

  const { data, error } = await supabase
    .from('store_reviews')
    .select('overall_rating, body, created_at')
    .eq('store_id', store.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Unable to load store reviews: ${error.message}`);
  return (data ?? []).map((review) => ({
    rating: review.overall_rating,
    body: review.body ?? '',
    date: review.created_at.slice(0, 10),
  }));
}
