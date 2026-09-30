// src/data/seedData.ts
// DEMO DATA — clearly separated from production logic (see Part 18 of the
// migration brief). services/*.ts read from here today; swapping to real
// Supabase queries later means changing services/*.ts only, not callers.

import type { Category, FilterDef, Product, PricePoint, Store } from '@/types';

export const CATEGORIES: Category[] = [
  { slug: 'phones', name: 'Phones', icon: 'smartphone' },
  { slug: 'laptops', name: 'Laptops', icon: 'laptop' },
  { slug: 'tvs', name: 'TVs', icon: 'tv' },
  { slug: 'headphones', name: 'Headphones', icon: 'headphones' },
];

export const FILTERS_BY_CATEGORY: Record<string, FilterDef[]> = {
  phones: [
    { key: 'brand', label: 'Brand', type: 'enum', options: ['Apple', 'Samsung', 'Google'] },
    { key: 'storage', label: 'Storage', type: 'enum', options: ['128GB', '256GB', '512GB'] },
    { key: 'ram', label: 'RAM', type: 'enum', options: ['6GB', '8GB', '12GB'] },
    { key: 'condition', label: 'Condition', type: 'enum', options: ['new', 'used', 'refurbished'] },
    { key: 'price', label: 'Price', type: 'range' },
  ],
  laptops: [
    { key: 'brand', label: 'Brand', type: 'enum', options: ['Apple', 'Dell', 'HP'] },
    { key: 'processor', label: 'Processor', type: 'enum', options: ['Intel i5', 'Intel i7', 'Apple M2'] },
    { key: 'ram', label: 'RAM', type: 'enum', options: ['8GB', '16GB', '32GB'] },
    { key: 'condition', label: 'Condition', type: 'enum', options: ['new', 'used', 'refurbished'] },
    { key: 'price', label: 'Price', type: 'range' },
  ],
  tvs: [
    { key: 'brand', label: 'Brand', type: 'enum', options: ['LG', 'Samsung', 'Sony'] },
    { key: 'screen_size', label: 'Screen size', type: 'enum', options: ['43"', '55"', '65"'] },
    { key: 'price', label: 'Price', type: 'range' },
  ],
  headphones: [
    { key: 'brand', label: 'Brand', type: 'enum', options: ['Apple', 'Sony', 'JBL'] },
    { key: 'price', label: 'Price', type: 'range' },
  ],
};

export const STORES: Record<string, Store> = {
  'jumia-gh': { slug: 'jumia-gh', name: 'Jumia Ghana', rating: 4.4, reviews: 3200, delivery: 'GH₵50, 2-4 days', returns: '7-day return', website: 'https://jumia.com.gh' },
  telefonika: { slug: 'telefonika', name: 'Telefonika', rating: 4.6, reviews: 540, delivery: 'Free, same-day Accra', returns: '14-day return', website: 'https://telefonika.com' },
  'franko-trading': { slug: 'franko-trading', name: 'Franko Trading', rating: 4.3, reviews: 890, delivery: 'GH₵30, 1-3 days', returns: '7-day return', website: 'https://frankotrading.com' },
  'compu-ghana': { slug: 'compu-ghana', name: 'CompuGhana', rating: 4.5, reviews: 410, delivery: 'GH₵40, 2-3 days', returns: '30-day return', website: 'https://compughana.com' },
};

function genHistory(base: number): PricePoint[] {
  const out: PricePoint[] = [];
  let price = base * 1.08;
  for (let i = 90; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    if (i === 20) price = base;
    price += (Math.random() - 0.5) * base * 0.01;
    out.push({ day: day.toISOString().slice(0, 10), price: Math.round(price) });
  }
  return out;
}

export const PRODUCTS: Product[] = [
  {
    id: 'p1', slug: 'iphone-15-128gb-black', category: 'phones', brand: 'Apple',
    name: 'iPhone 15 128GB Black', condition: 'new',
    attrs: { storage: '128GB', ram: '6GB' },
    rating: 4.6, reviewCount: 128,
    specs: { Display: '6.1" Super Retina XDR', Chip: 'A16 Bionic', Storage: '128GB', Camera: '48MP main + 12MP ultra-wide', Battery: 'Up to 20h video' },
    priceHistory: genHistory(8499),
    offers: [
      { store: 'telefonika', price: 8499, delivery: 0, rating: 4.6, inStock: true, lastChecked: '12 minutes ago' },
      { store: 'jumia-gh', price: 8550, delivery: 0, rating: 4.4, inStock: true, lastChecked: '1 hour ago' },
      { store: 'franko-trading', price: 8700, delivery: 30, rating: 4.3, inStock: true, lastChecked: '3 hours ago' },
      { store: 'compu-ghana', price: 8899, delivery: 0, rating: 4.5, inStock: false, lastChecked: '1 day ago' },
    ],
  },
  {
    id: 'p2', slug: 'galaxy-s24-256gb', category: 'phones', brand: 'Samsung',
    name: 'Samsung Galaxy S24 256GB', condition: 'new',
    attrs: { storage: '256GB', ram: '8GB' },
    rating: 4.5, reviewCount: 96,
    specs: { Display: '6.2" Dynamic AMOLED 2X', Chip: 'Snapdragon 8 Gen 3', Storage: '256GB', Camera: '50MP triple camera', Battery: '4000mAh' },
    priceHistory: genHistory(7899),
    offers: [
      { store: 'jumia-gh', price: 7899, delivery: 0, rating: 4.4, inStock: true, lastChecked: '30 minutes ago' },
      { store: 'compu-ghana', price: 8050, delivery: 0, rating: 4.5, inStock: true, lastChecked: '2 hours ago' },
      { store: 'franko-trading', price: 8200, delivery: 30, rating: 4.3, inStock: true, lastChecked: '5 hours ago' },
    ],
  },
  {
    id: 'p3', slug: 'macbook-air-m2', category: 'laptops', brand: 'Apple',
    name: 'MacBook Air M2 13"', condition: 'new',
    attrs: { processor: 'Apple M2', ram: '8GB' },
    rating: 4.8, reviewCount: 64,
    specs: { Display: '13.6" Liquid Retina', Chip: 'Apple M2', RAM: '8GB', Storage: '256GB SSD', Battery: 'Up to 18h' },
    priceHistory: genHistory(15999),
    offers: [
      { store: 'telefonika', price: 15999, delivery: 0, rating: 4.6, inStock: true, lastChecked: '1 hour ago' },
      { store: 'compu-ghana', price: 16299, delivery: 0, rating: 4.5, inStock: true, lastChecked: '4 hours ago' },
      { store: 'jumia-gh', price: 16799, delivery: 50, rating: 4.4, inStock: true, lastChecked: '1 day ago' },
    ],
  },
  {
    id: 'p4', slug: 'dell-xps-13', category: 'laptops', brand: 'Dell',
    name: 'Dell XPS 13', condition: 'new',
    attrs: { processor: 'Intel i7', ram: '16GB' },
    rating: 4.4, reviewCount: 41,
    specs: { Display: '13.4" FHD+', Chip: 'Intel i7-1355U', RAM: '16GB', Storage: '512GB SSD', Battery: 'Up to 12h' },
    priceHistory: genHistory(13500),
    offers: [
      { store: 'compu-ghana', price: 13500, delivery: 0, rating: 4.5, inStock: true, lastChecked: '2 hours ago' },
      { store: 'franko-trading', price: 13899, delivery: 30, rating: 4.3, inStock: true, lastChecked: '6 hours ago' },
    ],
  },
  {
    id: 'p5', slug: 'lg-55-oled', category: 'tvs', brand: 'LG',
    name: 'LG 55" OLED TV', condition: 'new',
    attrs: { screen_size: '55"' },
    rating: 4.7, reviewCount: 88,
    specs: { Screen: '55" OLED 4K', Refresh: '120Hz', HDMI: '4x HDMI 2.1', Smart: 'webOS' },
    priceHistory: genHistory(10999),
    offers: [
      { store: 'jumia-gh', price: 10999, delivery: 100, rating: 4.4, inStock: true, lastChecked: '3 hours ago' },
      { store: 'telefonika', price: 11299, delivery: 0, rating: 4.6, inStock: true, lastChecked: '1 day ago' },
    ],
  },
  {
    id: 'p6', slug: 'airpods-pro-2', category: 'headphones', brand: 'Apple',
    name: 'AirPods Pro (2nd gen)', condition: 'new',
    attrs: {},
    rating: 4.7, reviewCount: 210,
    specs: { Type: 'In-ear, active noise cancelling', Battery: 'Up to 6h (30h with case)', Chip: 'H2' },
    priceHistory: genHistory(1999),
    offers: [
      { store: 'telefonika', price: 1999, delivery: 0, rating: 4.6, inStock: true, lastChecked: '20 minutes ago' },
      { store: 'jumia-gh', price: 2099, delivery: 0, rating: 4.4, inStock: true, lastChecked: '2 hours ago' },
      { store: 'compu-ghana', price: 2199, delivery: 0, rating: 4.5, inStock: true, lastChecked: '1 day ago' },
    ],
  },
];

export const PRODUCT_REVIEWS: Record<string, { rating: number; title: string; body: string; verified: boolean; date: string }[]> = {
  'iphone-15-128gb-black': [
    { rating: 5, title: 'Excellent phone', body: 'Battery life is much better than my old phone and the camera is great in low light.', verified: true, date: '2026-08-14' },
    { rating: 4, title: 'Good but pricey', body: 'Great build quality, wish base storage was higher.', verified: true, date: '2026-07-30' },
  ],
  'galaxy-s24-256gb': [
    { rating: 5, title: 'Screen is stunning', body: 'Bright, sharp, and the AI features are actually useful day to day.', verified: true, date: '2026-08-02' },
  ],
};
