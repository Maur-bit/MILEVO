import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/site';
import { ReportForm } from '@/app/report/ReportForm';

export const metadata: Metadata = {
  title: 'Contact Milevo',
  description: 'Contact the Milevo team for help using the product comparison service.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-2xl">Contact</h1>
      <p className="mt-3 text-milevo-muted">For issues with prices, product details, accessibility, or site features, submit a report so we can investigate.</p>
      <div className="mt-6"><ReportForm /></div>
      <p className="mt-4 text-xs text-milevo-muted">
        Requests are saved to the Milevo administrator support queue; this form does not send email or promise a response.
        Do not include passwords, payment details, or authentication tokens.
      </p>
      <p className="mt-3"><Link href="/report" className="text-sm font-semibold text-milevo-primary underline">Open the standalone report page</Link></p>
      {SUPPORT_EMAIL ? (
        <p className="mt-4 text-sm">Email: <a className="text-milevo-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      ) : (
        <p className="mt-4 text-sm text-milevo-muted">Email support is not configured for this deployment.</p>
      )}
    </div>
  );
}
