import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct } from '@/services/products';
import { ProductClient } from './ProductClient';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `Compare prices for ${product.name} across ${product.stores} stores in Ghana.`,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name, description: `Compare prices for ${product.name} across ${product.stores} stores.` },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: product.brand,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount },
    offers: { '@type': 'AggregateOffer', priceCurrency: 'GHS', lowPrice: product.price, offerCount: product.stores },
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductClient slug={slug} />
    </>
  );
}
