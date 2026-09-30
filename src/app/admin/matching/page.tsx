import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { MatchingQueue, type MatchQueueItem } from './MatchingQueue';

export const metadata: Metadata = { title: 'Product Matching' };

export default async function AdminMatchingPage() {
  const supabase = await createClient();
  const { data: matches, error: matchesError } = await supabase
    .from('product_matches')
    .select('id, candidate_offer_id, suggested_product_id, confidence, created_at, products(name)')
    .eq('status', 'pending')
    .order('created_at');
  if (matchesError) throw new Error(`Unable to load product matches: ${matchesError.message}`);

  const offerIds = (matches ?? []).map((match) => match.candidate_offer_id);
  const { data: offers, error: offersError } = offerIds.length
    ? await supabase
        .from('offers')
        .select('id, current_price, stores(name), product_variants(products(name))')
        .in('id', offerIds)
    : { data: [], error: null };
  if (offersError) throw new Error(`Unable to load candidate offers: ${offersError.message}`);

  const offerById = new Map((offers ?? []).map((offer) => {
    const storeRelation = offer.stores as { name: string } | { name: string }[] | null;
    const store = Array.isArray(storeRelation) ? storeRelation[0] : storeRelation;
    const variantRelation = offer.product_variants as
      | { products: { name: string } | { name: string }[] | null }
      | { products: { name: string } | { name: string }[] | null }[]
      | null;
    const variant = Array.isArray(variantRelation) ? variantRelation[0] : variantRelation;
    const productRelation = variant?.products;
    const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
    return [offer.id, {
      storeName: store?.name ?? 'Unknown store',
      productName: product?.name ?? 'Unknown product',
      price: Number(offer.current_price),
    }] as const;
  }));

  const queue = (matches ?? []).map((match) => {
    const relation = match.products as { name: string } | { name: string }[] | null;
    const suggested = Array.isArray(relation) ? relation[0] : relation;
    const candidate = offerById.get(match.candidate_offer_id);
    return {
      id: match.id,
      confidence: Number(match.confidence ?? 0),
      candidateName: candidate?.productName ?? 'Unknown product',
      storeName: candidate?.storeName ?? 'Unknown store',
      price: Number(candidate?.price ?? 0),
      suggestedName: suggested?.name ?? null,
    };
  }) satisfies MatchQueueItem[];

  return <MatchingQueue initialMatches={queue} />;
}
