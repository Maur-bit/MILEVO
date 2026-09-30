import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Help' };

const FAQS = [
  { q: 'Does Milevo sell products directly?', a: 'No. Milevo compares prices and links you to the retailer\u2019s own website, where they handle payment, delivery, and returns.' },
  { q: 'Why do prices sometimes change after I click through?', a: 'Retailers update their own prices and stock independently of Milevo. We show when each price was last checked, but the retailer\u2019s site is always the final word.' },
  { q: 'How does the price history chart work?', a: 'It reflects the lowest offer we\u2019ve recorded each day for that product, not any single store\u2019s internal pricing history.' },
  { q: 'Do I need an account to compare prices?', a: 'No — search and comparison are open to everyone. An account is only needed to save products, set price alerts, or leave reviews.' },
  { q: 'How do I stop a price alert?', a: 'Go to Account \u2192 Price alerts and remove it from there.' },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-2xl mb-6">Help</h1>
      {FAQS.map((f) => (
        <div key={f.q} className="border-b border-milevo-border py-4">
          <h2 className="font-semibold mb-1">{f.q}</h2>
          <p className="text-sm text-milevo-muted">{f.a}</p>
        </div>
      ))}
    </div>
  );
}
