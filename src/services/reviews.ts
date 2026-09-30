import { PRODUCT_REVIEWS } from '@/data/seedData';
import { AuthenticationRequiredError } from '@/services/account';
import { createClient } from '@/lib/supabase/client';
import { isAuthSessionMissingError } from '@/lib/auth-error';
import type { ProductReview } from '@/types';

const LS_KEY = 'milevo_reviews';
const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

type StoredReview = ProductReview & { slug: string };

function readLS(): StoredReview[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as StoredReview[];
  } catch {
    return [];
  }
}

function writeLS(value: StoredReview[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(value));
}

export async function getProductReviews(slug: string): Promise<ProductReview[]> {
  if (!isSupabaseConfigured) {
    const seeded = (PRODUCT_REVIEWS[slug] || []).map((review) => ({ ...review }));
    return [...readLS().filter((review) => review.slug === slug), ...seeded];
  }

  const supabase = createClient();
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) return [];

  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating, title, body, source, created_at')
    .eq('product_id', product.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((review) => ({
    rating: review.rating,
    title: review.title ?? '',
    body: review.body ?? '',
    verified: review.source === 'verified_purchase',
    date: review.created_at.slice(0, 10),
  }));
}

export async function submitProductReview(
  slug: string,
  input: { rating: number; title: string; body: string },
): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = readLS();
    all.push({ slug, ...input, verified: false, date: new Date().toISOString().slice(0, 10) });
    writeLS(all);
    return;
  }

  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw authError;
  if (!auth.user) throw new AuthenticationRequiredError();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) throw new Error('That product is no longer available.');

  const { error } = await supabase.from('product_reviews').insert({
    product_id: product.id,
    user_id: auth.user.id,
    rating: input.rating,
    title: input.title,
    body: input.body,
  });
  if (error) throw error;
}

export async function getMyReviews(): Promise<StoredReview[]> {
  if (!isSupabaseConfigured) return readLS();
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw authError;
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating, title, body, source, created_at, products(slug)')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).flatMap((review) => {
    const product = review.products as { slug: string } | { slug: string }[] | null;
    const related = Array.isArray(product) ? product[0] : product;
    if (!related) return [];
    return [{
      slug: related.slug,
      rating: review.rating,
      title: review.title ?? '',
      body: review.body ?? '',
      verified: review.source === 'verified_purchase',
      date: review.created_at.slice(0, 10),
    }];
  });
}
