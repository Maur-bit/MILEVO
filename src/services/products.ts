import { PRODUCTS, STORES } from '@/data/seedData';
import { isPurchasableAvailability } from '@/lib/availability';
import { findRetailerPriceDrop } from '@/lib/price-comparison';
import { matchesSearchTerms, matchingVariantIndexes, parseSearchQuery } from '@/lib/search-query';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type {
  OfferAvailability,
  DealProduct,
  Offer,
  OfferWithStore,
  PricePoint,
  Product,
  ProductCondition,
  ProductSummary,
  ProductVariant,
  SearchParamsShape,
  Store,
} from '@/types';

type Relation<T> = T | T[] | null;

interface StoreRow {
  slug: string;
  name: string;
  overall_rating: number | null;
  review_count: number | null;
  logo_url: string | null;
  delivery_info: string | null;
  returns_info: string | null;
  website_url: string;
}

interface OfferRow {
  id: string;
  condition: ProductCondition;
  in_stock: boolean;
  availability: OfferAvailability | null;
  stock_quantity: number | null;
  delivery_fee: number | null;
  current_price: number;
  source_price: number | null;
  source_currency: string | null;
  fx_rate_to_ghs: number | null;
  fx_rate_at: string | null;
  fx_provider: string | null;
  currency: string;
  last_checked_at: string;
  product_url: string;
  stores: Relation<StoreRow>;
}

interface HistoryRow {
  day: string;
  min_price: number;
}

interface OfferPriceRow {
  offer_id: string;
  price: number | string;
  source_price: number | string | null;
  source_currency: string | null;
  recorded_at: string;
}

interface VariantRow {
  id: string;
  variant_label: string;
  offers: OfferRow[] | null;
  price_history?: HistoryRow[] | null;
}

interface AttributeRow {
  value: string;
  category_attributes: Relation<{ key: string; label: string }>;
}

interface CatalogProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brands: Relation<{ name: string }>;
  categories: Relation<{ slug: string }>;
  product_variants: VariantRow[] | null;
  product_attributes: AttributeRow[] | null;
  product_reviews: { rating: number; is_approved: boolean }[] | null;
  product_images: { url: string; alt_text: string | null; position: number }[] | null;
}

function first<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function storeFromRow(row: StoreRow): Store {
  return {
    slug: row.slug,
    name: row.name,
    rating: Number(row.overall_rating ?? 0),
    reviews: row.review_count ?? 0,
    delivery: row.delivery_info ?? 'Contact store for delivery details',
    returns: row.returns_info ?? 'Contact store for return details',
    website: row.website_url,
    logoUrl: row.logo_url,
  };
}

function productSummary(product: Product): ProductSummary {
  const availableOffers = product.offers.filter((offer) => offer.inStock);
  const candidates = availableOffers.length ? availableOffers : product.offers;
  const cheapest = candidates.reduce(
    (min, offer) => (offer.price < min.price ? offer : min),
    candidates[0],
  );
  return {
    ...product,
    price: cheapest?.price ?? 0,
    priceVariant: cheapest?.variant,
    priceVariantId: product.variants?.find((variant) => variant.label === cheapest?.variant)?.id,
    stores: new Set(availableOffers.map((offer) => offer.store)).size,
  };
}

function selectedStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return typeof value === 'string' ? [value] : [];
}

function fromCatalogRow(row: CatalogProductRow): Product {
  const variants = row.product_variants ?? [];
  const productVariants: ProductVariant[] = variants.map((variant) => {
    const offers: Offer[] = (variant.offers ?? []).map((offer) => {
      const storeRow = first(offer.stores);
      const store = storeRow ? storeFromRow(storeRow) : null;
      return {
        store: store?.slug ?? '',
        price: Number(offer.current_price),
        delivery: offer.delivery_fee === null ? null : Number(offer.delivery_fee),
        rating: store?.rating ?? 0,
        inStock: offer.availability !== null
          ? isPurchasableAvailability(offer.availability)
          : false,
        availability: offer.availability ?? 'unknown',
        stockQuantity: offer.stock_quantity,
        lastChecked: offer.last_checked_at,
        sourcePrice: offer.source_price === null ? null : Number(offer.source_price),
        sourceCurrency: offer.source_currency,
        fxRateToGhs: offer.fx_rate_to_ghs === null ? null : Number(offer.fx_rate_to_ghs),
        fxRateAt: offer.fx_rate_at,
        fxProvider: offer.fx_provider,
        currency: offer.currency,
        variant: variant.variant_label,
        offerId: offer.id,
        productUrl: offer.product_url,
        storeInfo: store ?? undefined,
      };
    });
    return {
      id: variant.id,
      label: variant.variant_label,
      offers,
      priceHistory: (variant.price_history ?? [])
        .map((point) => ({ day: point.day, price: Number(point.min_price) }))
        .sort((left, right) => left.day.localeCompare(right.day)),
    };
  });
  const offers = productVariants.flatMap((variant) => variant.offers);

  const historyByDay = new Map<string, number>();
  for (const point of productVariants
    .filter((variant) => variant.offers.length > 0)
    .flatMap((variant) => variant.priceHistory)) {
    const current = historyByDay.get(point.day);
    if (current === undefined || point.price < current) {
      historyByDay.set(point.day, point.price);
    }
  }

  const attributes = (row.product_attributes ?? []).flatMap((attribute) => {
    const definition = first(attribute.category_attributes);
    return definition ? [{ ...definition, value: attribute.value }] : [];
  });
  const reviews = (row.product_reviews ?? []).filter((review) => review.is_approved);
  const brand = first(row.brands);
  const category = first(row.categories);
  const rating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;

  return {
    id: row.id,
    slug: row.slug,
    category: category?.slug ?? '',
    brand: brand?.name ?? '',
    name: row.name,
    images: (row.product_images ?? [])
      .sort((left, right) => left.position - right.position)
      .map((image) => ({ url: image.url, altText: image.alt_text })),
    condition: offers[0]?.condition ?? 'new',
    attrs: Object.fromEntries(attributes.map((attribute) => [attribute.key, attribute.value])),
    rating: Math.round(rating * 10) / 10,
    reviewCount: reviews.length,
    specs: Object.fromEntries(attributes.map((attribute) => [attribute.label, attribute.value])),
    priceHistory: [...historyByDay.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([day, price]) => ({ day, price })),
    offers,
    variants: productVariants,
  };
}

async function getCatalog(options: { withHistory?: boolean; slug?: string } = {}): Promise<Product[]> {
  if (!isSupabaseConfigured()) return PRODUCTS;

  const supabase = await createClient();
  const historySelection = options.withHistory ? ', price_history(day, min_price)' : '';
  const rows: CatalogProductRow[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase
      .from('products')
      .select(`
        id, slug, name, description,
        brands(name),
        categories(slug),
        product_variants(
          id, variant_label,
          offers(
            id, condition, in_stock, availability, stock_quantity, delivery_fee, current_price, currency, source_price, source_currency,
            fx_rate_to_ghs, fx_rate_at, fx_provider, last_checked_at, product_url,
            stores(slug, name, overall_rating, review_count, delivery_info, returns_info, website_url, logo_url)
          )${historySelection}
        ),
        product_attributes(value, category_attributes(key, label)),
        product_reviews(rating, is_approved),
        product_images(url, alt_text, position)
      `)
      .order('name')
      .range(offset, offset + 499);
    if (options.slug) query = query.eq('slug', options.slug);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load the product catalog: ${error.message}`);
    const page = (data ?? []) as unknown as CatalogProductRow[];
    rows.push(...page);
    if (options.slug || page.length < 500) break;
  }

  return rows.map(fromCatalogRow);
}

export async function searchProducts({
  q = '',
  category,
  filters = {},
  sort = 'relevance',
}: SearchParamsShape = {}): Promise<ProductSummary[]> {
  const parsedQuery = parseSearchQuery(q);
  const minimumPrice = Math.max(
    filters.price_min ?? 0,
    parsedQuery.minimumPrice ?? 0,
  );
  const maximumPrice = [filters.price_max, parsedQuery.maximumPrice]
    .filter((value): value is number => value !== undefined)
    .reduce((minimum, value) => Math.min(minimum, value), Number.POSITIVE_INFINITY);
  let results = (await getCatalog())
    .filter((product) => product.offers.length > 0)
    .filter((product) => !category || product.category === category)
    .flatMap((product) => {
      const searchableText = [
        product.name,
        product.brand,
        ...Object.entries(product.attrs).flat(),
        ...(product.variants ?? []).map((variant) => variant.label),
      ].join(' ');
      if (!matchesSearchTerms(searchableText, parsedQuery.terms)) return [];

      const matchingVariants = product.variants ?? [];
      const matchingIndexes = matchingVariantIndexes(
        matchingVariants.map((variant) => variant.label),
        parsedQuery.variantTokens,
      );
      if (parsedQuery.variantTokens.length > 0 && matchingVariants.length > 0 && matchingIndexes.length === 0) return [];
      const selectedVariants = matchingIndexes.map((index) => matchingVariants[index]);
      const selectedOfferIds = new Set(selectedVariants.flatMap((variant) =>
        variant.offers.map((offer) => offer.offerId).filter((id): id is string => Boolean(id)),
      ));
      const scopedProduct = parsedQuery.variantTokens.length > 0 && matchingVariants.length > 0
        ? { ...product, variants: selectedVariants, offers: product.offers.filter((offer) => selectedOfferIds.has(offer.offerId ?? '')) }
        : product;
      return scopedProduct.offers.length > 0 ? [productSummary(scopedProduct)] : [];
    });

  for (const [key, value] of Object.entries(filters)) {
    if (!value || (Array.isArray(value) && value.length === 0)) continue;
    if (key === 'price_min') {
      results = results.filter((product) => product.price >= minimumPrice);
    } else if (key === 'price_max') {
      results = results.filter((product) => product.price <= maximumPrice);
    } else if (key === 'brand') {
      const selected = new Set(selectedStrings(value));
      results = results.filter((product) => selected.has(product.brand));
    } else if (key === 'condition') {
      const selected = new Set(selectedStrings(value));
      results = results.filter((product) => selected.has(product.condition));
    } else {
      const selected = new Set(selectedStrings(value));
      results = results.filter((product) => selected.has(product.attrs[key]));
    }
  }
  if (parsedQuery.minimumPrice !== undefined && filters.price_min === undefined) {
    results = results.filter((product) => product.price >= minimumPrice);
  }
  if (Number.isFinite(maximumPrice) && filters.price_max === undefined) {
    results = results.filter((product) => product.price <= maximumPrice);
  }

  switch (sort) {
    case 'price_low':
      results.sort((left, right) => left.price - right.price);
      break;
    case 'price_high':
      results.sort((left, right) => right.price - left.price);
      break;
    case 'rating':
      results.sort((left, right) => right.rating - left.rating);
      break;
    case 'reviews':
      results.sort((left, right) => right.reviewCount - left.reviewCount);
      break;
  }

  return results;
}

export async function getProduct(slug: string): Promise<ProductSummary | null> {
  const [product] = await getCatalog({ slug });
  return product ? productSummary(product) : null;
}

export async function getProductOffers(slug: string): Promise<OfferWithStore[]> {
  const [product] = await getCatalog({ slug });
  if (!product) return [];

  return product.offers
    .map((offer, index) => ({
      ...offer,
      storeInfo: offer.storeInfo ?? STORES[offer.store],
      total: offer.delivery === null ? null : offer.price + offer.delivery,
      offerId: offer.offerId ?? `demo-${slug}-${index}`,
    }))
    .filter((offer) => Boolean(offer.storeInfo))
    .sort((left, right) =>
      Number(!left.inStock) - Number(!right.inStock)
      || (left.total ?? Number.POSITIVE_INFINITY) - (right.total ?? Number.POSITIVE_INFINITY)
      || left.price - right.price,
    );
}

export async function getPriceHistory(slug: string, rangeDays = 90): Promise<PricePoint[]> {
  if (!isSupabaseConfigured()) {
    const product = PRODUCTS.find((item) => item.slug === slug);
    return product?.priceHistory.slice(-rangeDays) ?? [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('product_variants(offers(id), price_history(day, min_price))')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Unable to load price history: ${error.message}`);
  if (!data) return [];

  const variants = (data as unknown as {
    product_variants: { offers: { id: string }[] | null; price_history: HistoryRow[] | null }[] | null;
  }).product_variants ?? [];
  const byDay = new Map<string, number>();
  for (const point of variants
    .filter((variant) => (variant.offers ?? []).length > 0)
    .flatMap((variant) => variant.price_history ?? [])) {
    const current = byDay.get(point.day);
    if (current === undefined || Number(point.min_price) < current) {
      byDay.set(point.day, Number(point.min_price));
    }
  }
  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-rangeDays)
    .map(([day, price]) => ({ day, price }));
}

export async function getDeals(): Promise<DealProduct[]> {
  if (!isSupabaseConfigured()) return [];

  const products = await getCatalog();
  const now = Date.now();
  const eligibleOffers = products.flatMap((product) =>
    product.offers
      .filter((offer) => {
        const checkedAt = Date.parse(offer.lastChecked);
        return offer.inStock && Number.isFinite(checkedAt) && now - checkedAt <= 24 * 60 * 60 * 1000;
      })
      .map((offer) => ({ product, offer })),
  );
  const observations = await getPreviousOfferObservations(eligibleOffers.map(({ offer }) => offer));
  const candidates = new Map<string, { deal: DealProduct; stores: Set<string> }>();

  for (const { product, offer } of eligibleOffers) {
    if (!offer.offerId) continue;
    const previous = observations.get(offer.offerId);
    if (!previous) continue;
    const drop = findRetailerPriceDrop(
      {
        sourcePrice: offer.sourcePrice,
        sourceCurrency: offer.sourceCurrency,
        convertedPrice: offer.price,
      },
      {
        sourcePrice: previous.source_price === null ? null : Number(previous.source_price),
        sourceCurrency: previous.source_currency,
        convertedPrice: Number(previous.price),
      },
    );
    if (!drop) continue;

    const candidate: DealProduct = {
      ...productSummary({ ...product, offers: [offer] }),
      price: offer.price,
      priceVariant: offer.variant,
      stores: 1,
      was: Math.round(drop.previousConvertedPrice),
      pct: Math.round(drop.displayedDropPercent * 10) / 10,
    };
    const existing = candidates.get(product.slug);
    if (!existing) {
      candidates.set(product.slug, { deal: candidate, stores: new Set([offer.store]) });
    } else {
      existing.stores.add(offer.store);
      if (candidate.pct > existing.deal.pct) existing.deal = candidate;
    }
  }

  return [...candidates.values()]
    .map(({ deal, stores }) => ({ ...deal, stores: stores.size }))
    .sort((left, right) => right.pct - left.pct);
}

async function getPreviousOfferObservations(offers: Offer[]) {
  const currentById = new Map(
    offers.flatMap((offer) => offer.offerId ? [[offer.offerId, offer] as const] : []),
  );
  const offerIds = [...currentById.keys()];
  const previous = new Map<string, OfferPriceRow>();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();

  for (let index = 0; index < offerIds.length; index += 200) {
    const batch = offerIds.slice(index, index + 200);
    let offset = 0;
    while (batch.some((id) => !previous.has(id))) {
      const { data, error } = await supabase
        .from('offer_prices')
        .select('offer_id, price, source_price, source_currency, recorded_at')
        .in('offer_id', batch)
        .gte('recorded_at', cutoff)
        .order('recorded_at', { ascending: false })
        .range(offset, offset + 499);
      if (error) throw new Error(`Unable to load retailer price observations: ${error.message}`);
      const rows = (data ?? []) as OfferPriceRow[];
      if (rows.length === 0) break;

      for (const row of rows) {
        if (previous.has(row.offer_id)) continue;
        const current = currentById.get(row.offer_id);
        if (current && Date.parse(row.recorded_at) < Date.parse(current.lastChecked)) {
          previous.set(row.offer_id, row);
        }
      }
      if (rows.length < 500) break;
      offset += rows.length;
    }
  }

  return previous;
}

export async function getPriceDrops(): Promise<DealProduct[]> {
  return getDeals();
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<ProductSummary[]> {
  const product = (await getCatalog()).find((item) => item.slug === slug);
  if (!product) return [];
  return (await searchProducts({ category: product.category }))
    .filter((item) => item.slug !== slug)
    .slice(0, limit);
}

export async function getStores(): Promise<Store[]> {
  if (!isSupabaseConfigured()) return Object.values(STORES);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stores')
    .select('slug, name, overall_rating, review_count, delivery_info, returns_info, website_url, logo_url')
    .order('name');
  if (error) throw new Error(`Unable to load stores: ${error.message}`);
  return (data ?? []).map((row) => storeFromRow(row as StoreRow));
}

export async function getStore(slug: string): Promise<Store | null> {
  if (!isSupabaseConfigured()) return STORES[slug] ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stores')
    .select('slug, name, overall_rating, review_count, delivery_info, returns_info, website_url, logo_url')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Unable to load store: ${error.message}`);
  return data ? storeFromRow(data as StoreRow) : null;
}

export async function getStoreProducts(slug: string): Promise<ProductSummary[]> {
  return (await getCatalog())
    .filter((product) => product.offers.some((offer) => offer.store === slug))
    .map((product) => {
      const offers = product.offers.filter((offer) => offer.store === slug);
      const storeOffer = offers.reduce((lowest, offer) => (offer.price < lowest.price ? offer : lowest));
      return {
        ...product,
        price: storeOffer.price,
        priceVariant: storeOffer.variant,
        priceVariantId: product.variants?.find((variant) => variant.label === storeOffer.variant)?.id,
        stores: new Set(offers.filter((offer) => offer.inStock).map((offer) => offer.store)).size,
      };
    });
}
