import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/merchant/', '/account/', '/api/', '/login', '/register'],
    },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  };
}
