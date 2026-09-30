import type { Metadata } from 'next';
import { PrivacySettingsButton } from '@/components/privacy/PrivacySettingsButton';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-2xl">Privacy notice (draft)</h1>
      <p className="my-4 rounded-md border border-milevo-border bg-milevo-bg p-3 text-sm">
        This is a factual draft based on the current application code, not legal advice or a finalized privacy notice. The operating entity, contact details, legal basis, jurisdiction, retention periods, and processor agreements must be confirmed by Milevo and reviewed by qualified counsel before launch.
      </p>

      <h2 className="mt-6 font-semibold">Information handled by the service</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>When you create an account, Supabase Auth receives your email address and password. Milevo does not receive or store your plaintext password.</li>
        <li>If you use account features, the service stores saved products, price alerts, recently viewed products, and reviews associated with your account.</li>
        <li>Problem reports contain the category and details you submit, the report form page path, and an optional email address if you request a reply. Do not submit passwords or payment information.</li>
        <li>When you follow a retailer offer link, the redirect may record its offer, product, store, click identifier, source page, timestamp, and a mobile/desktop classification. The click identifier and offer identifier can be included in a configured affiliate tracking URL.</li>
        <li>Basic technical data may be processed by the hosting, authentication, database, and security services used to operate the site. Deployment-specific logs and retention need confirmation.</li>
      </ul>

      <h2 className="mt-6 font-semibold">Optional analytics and error monitoring</h2>
      <p className="mt-2 text-sm">
        PostHog analytics and browser-side Sentry error monitoring are initialized only when configured and after you allow optional analytics. Depending on the events and authenticated actions, analytics may include product/store identifiers, event details, and your account identifier and email. Session replay is disabled. Server-side error reporting is configured separately and may still process operational errors when Sentry is enabled.
      </p>
      <div className="mt-3"><PrivacySettingsButton /></div>

      <h2 className="mt-6 font-semibold">Storage and choices</h2>
      <p className="mt-2 text-sm">
        The site uses browser storage for theme preference and, where needed, local fallback features. Supabase authentication uses its configured session storage/cookies. The optional analytics preference is saved in this browser and as a first-party preference cookie. Clearing site data clears these local choices; you can reopen the settings using the footer link.
      </p>

      <h2 className="mt-6 font-semibold">Services and external destinations</h2>
      <p className="mt-2 text-sm">
        The application integrates with Supabase for authentication and catalog/account data; optional PostHog and Sentry integrations; an exchange-rate provider when administrators import foreign-currency product feeds; and retailers or affiliate networks when you follow an offer. Their handling is governed by their own terms and notices. The exact providers and deployment settings must be confirmed by the operator.
      </p>

      <h2 className="mt-6 font-semibold">Contact and retention</h2>
      <p className="mt-2 text-sm">
        Signed-in users can export their profile, saved products, alerts, recently viewed products, and reviews as JSON, or request permanent account deletion from My Account. Deletion removes account-owned records and submitted reviews, anonymizes account-linked affiliate clicks, and revokes active sessions; shared catalog and store records are retained. Administrator accounts require another administrator to close them. Hosting and security logs may follow separate provider retention periods. The operator must confirm applicable legal retention requirements before launch. {SUPPORT_EMAIL ? <>For privacy questions, contact <a className="text-milevo-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</> : <>For privacy requests, use the <a className="text-milevo-primary underline" href="/report">problem report form</a>; a direct email contact has not been configured for this deployment.</>}
      </p>
    </article>
  );
}
