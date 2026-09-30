import Link from 'next/link';
import { formatGHS } from '@/lib/utils';
import { Rating } from './Rating';
import { Badge } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback';
import type { DealProduct, ProductSummary } from '@/types';

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/product/${product.slug}`} className="group flex w-full min-w-0 flex-col rounded-2xl border border-milevo-border bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_12px_30px_-24px_rgba(20,20,20,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary dark:bg-white/[0.03] sm:p-4">
      <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-milevo-bg text-milevo-muted dark:bg-white/5">
        <Icon name="package" size={32} />
        {product.images?.[0] && <ImageWithFallback src={product.images[0].url} alt={product.images[0].altText || product.name} fill unoptimized sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 240px" className="object-contain p-3 transition-transform duration-300 group-hover:scale-105" />}
      </div>
      <div className="text-xs uppercase tracking-wide text-milevo-muted">{product.brand}</div>
      <div className="my-1 min-h-10 line-clamp-2 text-sm font-semibold leading-snug">{product.name}</div>
      <Rating value={product.rating} count={product.reviewCount} />
      <div className="mt-auto pt-3">
        {product.stores > 0 ? (
          <>
            <div className="text-lg font-extrabold">{formatGHS(product.price)}</div>
            {product.priceVariant && <div className="mt-1 line-clamp-1 text-xs text-milevo-muted">Variant: {product.priceVariant}</div>}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-milevo-muted">
              <Icon name="store" size={13} />
              {product.stores} {product.stores === 1 ? 'store' : 'stores'} with in-stock offers
            </div>
          </>
        ) : <div className="text-sm font-semibold text-milevo-muted">No in-stock offers currently</div>}
      </div>
    </Link>
  );
}

export function DealCard({ product }: { product: DealProduct }) {
  return (
    <Link href={`/product/${product.slug}`} className="group flex w-full min-w-0 flex-col rounded-2xl border border-milevo-border bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_12px_30px_-24px_rgba(20,20,20,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary dark:bg-white/[0.03] sm:p-4">
      <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-milevo-bg text-milevo-muted dark:bg-white/5">
        <Icon name="package" size={32} />
        {product.images?.[0] && <ImageWithFallback src={product.images[0].url} alt={product.images[0].altText || product.name} fill unoptimized sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 240px" className="object-contain p-3 transition-transform duration-300 group-hover:scale-105" />}
      </div>
      <Badge variant="primary" className="mb-2 inline-flex w-fit items-center gap-1 rounded-full"><Icon name="arrow-down" size={14} /> {product.pct}% lower</Badge>
      <div className="text-xs uppercase tracking-wide text-milevo-muted">{product.brand}</div>
      <div className="my-1 min-h-10 line-clamp-2 text-sm font-semibold leading-snug">{product.name}</div>
      <Rating value={product.rating} count={product.reviewCount} />
      <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-extrabold sm:text-lg">{formatGHS(product.price)}</span>
          <span className="text-xs text-milevo-muted line-through">{formatGHS(product.was)}</span>
        </div>
        {product.priceVariant && <div className="mt-1 line-clamp-1 text-xs text-milevo-muted">Variant: {product.priceVariant}</div>}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-milevo-muted">
          <Icon name="store" size={13} />
          {product.stores} {product.stores === 1 ? 'store' : 'stores'} to compare
        </div>
      </div>
    </Link>
  );
}
