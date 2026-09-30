'use client';

import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function MerchantClicksChart({ data }: { data: { day: string; clicks: number }[] }) {
  return (
    <div style={{ width: '100%', height: 200 }} className="mb-6">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="day" fontSize={11} stroke="var(--milevo-muted)" />
          <Tooltip />
          <Bar dataKey="clicks" fill="var(--milevo-primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
