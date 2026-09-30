export interface RetailerPriceObservation {
  sourcePrice: number | null | undefined;
  sourceCurrency: string | null | undefined;
  convertedPrice: number;
}

export interface RetailerPriceDrop {
  previousConvertedPrice: number;
  sourceDropPercent: number;
  displayedDropPercent: number;
}

export function convertPriceToGhs(sourcePrice: number, rateToGhs: number): number {
  if (!Number.isFinite(sourcePrice) || sourcePrice <= 0) {
    throw new Error('Source price must be a positive finite amount.');
  }
  if (!Number.isFinite(rateToGhs) || rateToGhs <= 0) {
    throw new Error('Exchange rate must be a positive finite amount.');
  }
  return Math.round(sourcePrice * rateToGhs * 100) / 100;
}

export function findRetailerPriceDrop(
  current: RetailerPriceObservation,
  previous: RetailerPriceObservation,
  minimumPercent = 5,
): RetailerPriceDrop | null {
  if (
    !Number.isFinite(current.sourcePrice)
    || !Number.isFinite(previous.sourcePrice)
    || !current.sourcePrice
    || !previous.sourcePrice
    || !current.sourceCurrency
    || current.sourceCurrency.toUpperCase() !== previous.sourceCurrency?.toUpperCase()
    || !Number.isFinite(current.convertedPrice)
    || !Number.isFinite(previous.convertedPrice)
    || previous.convertedPrice <= current.convertedPrice
  ) {
    return null;
  }

  const sourceDropPercent = ((previous.sourcePrice - current.sourcePrice) / previous.sourcePrice) * 100;
  const displayedDropPercent = ((previous.convertedPrice - current.convertedPrice) / previous.convertedPrice) * 100;
  if (sourceDropPercent < minimumPercent || displayedDropPercent < minimumPercent) return null;

  return {
    previousConvertedPrice: previous.convertedPrice,
    sourceDropPercent,
    displayedDropPercent,
  };
}
