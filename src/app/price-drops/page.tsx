import type { Metadata } from 'next';
import { getPriceDrops, searchProducts } from '@/services/products';
import { DealCard, ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/shared/States';
import { HomeDataNotice } from '@/components/shared/HomeDataNotice';
import { captureError } from '@/lib/monitoring';

export const metadata: Metadata = { title: 'Price Drops' };

export default async function PriceDropsPage() {
  const [dropsResult, productsResult] = await Promise.allSettled([
    getPriceDrops(),
    searchProducts({ sort: 'price_low' }),
  ]);
  if (dropsResult.status === 'rejected') captureError(dropsResult.reason, { route: '/price-drops', source: 'price-drops' });
  if (productsResult.status === 'rejected') captureError(productsResult.reason, { route: '/price-drops', source: 'products' });
  const drops = dropsResult.status === 'fulfilled' ? dropsResult.value : [];
  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];

  return (
    <main className="p-4">
      <h1 className="font-display text-xl mb-4">Price drops</h1>
      {(dropsResult.status === 'rejected' || productsResult.status === 'rejected') && (
        <HomeDataNotice message="Some price-drop information couldn’t be loaded. Check your connection and try again." />
      )}
      {dropsResult.status === 'rejected' ? (
        products.length > 0 ? (
          <>
            <EmptyState title="Price-drop data is temporarily unavailable." description="The listings below are current offers, not confirmed price drops." />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{products.slice(0, 8).map((product) => <ProductCard key={product.slug} product={product} />)}</div>
          </>
        ) : <EmptyState title="Price drops couldn’t be loaded." description="Please try again in a moment." />
      ) : drops.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{drops.map((product) => <DealCard key={product.slug} product={product} />)}</div>
      ) : (
        <>
          <EmptyState title="No qualifying price drops right now." description="Milevo needs current and previous real price observations before it can identify a drop. Compare current offers below in the meantime." />
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
