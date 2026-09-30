'use client';

import { useState } from 'react';
import { captureError } from '@/lib/monitoring';
import { Button } from '@/components/ui/Button';

export interface ProblemReport {
  id: string;
  category: 'incorrect-price' | 'incorrect-information' | 'broken-link' | 'broken-feature' | 'accessibility' | 'account' | 'privacy' | 'merchant' | 'general' | 'other';
  details: string;
  contact_email: string | null;
  page_path: string | null;
  status: 'pending' | 'resolved';
  created_at: string;
}

const categoryLabels: Record<ProblemReport['category'], string> = {
  'incorrect-price': 'Incorrect price or availability',
  'incorrect-information': 'Incorrect product or store information',
  'broken-link': 'Broken retailer or product link',
  'broken-feature': 'Broken feature',
  accessibility: 'Accessibility',
  account: 'Account issue',
  privacy: 'Privacy request',
  merchant: 'Merchant issue',
  general: 'General support',
  other: 'Other',
};

export function ReportQueue({ initialReports }: { initialReports: ProblemReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(report: ProblemReport) {
    setBusyId(report.id);
    setError(null);
    const status = report.status === 'pending' ? 'resolved' : 'pending';
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to update this report.');
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, status } : item));
    } catch (caught) {
      captureError(caught);
      setError(caught instanceof Error ? caught.message : 'Unable to update this report.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Problem reports</h1></div>
      <div className="p-4">
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {reports.length === 0 ? (
          <p className="py-16 text-center text-milevo-muted">No problem reports have been submitted.</p>
        ) : reports.map((report) => (
          <article key={report.id} className="mb-3 rounded-md border border-milevo-border p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h2 className="font-semibold">{categoryLabels[report.category]}</h2>
                <p className="text-xs text-milevo-muted">{new Date(report.created_at).toLocaleString()} · {report.status}</p>
              </div>
              <Button type="button" variant="secondary" disabled={busyId !== null} loading={busyId === report.id}
                loadingText="Saving…" onClick={() => void update(report)}>
                {report.status === 'pending' ? 'Mark resolved' : 'Reopen'}
              </Button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{report.details}</p>
            {report.page_path && <p className="mt-2 break-all text-xs text-milevo-muted">Page: {report.page_path}</p>}
            {report.contact_email && <p className="mt-2 text-sm"><a className="text-milevo-primary underline" href={`mailto:${report.contact_email}`}>{report.contact_email}</a></p>}
          </article>
        ))}
      </div>
    </div>
  );
}
