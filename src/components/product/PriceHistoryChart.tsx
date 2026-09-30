'use client';

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { formatGHS } from '@/lib/utils';
import type { PricePoint } from '@/types';
import { summarizePriceHistory } from '@/lib/price-history';

export function PriceHistoryChart({ data, currentPrice }: { data: PricePoint[]; currentPrice: number | null }) {
  if (data.length === 0) {
    return <p className="py-8 text-sm text-milevo-muted">Not enough price history yet.</p>;
  }

  const summary = summarizePriceHistory(data);
  if (
    !summary.sufficient
    || summary.previous === null
    || summary.lowest === null
    || summary.average === null
    || summary.startDay === null
    || summary.endDay === null
  ) {
    return <p className="py-8 text-sm text-milevo-muted">Not enough price history yet. At least two dated observations are required.</p>;
  }
  const prices = data.map((point) => point.price);
  const min = summary.lowest;
  const max = Math.max(...prices);

  return (
    <div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="day" hide />
            <YAxis domain={[min * 0.97, max * 1.03]} hide />
            <Tooltip formatter={(value: number) => formatGHS(value)} labelFormatter={(label) => new Date(label).toLocaleDateString()} />
            <Line type="monotone" dataKey="price" stroke="var(--milevo-primary)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-5 mt-3 flex-wrap text-sm">
        <div><span className="block text-xs text-milevo-muted">Current offer</span>{currentPrice === null ? 'Unavailable' : formatGHS(currentPrice)}</div>
        <div><span className="block text-xs text-milevo-muted">Previous observation</span>{formatGHS(summary.previous)}</div>
        <div><span className="block text-xs text-milevo-muted">Historical low</span>{formatGHS(min)}</div>
        <div><span className="block text-xs text-milevo-muted">Historical average</span>{formatGHS(summary.average)}</div>
        <div><span className="block text-xs text-milevo-muted">Highest</span>{formatGHS(max)}</div>
      </div>
      <p className="mt-2 text-xs text-milevo-muted">
        Observations: {new Date(summary.startDay).toLocaleDateString()} – {new Date(summary.endDay).toLocaleDateString()}
      </p>
      <p className="mt-3 text-xs text-milevo-muted">
        GHS history can reflect exchange-rate changes. Deal labels require a retailer price drop in the same source currency.
      </p>
    </div>
  );
}
