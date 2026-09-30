// src/types/index.ts
// Mirrors database/schema.sql. Keeping these in sync with the Postgres
// schema is what lets services/*.ts swap from seed data to real Supabase
// queries without changing anything that imports them.

export type ProductCondition = 'new' | 'used' | 'refurbished';
export type OfferAvailability = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

export interface Offer {
  store: string; // store slug
  price: number;
  delivery: number | null;
  rating: number;
  inStock: boolean;
  availability?: OfferAvailability;
  stockQuantity?: number | null;
  lastChecked: string;
  sourcePrice?: number | null;
  sourceCurrency?: string | null;
  fxRateToGhs?: number | null;
  fxRateAt?: string | null;
  fxProvider?: string | null;
  currency?: string;
  variant?: string;
  condition?: ProductCondition;
  offerId?: string;
  productUrl?: string;
  storeInfo?: Store;
}

export interface OfferWithStore extends Offer {
  storeInfo: Store;
  total: number | null;
  offerId: string;
}

export interface PricePoint {
  day: string; // ISO date
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  category: string;
  brand: string;
  name: string;
  condition: ProductCondition;
  attrs: Record<string, string>;
  rating: number;
  reviewCount: number;
  specs: Record<string, string>;
  priceHistory: PricePoint[];
  offers: Offer[];
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface ProductVariant {
  id: string;
  label: string;
  offers: Offer[];
  priceHistory: PricePoint[];
}

export interface ProductImage {
  url: string;
  altText: string | null;
}

export interface ProductSummary extends Product {
  price: number; // lowest current offer, preferring in-stock offers
  stores: number; // unique stores with an in-stock offer
  priceVariant?: string;
  priceVariantId?: string;
}

export interface Store {
  slug: string;
  name: string;
  rating: number;
  reviews: number;
  delivery: string;
  returns: string;
  website: string;
  logoUrl?: string | null;
}

export interface Category {
  slug: string;
  name: string;
  icon: import('@/components/ui/Icon').IconName;
}

export type FilterFieldType = 'enum' | 'range';

export interface FilterDef {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: string[];
}

export interface SearchFilters {
  brand?: string[];
  condition?: string[];
  price_min?: number;
  price_max?: number;
  [key: string]: string[] | number | undefined;
}

export type SortOption = 'relevance' | 'price_low' | 'price_high' | 'rating' | 'reviews';

export interface SearchParamsShape {
  q?: string;
  category?: string;
  filters?: SearchFilters;
  sort?: SortOption;
}

export interface ProductReview {
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  date: string;
}

export interface PriceAlert {
  id?: string;
  slug: string;
  targetPrice: number;
  createdAt: string;
  active: boolean;
}

export interface DealProduct extends ProductSummary {
  was: number;
  pct: number;
}
