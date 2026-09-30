export type OfferAvailability = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

export function availabilityFromStockQuantity(quantity: number | null | undefined): OfferAvailability {
  if (quantity === null || quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
    return 'unknown';
  }
  if (quantity === 0) return 'out_of_stock';
  return quantity <= 5 ? 'low_stock' : 'in_stock';
}

export function isPurchasableAvailability(availability: OfferAvailability): boolean {
  return availability === 'in_stock' || availability === 'low_stock';
}
