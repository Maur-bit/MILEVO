import type { MetadataRoute } from 'next';
import { searchProducts, getStores } from '@/services/products';
import { SITE_URL } from '@/lib/site';
import { CATEGORIES } from '@/data/seedData';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, stores] = await Promise.all([searchProducts({}), getStores()]);
  const fixedPaths = ['', '/about', '/help', '/contact', '/report', '/privacy', '/terms', '/deals', '/price-drops'];
  return [
    ...fixedPaths.map((path) => ({
      url: new URL(path, SITE_URL).toString(),
      changeFrequency: path === '' ? 'daily' as const : 'monthly' as const,
      priority: path === '' ? 1 : 0.5,
    })),
    ...CATEGORIES.map((category) => ({
      url: new URL(`/category/${category.slug}`, SITE_URL).toString(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...products.map((product) => ({
      url: new URL(`/product/${product.slug}`, SITE_URL).toString(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...stores.map((store) => ({
      url: new URL(`/store/${store.slug}`, SITE_URL).toString(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
