export interface DatedPrice {
  day: string;
  price: number;
}

export interface PriceHistorySummary {
  sufficient: boolean;
  previous: number | null;
  lowest: number | null;
  average: number | null;
  startDay: string | null;
  endDay: string | null;
}

export function summarizePriceHistory(points: DatedPrice[]): PriceHistorySummary {
  if (points.length < 2) {
    return { sufficient: false, previous: null, lowest: null, average: null, startDay: null, endDay: null };
  }
  const ordered = [...points].sort((left, right) => left.day.localeCompare(right.day));
  const prices = ordered.map((point) => point.price);
  return {
    sufficient: true,
    previous: prices[prices.length - 2],
    lowest: Math.min(...prices),
    average: prices.reduce((total, price) => total + price, 0) / prices.length,
    startDay: ordered[0].day,
    endDay: ordered[ordered.length - 1].day,
  };
}
