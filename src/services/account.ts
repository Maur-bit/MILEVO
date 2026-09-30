import { createClient } from '@/lib/supabase/client';
import type { PriceAlert, ProductSummary } from '@/types';
import { selectFreshAlertOffer } from '@/lib/alert-evaluation';
import { isAuthSessionMissingError } from '@/lib/auth-error';

const LS = {
  saved: 'milevo_saved_products',
  alerts: 'milevo_price_alerts',
  recent: 'milevo_recently_viewed',
};

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Please sign in to use this feature.');
    this.name = 'AuthenticationRequiredError';
  }
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

async function currentUserId(required = false): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await createClient().auth.getUser();
  if (error && !isAuthSessionMissingError(error)) throw error;
  if (!data.user && required) throw new AuthenticationRequiredError();
  return data.user?.id ?? null;
}

async function productIdForSlug(slug: string) {
  const { data, error } = await createClient()
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('That product is no longer available.');
  return data.id;
}

async function loadCatalog(): Promise<ProductSummary[]> {
  const response = await fetch('/api/catalog?view=search', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load products for your account.');
  const result = (await response.json()) as { data: ProductSummary[] };
  return result.data;
}

export async function isSaved(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured) return readLS<string[]>(LS.saved, []).includes(slug);
  const userId = await currentUserId();
  if (!userId) return false;
  const productId = await productIdForSlug(slug);
  const { data, error } = await createClient()
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleSaved(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const saved = readLS<string[]>(LS.saved, []);
    const index = saved.indexOf(slug);
    if (index >= 0) saved.splice(index, 1);
    else saved.push(slug);
    writeLS(LS.saved, saved);
    return index < 0;
  }

  const userId = await currentUserId(true);
  if (!userId) throw new AuthenticationRequiredError();
  const productId = await productIdForSlug(slug);
  const supabase = createClient();
  const { data: existing, error: selectError } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from('favorites').insert({ user_id: userId, product_id: productId });
  if (error) throw error;
  return true;
}

export async function getSavedProducts(): Promise<ProductSummary[]> {
  if (!isSupabaseConfigured) {
    const saved = new Set(readLS<string[]>(LS.saved, []));
    return (await loadCatalog()).filter((product) => saved.has(product.slug));
  }

  const userId = await currentUserId();
  if (!userId) return [];
  const { data, error } = await createClient()
    .from('favorites')
    .select('products(slug)')
    .eq('user_id', userId);
  if (error) throw error;
  const slugs = new Set(
    (data ?? []).flatMap((row) => {
      const product = row.products as { slug: string } | { slug: string }[] | null;
      const related = Array.isArray(product) ? product[0] : product;
      return related ? [related.slug] : [];
    }),
  );
  return (await loadCatalog()).filter((product) => slugs.has(product.slug));
}

export async function createPriceAlert(slug: string, targetPrice: number, selectedVariantId?: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const alerts = readLS<PriceAlert[]>(LS.alerts, []);
    alerts.push({ slug, targetPrice, createdAt: new Date().toISOString(), active: true });
    writeLS(LS.alerts, alerts);
    return;
  }

  const userId = await currentUserId(true);
  if (!userId) throw new AuthenticationRequiredError();
  const supabase = createClient();
  const productId = await productIdForSlug(slug);
  const { data, error: variantError } = await supabase
    .from('product_variants')
    .select('id, offers(id, current_price, last_checked_at, availability)')
    .eq('product_id', productId);
  if (variantError) throw variantError;
  const variants = (data ?? []) as {
    id: string;
    offers: { id: string; current_price: number | string; last_checked_at: string; availability: import('@/types').OfferAvailability | null }[] | null;
  }[];
  const readyVariants = variants.flatMap((variant) => {
    if (selectedVariantId && variant.id !== selectedVariantId) return [];
    const selection = selectFreshAlertOffer((variant.offers ?? []).map((offer) => ({
      id: offer.id,
      currentPrice: Number(offer.current_price),
      lastCheckedAt: offer.last_checked_at,
      availability: offer.availability,
    })));
    return selection.status === 'ready'
      ? [{ id: variant.id, price: selection.offer.currentPrice }]
      : [];
  }).sort((left, right) => left.price - right.price);
  const variant = readyVariants[0];
  if (!variant) throw new Error('This product variant has no fresh, known, in-stock offers for a price alert.');
  const { error } = await supabase.from('price_alerts').insert({
    user_id: userId,
    product_variant_id: variant.id,
    target_price: targetPrice,
  });
  if (error) throw error;
}

export async function getPriceAlerts(): Promise<(PriceAlert & { product: ProductSummary | null })[]> {
  if (!isSupabaseConfigured) {
    const products = await loadCatalog();
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    return readLS<PriceAlert[]>(LS.alerts, []).map((alert) => ({
      ...alert,
      product: bySlug.get(alert.slug) ?? null,
    }));
  }

  const userId = await currentUserId();
  if (!userId) return [];
  const { data, error } = await createClient()
    .from('price_alerts')
    .select('id, target_price, is_active, created_at, product_variants(products(slug))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const productBySlug = new Map((await loadCatalog()).map((product) => [product.slug, product]));
  return (data ?? []).flatMap((row) => {
    const variantRelation = row.product_variants as
      | { products: { slug: string } | { slug: string }[] | null }
      | { products: { slug: string } | { slug: string }[] | null }[]
      | null;
    const variant = Array.isArray(variantRelation) ? variantRelation[0] : variantRelation;
    const productRelation = variant?.products;
    const productRow = Array.isArray(productRelation) ? productRelation[0] : productRelation;
    if (!productRow) return [];
    return [{
      id: row.id,
      slug: productRow.slug,
      targetPrice: Number(row.target_price),
      createdAt: row.created_at,
      active: row.is_active,
      product: productBySlug.get(productRow.slug) ?? null,
    }];
  });
}

export async function removePriceAlert(id: string | number): Promise<void> {
  if (!isSupabaseConfigured) {
    const alerts = readLS<PriceAlert[]>(LS.alerts, []);
    alerts.splice(Number(id), 1);
    writeLS(LS.alerts, alerts);
    return;
  }
  const userId = await currentUserId(true);
  if (!userId) throw new AuthenticationRequiredError();
  const { error } = await createClient().from('price_alerts').delete().eq('id', String(id)).eq('user_id', userId);
  if (error) throw error;
}

export async function recordRecentlyViewed(slug: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const recent = readLS<string[]>(LS.recent, []).filter((item) => item !== slug);
    recent.unshift(slug);
    writeLS(LS.recent, recent.slice(0, 12));
    return;
  }

  const userId = await currentUserId();
  if (!userId) return;
  const productId = await productIdForSlug(slug);
  const { error } = await createClient().from('recently_viewed').upsert(
    { user_id: userId, product_id: productId, viewed_at: new Date().toISOString() },
    { onConflict: 'user_id,product_id' },
  );
  if (error) throw error;
}

export async function getRecentlyViewed(): Promise<ProductSummary[]> {
  if (!isSupabaseConfigured) {
    const recent = readLS<string[]>(LS.recent, []);
    const products = await loadCatalog();
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    return recent.map((slug) => bySlug.get(slug)).filter((product): product is ProductSummary => Boolean(product));
  }

  const userId = await currentUserId();
  if (!userId) return [];
  const { data, error } = await createClient()
    .from('recently_viewed')
    .select('products(slug), viewed_at')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  const slugs = (data ?? []).flatMap((row) => {
    const product = row.products as { slug: string } | { slug: string }[] | null;
    const related = Array.isArray(product) ? product[0] : product;
    return related ? [related.slug] : [];
  });
  const products = await loadCatalog();
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs.map((slug) => bySlug.get(slug)).filter((product): product is ProductSummary => Boolean(product));
}
