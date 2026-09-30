'use client';

import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function AffiliateChart({ data }: { data: { store: string; clicks: number }[] }) {
  if (data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 220 }} className="mb-6">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="store" fontSize={11} stroke="var(--milevo-muted)" />
          <Tooltip />
          <Bar dataKey="clicks" fill="var(--milevo-primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
