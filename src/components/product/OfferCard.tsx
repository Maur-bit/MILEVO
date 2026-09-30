'use client';

import { formatGHS } from '@/lib/utils';
import { Rating } from './Rating';
import { Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buildGoUrl, trackAffiliateClick } from '@/services/affiliate';
import { track } from '@/lib/analytics';
import Link from 'next/link';
import type { OfferWithStore } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { isPurchasableAvailability } from '@/lib/availability';
import { offerFreshness } from '@/lib/offer-freshness';

const availabilityLabels = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  unknown: 'Availability unknown',
} as const;

export function OfferCard({ offer, isBest, slug }: { offer: OfferWithStore; isBest: boolean; slug: string }) {
  const freshness = offerFreshness(offer.lastChecked);
  const availability = offer.availability ?? (offer.inStock ? 'in_stock' : 'out_of_stock');
  const purchasable = isPurchasableAvailability(availability);
  const handleShop = () => {
    trackAffiliateClick({ slug, store: offer.store });
    track({ name: 'offer_clicked', slug, store: offer.store });
    const url = buildGoUrl(offer.store, offer.offerId, `/product/${slug}`);
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className={`rounded-md border p-4 flex flex-col gap-1 ${isBest ? 'border-milevo-primary bg-orange-50/40' : 'border-milevo-border'}`}>
      {isBest && <Badge variant="primary" className="w-fit">LOWEST KNOWN TOTAL</Badge>}
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/store/${offer.storeInfo.slug}`} className="font-bold">{offer.storeInfo.name}</Link>
          <Rating value={offer.storeInfo.rating} />
        </div>
        <span className={`text-xs font-semibold ${purchasable ? 'text-milevo-success' : 'text-milevo-muted'}`}>
          {availabilityLabels[availability]}
          {availability === 'low_stock' && offer.stockQuantity !== null && offer.stockQuantity !== undefined
            ? ` · ${offer.stockQuantity} left`
            : ''}
        </span>
      </div>
      {offer.variant && <div className="text-xs font-medium text-milevo-muted">Variant: {offer.variant}</div>}
      <div className="text-xl font-extrabold">{formatGHS(offer.price)}</div>
      {offer.sourcePrice !== null && offer.sourcePrice !== undefined && offer.sourceCurrency && (
        <div className="text-xs text-milevo-muted">
          Source price: {offer.sourcePrice} {offer.sourceCurrency}
          {offer.fxRateToGhs && offer.sourceCurrency !== 'GHS' && ` · FX ${offer.fxRateToGhs} GHS per ${offer.sourceCurrency}`}
          {offer.fxRateAt && ` · rate dated ${new Date(offer.fxRateAt).toLocaleString()}`}
          {offer.fxProvider && ` · ${offer.fxProvider}`}
        </div>
      )}
      <div className="text-xs text-milevo-muted">
        {offer.delivery !== null && offer.total !== null
          ? `${offer.delivery === 0 ? 'Free delivery' : `Delivery ${formatGHS(offer.delivery)}`} · Item + delivery ${formatGHS(offer.total)}`
          : 'Delivery fee not listed; total cost may vary.'}
      </div>
      <div className={`text-xs ${freshness.stale ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-milevo-muted'}`}>
        {freshness.label}
      </div>
      <Button onClick={handleShop} disabled={!purchasable} className="mt-2 w-full">
        Shop at {offer.storeInfo.name} <Icon name="arrow-right" size={16} className="ml-1 inline-block" />
      </Button>
    </div>
  );
}
