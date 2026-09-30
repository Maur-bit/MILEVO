import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ReviewQueue, type ModerationReview } from './ReviewQueue';

export const metadata: Metadata = { title: 'Review Moderation' };

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, rating, title, body, created_at, products(name)')
    .eq('is_approved', false)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Unable to load review moderation queue: ${error.message}`);

  const reviews = (data ?? []).map((review) => {
    const relation = review.products as { name: string } | { name: string }[] | null;
    const product = Array.isArray(relation) ? relation[0] : relation;
    return {
      id: review.id,
      rating: review.rating,
      title: review.title ?? '',
      body: review.body ?? '',
      createdAt: review.created_at,
      productName: product?.name ?? 'Unknown product',
    };
  }) satisfies ModerationReview[];

  return <ReviewQueue initialReviews={reviews} />;
}
