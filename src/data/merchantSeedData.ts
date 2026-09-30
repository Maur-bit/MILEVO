// src/data/merchantSeedData.ts
// Demo data for the merchant portal. In production this merchant's identity
// comes from the authenticated session (auth.uid() -> store_users -> store_id
// via Supabase Auth), not a hardcoded slug — see lib/supabase/server.ts and
// AUDIT.md's "Auth" row.

export const CURRENT_MERCHANT_STORE = 'telefonika';

export const MERCHANT_PRODUCTS = [
  { sku: 'TF-IP15-128-BLK', name: 'iPhone 15 128GB Black', price: 8499, stock: 42, condition: 'new', lastUpdated: '12 minutes ago', status: 'active' as const },
  { sku: 'TF-MBA-M2-256', name: 'MacBook Air M2 13"', price: 15999, stock: 8, condition: 'new', lastUpdated: '1 hour ago', status: 'active' as const },
  { sku: 'TF-APP2-WHT', name: 'AirPods Pro (2nd gen)', price: 1999, stock: 0, condition: 'new', lastUpdated: '20 minutes ago', status: 'out_of_stock' as const },
  { sku: 'TF-S24-256-GRY', name: 'Galaxy S24 256GB', price: 8050, stock: 15, condition: 'refurbished', lastUpdated: '2 days ago', status: 'active' as const },
];

export const MERCHANT_FEED = {
  feed_url: 'https://telefonika.com/feeds/products.xml',
  format: 'xml',
  update_frequency_minutes: 360,
  is_active: true,
};

export const MERCHANT_FEED_RUNS = [
  { id: 'run-1', status: 'partial' as const, started_at: '2026-09-26T22:04:00Z', products_received: 12842, products_created: 14, products_updated: 8421, products_removed: 6, error_count: 23 },
  { id: 'run-2', status: 'success' as const, started_at: '2026-09-26T16:04:00Z', products_received: 12820, products_created: 3, products_updated: 8200, products_removed: 0, error_count: 0 },
  { id: 'run-3', status: 'failed' as const, started_at: '2026-09-26T10:04:00Z', products_received: 0, products_created: 0, products_updated: 0, products_removed: 0, error_count: 1 },
];

export const MERCHANT_FEED_ERRORS = [
  { sku: 'TF-23452', message: 'Missing price' },
  { sku: 'TF-82145', message: 'Invalid product URL' },
  { sku: 'TF-19281', message: 'Missing product identifier (GTIN/MPN)' },
  { sku: 'TF-82231', message: 'Invalid stock value: "many"' },
];

export const MERCHANT_TOP_PRODUCTS = [
  { name: 'iPhone 15 128GB Black', clicks: 312 },
  { name: 'AirPods Pro (2nd gen)', clicks: 198 },
  { name: 'MacBook Air M2 13"', clicks: 87 },
];
