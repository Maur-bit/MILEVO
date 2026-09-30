import type { Metadata } from 'next';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-2xl">Terms of use (draft)</h1>
      <p className="my-4 rounded-md border border-milevo-border bg-milevo-bg p-3 text-sm">
        This draft describes the current product at a high level. It is not a binding or counsel-reviewed set of terms. The operator must confirm its legal identity, jurisdiction, effective date, user eligibility, dispute process, and other required terms before launch.
      </p>

      <h2 className="mt-6 font-semibold">Comparison service</h2>
      <p className="mt-2 text-sm">
        Milevo provides product discovery and price-comparison information. It does not process checkout or payment in the application. Purchases and order issues are handled by the retailer you choose.
      </p>

      <h2 className="mt-6 font-semibold">Prices, availability, and retailer links</h2>
      <p className="mt-2 text-sm">
        Catalog details, prices, inventory, delivery, and other offer information can be incomplete or out of date. Confirm the final details with the retailer before purchasing. Retailer sites and their purchase terms are separate from Milevo.
      </p>

      <h2 className="mt-6 font-semibold">Affiliate links</h2>
      <p className="mt-2 text-sm">
        Some retailer links may use affiliate tracking, and Milevo may receive compensation if a qualifying action occurs. Link availability and commercial arrangements may vary.
      </p>

      <h2 className="mt-6 font-semibold">Accounts and submitted content</h2>
      <p className="mt-2 text-sm">
        Account features let users save products, create alerts, and submit reviews. Reviews may be moderated before publication. Users should not submit unlawful, abusive, confidential, or sensitive personal information through reviews or problem reports. Users can export their account data or request deletion from My Account; administrator account closure requires another administrator.
      </p>

      <h2 className="mt-6 font-semibold">Contact</h2>
      <p className="mt-2 text-sm">
        {SUPPORT_EMAIL ? <>Questions: <a className="text-milevo-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</> : 'A contact address has not been configured for this deployment.'}
      </p>
    </article>
  );
}
