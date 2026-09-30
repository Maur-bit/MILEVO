import { isPurchasableAvailability, type OfferAvailability } from './availability.ts';

export interface AlertOfferObservation {
  id: string;
  currentPrice: number;
  lastCheckedAt: string;
  availability: OfferAvailability | null;
}

export type AlertOfferSelection =
  | { status: 'unavailable' }
  | { status: 'unknown' }
  | { status: 'stale' }
  | { status: 'ready'; offer: AlertOfferObservation };

export function selectFreshAlertOffer(
  offers: AlertOfferObservation[],
  now = Date.now(),
  freshForMs = 48 * 60 * 60 * 1000,
): AlertOfferSelection {
  if (offers.length === 0) return { status: 'unavailable' };
  const purchasable = offers.filter((offer) =>
    offer.availability !== null && isPurchasableAvailability(offer.availability),
  );
  if (purchasable.length === 0) {
    return offers.some((offer) => offer.availability === null || offer.availability === 'unknown')
      ? { status: 'unknown' }
      : { status: 'unavailable' };
  }
  const fresh = purchasable.filter((offer) => {
    const checkedAt = Date.parse(offer.lastCheckedAt);
    return Number.isFinite(checkedAt)
      && checkedAt <= now
      && now - checkedAt <= freshForMs
      && Number.isFinite(offer.currentPrice)
      && offer.currentPrice > 0;
  });
  if (fresh.length === 0) return { status: 'stale' };
  return {
    status: 'ready',
    offer: fresh.reduce((lowest, offer) =>
      offer.currentPrice < lowest.currentPrice ? offer : lowest,
    ),
  };
}

export function shouldTriggerPriceAlert(status: string, currentPrice: number, targetPrice: number): boolean {
  return status === 'active'
    && Number.isFinite(currentPrice)
    && currentPrice > 0
    && Number.isFinite(targetPrice)
    && targetPrice > 0
    && currentPrice <= targetPrice;
}
