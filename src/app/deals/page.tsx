import type { Metadata } from 'next';
import { getDeals, searchProducts } from '@/services/products';
import { DealCard, ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/shared/States';
import { HomeDataNotice } from '@/components/shared/HomeDataNotice';
import { captureError } from '@/lib/monitoring';

export const metadata: Metadata = { title: 'Deals' };

export default async function DealsPage() {
  const [dealsResult, productsResult] = await Promise.allSettled([
    getDeals(),
    searchProducts({ sort: 'price_low' }),
  ]);
  if (dealsResult.status === 'rejected') captureError(dealsResult.reason, { route: '/deals', source: 'deals' });
  if (productsResult.status === 'rejected') captureError(productsResult.reason, { route: '/deals', source: 'products' });
  const deals = dealsResult.status === 'fulfilled' ? dealsResult.value : [];
  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];

  return (
    <main className="p-4">
      <h1 className="font-display text-xl mb-4">Deals</h1>
      {(dealsResult.status === 'rejected' || productsResult.status === 'rejected') && (
        <HomeDataNotice message="Some deal information couldn’t be loaded. Check your connection and try again." />
      )}
      {dealsResult.status === 'rejected' ? (
        products.length > 0 ? (
          <>
            <EmptyState title="Verified deals are temporarily unavailable." description="These current offers are real catalog listings, not confirmed discounts." />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{products.slice(0, 8).map((product) => <ProductCard key={product.slug} product={product} />)}</div>
          </>
        ) : <EmptyState title="Deals couldn’t be loaded." description="Please try again in a moment." />
      ) : deals.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{deals.map((product) => <DealCard key={product.slug} product={product} />)}</div>
      ) : (
        <>
          <EmptyState title="No qualifying deals right now." description="A discount is shown only when Milevo has enough real price data to support it. Compare current offers below while more history is collected." />
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{products.slice(0, 8).map((product) => <ProductCard key={product.slug} product={product} />)}</div>
          ) : productsResult.status === 'fulfilled' ? (
            <EmptyState title="No current product offers are available." description="Check back after stores have added listings." />
          ) : null}
        </>
      )}
    </main>
  );
}
