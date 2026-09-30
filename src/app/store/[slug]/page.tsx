import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getStore, getStoreProducts } from '@/services/products';
import { getStoreReviews } from '@/services/stores';
import { ProductCard } from '@/components/product/ProductCard';
import { stars } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { SITE_URL } from '@/lib/site';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return {};
  const description = `Compare products and offers from ${store.name} on Milevo.`;
  return {
    title: store.name,
    description,
    alternates: { canonical: `/store/${store.slug}` },
    openGraph: {
      title: store.name,
      description,
      url: new URL(`/store/${store.slug}`, SITE_URL),
      images: store.logoUrl ? [{ url: store.logoUrl, alt: `${store.name} logo` }] : undefined,
    },
  };
}

export default async function StorePage({ params }: { params: Params }) {
  const { slug } = await params;
  const [store, products, reviews] = await Promise.all([
    getStore(slug),
    getStoreProducts(slug),
    getStoreReviews(slug),
  ]);
  if (!store) notFound();

  return (
    <div>
      <section className="p-4">
        {store.logoUrl ? (
          <Image src={store.logoUrl} alt={`${store.name} logo`} width={56} height={56} unoptimized className="mb-2 h-14 w-14 rounded-full border border-milevo-border bg-milevo-white object-contain" />
        ) : (
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-milevo-bg text-milevo-muted" aria-hidden="true">
            <Icon name="store" size={24} />
          </div>
        )}
        <h1 className="font-display text-2xl">{store.name}</h1>
        <div className="text-sm text-milevo-muted"><span className="text-milevo-primary">{stars(store.rating)}</span> {store.rating} · {store.reviews} reviews</div>
        <a href={store.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-md border border-milevo-border px-4 py-2 text-sm font-semibold hover:bg-milevo-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary">
          Visit store <Icon name="external-link" size={16} />
        </a>
      </section>
      <section className="border-t border-milevo-border p-4">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-milevo-border"><td className="py-2 text-milevo-muted w-2/5">Delivery</td><td className="py-2">{store.delivery}</td></tr>
            <tr><td className="py-2 text-milevo-muted">Returns</td><td className="py-2">{store.returns}</td></tr>
          </tbody>
        </table>
      </section>
      <section className="border-t border-milevo-border p-4">
        <h2 className="text-lg font-semibold mb-3">Products from this store</h2>
        <div className="card-row">{products.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
      </section>
      {reviews.length > 0 && (
        <section className="border-t border-milevo-border p-4">
          <h2 className="text-lg font-semibold mb-3">Customer reviews</h2>
          {reviews.map((review, index) => (
            <div key={`${review.date}-${index}`} className="border-b border-milevo-border py-3">
              <div className="text-milevo-primary">{stars(review.rating)}</div>
              <p className="mt-1 text-sm">{review.body}</p>
              <time className="mt-1 block text-xs text-milevo-muted">{review.date}</time>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
