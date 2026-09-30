'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProduct, useProductOffers, usePriceHistory, useRelatedProducts } from '@/hooks/useProducts';
import { useFavorite } from '@/hooks/useFavorite';
import { formatGHS, stars } from '@/lib/utils';
import { OfferCard } from '@/components/product/OfferCard';
import { PriceHistoryChart } from '@/components/product/PriceHistoryChart';
import { SpecificationTable, ProductGallery } from '@/components/product/ProductDetails';
import { ReviewSummary, ReviewCard, WriteReviewModal } from '@/components/product/Reviews';
import { ProductCard } from '@/components/product/ProductCard';
import { PriceAlertModal } from '@/components/product/PriceAlertModal';
import { Button } from '@/components/ui/Button';
import { getProductReviews } from '@/services/reviews';
import { recordRecentlyViewed } from '@/services/account';
import type { ProductReview } from '@/types';
import { captureError } from '@/lib/monitoring';
import { Skeleton } from '@/components/shared/States';
import { Icon } from '@/components/ui/Icon';
import { bestKnownOfferId } from '@/lib/offer-freshness';

export function ProductClient({ slug }: { slug: string }) {
  const productQuery = useProduct(slug);
  const offersQuery = useProductOffers(slug);
  const { data: product } = productQuery;
  const offers = offersQuery.data ?? [];
  const bestOfferId = bestKnownOfferId(offers);
  const [rangeDays, setRangeDays] = useState(90);
  const historyQuery = usePriceHistory(slug, rangeDays);
  const relatedQuery = useRelatedProducts(slug);
  const history = historyQuery.data ?? [];
  const related = relatedQuery.data ?? [];
  const { saved, toggle, error: favoriteError, loading: favoriteLoading } = useFavorite(slug);
  const [alertOpen, setAlertOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewError, setReviewError] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const refreshReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      setReviews(await getProductReviews(slug));
      setReviewError(false);
    } catch (error) {
      captureError(error);
      setReviewError(true);
    } finally {
      setReviewsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    recordRecentlyViewed(slug).catch(captureError);
  }, [slug]);
  useEffect(() => {
    void refreshReviews();
  }, [refreshReviews]);

  if (productQuery.isLoading) {
    return (
      <div className="space-y-4 p-4" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading product…</span>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="aspect-square max-h-80" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (productQuery.isError) {
    return (
      <div role="alert" className="p-10 text-center">
        <p className="mb-3 text-red-600">Unable to load this product right now.</p>
        <Button variant="secondary" onClick={() => void productQuery.refetch()}>Try again</Button>
      </div>
    );
  }
  if (!product) return <div className="p-10 text-center text-milevo-muted">Product not found.</div>;

  return (
    <div className="pb-24">
      <div className="px-4 pt-3 text-xs text-milevo-muted">
        <Link href="/">Home</Link> / {product.category} / {product.name}
      </div>

      <section className="p-4"><ProductGallery key={product.slug} alt={product.name} images={product.images} /></section>

      <section className="px-4 pb-4">
        <div className="text-xs uppercase tracking-wide text-milevo-muted">{product.brand}</div>
        <h1 className="font-display text-2xl my-1">{product.name}</h1>
        <div className="text-sm text-milevo-muted"><span className="text-milevo-primary">{stars(product.rating)}</span> {product.rating} · {product.reviewCount} reviews</div>
        <div className="flex items-baseline gap-3 my-3">
          {product.stores > 0 ? (
            <>
              <span className="text-3xl font-extrabold">{formatGHS(product.price)}</span>
              <span className="text-sm text-milevo-muted">from {product.stores} stores</span>
            </>
          ) : (
            <span className="text-sm text-milevo-muted">No live offers are available right now.</span>
          )}
        </div>
      </section>

      <section className="flex gap-2 px-4 pb-4">
        <Button
          onClick={toggle}
          aria-label={favoriteLoading ? 'Updating saved product' : saved ? 'Remove from saved' : 'Save product'}
          aria-pressed={saved}
          loading={favoriteLoading}
          disabled={favoriteLoading}
          variant="secondary"
          size="icon"
          className={`shrink-0 p-0 ${saved ? 'border-milevo-primary text-milevo-primary' : 'border-milevo-border'}`}
        >
          <Icon name="heart" size={20} filled={saved} />
        </Button>
        <Button className="w-full" onClick={() => setAlertOpen(true)}>Set price alert</Button>
      </section>
      {favoriteError && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{favoriteError}</p>}

      <section id="offers">
        <h2 className="px-4 text-lg font-semibold mb-2">Compare offers</h2>
        <div className="flex flex-col gap-3 px-4 pb-5">
          {offersQuery.isError ? (
            <p role="alert" className="text-sm text-red-600">Unable to load current offers.</p>
          ) : offersQuery.isLoading ? (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading current offers…</span>
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : offers.map((o) => <OfferCard key={o.offerId} offer={o} isBest={o.offerId === bestOfferId} slug={slug} />)}
        </div>
      </section>

      <section className="border-t border-milevo-border px-4 py-4">
        <h2 className="text-lg font-semibold mb-2">Price history</h2>
        <div className="flex gap-2 mb-3">
          {[30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setRangeDays(d)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${rangeDays === d ? 'border-milevo-text bg-milevo-text text-white' : 'border-milevo-border'}`}
            >
              {d} days
            </button>
          ))}
        </div>
        {historyQuery.isError ? (
          <p role="alert" className="text-sm text-red-600">Unable to load price history.</p>
        ) : historyQuery.isLoading ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading price history…</span>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : <PriceHistoryChart data={history} currentPrice={product.stores > 0 ? product.price : null} />}
        <p className="text-xs text-milevo-muted mt-2">Prices and availability may change on the retailer&apos;s website.</p>
      </section>

      <section className="border-t border-milevo-border px-4 py-4">
        <h2 className="text-lg font-semibold mb-2">Specifications</h2>
        <SpecificationTable specs={product.specs} />
      </section>

      <section className="border-t border-milevo-border px-4 py-4">
        <h2 className="text-lg font-semibold mb-2">Reviews</h2>
        {reviewError ? (
          <p role="alert" className="text-sm text-red-600">Unable to load reviews right now.</p>
        ) : reviewsLoading ? (
          <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading reviews…</span>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <ReviewSummary reviews={reviews} fallbackRating={product.rating} />
            <div>{reviews.map((r, i) => <ReviewCard key={i} review={r} />)}</div>
          </>
        )}
        <Button variant="secondary" className="mt-3" onClick={() => setReviewOpen(true)}>Write a review</Button>
      </section>

      {relatedQuery.isError && (
        <p role="alert" className="border-t border-milevo-border px-4 py-3 text-sm text-red-600">
          Related products could not be loaded.
        </p>
      )}

      {related.length > 0 && (
        <section className="border-t border-milevo-border px-4 py-4">
          <h2 className="text-lg font-semibold mb-3">Related products</h2>
          <div className="card-row">{related.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
        </section>
      )}

      <div className="fixed bottom-[64px] left-0 right-0 z-20 border-t border-milevo-border bg-white p-3 md:hidden">
        <a href="#offers"><Button className="w-full">Compare {product.stores} offers</Button></a>
      </div>

      <PriceAlertModal
        open={alertOpen}
        onOpenChange={setAlertOpen}
        slug={slug}
        currentPrice={product.price}
        variantId={product.priceVariantId}
        variantLabel={product.priceVariant}
      />
      <WriteReviewModal open={reviewOpen} onOpenChange={setReviewOpen} slug={slug} onSubmitted={refreshReviews} />
    </div>
  );
}
