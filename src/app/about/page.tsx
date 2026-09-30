import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-2xl mb-4">About Milevo</h1>
      <p className="mb-4">
        Milevo helps people in Ghana find products, compare prices across stores,
        and see where to shop — before they spend a cedi. We don&apos;t sell
        anything ourselves and we don&apos;t process payments; every purchase
        happens on the retailer&apos;s own site.
      </p>
      <p className="mb-4">
        We built Milevo because the same product can cost noticeably different
        amounts from one store to the next, and most shoppers only ever see one
        price at a time. Comparing prices, checking history, and reading store
        reviews before you click through should be quick and obvious.
      </p>
      <p>
        Some retailer links may be affiliate links, and Milevo may receive
        compensation from qualifying actions. See our <a href="/terms" className="text-milevo-primary font-semibold">terms</a> for
        more information.
      </p>
    </div>
  );
}
