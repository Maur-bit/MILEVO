import type { Metadata } from 'next';
import { ReportForm } from './ReportForm';

export const metadata: Metadata = {
  title: 'Report a problem',
  description: 'Tell the Milevo team about an issue with prices, product information, accessibility, or site features.',
};

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-2xl">Report a problem</h1>
      <p className="mb-6 mt-2 text-sm text-milevo-muted">Use this form to report incorrect catalog details or problems using Milevo.</p>
      <ReportForm />
    </div>
  );
}
