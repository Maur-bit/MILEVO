'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface MerchantApplication {
  id: string;
  store_name: string;
  website_url: string;
  contact_name: string;
  contact_email: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function MerchantApplicationQueue({ applications: initial }: { applications: MerchantApplication[] }) {
  const [applications, setApplications] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(application: MerchantApplication, decision: 'approve' | 'reject') {
    setBusyId(application.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/merchant-applications/${application.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json() as { status?: MerchantApplication['status']; error?: string };
      if (!response.ok || !result.status) throw new Error(result.error ?? 'Unable to review this application.');
      setApplications((current) => current.map((item) => item.id === application.id
        ? { ...item, status: result.status! }
        : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to review this application.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="border-b border-milevo-border p-5">
        <h1 className="font-display text-xl">Merchant applications</h1>
        <p className="mt-1 text-sm text-milevo-muted">Approving creates the store and verified account membership transactionally.</p>
      </div>
      <div className="p-4">
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {applications.length === 0 ? (
          <p className="py-12 text-center text-sm text-milevo-muted">No merchant applications have been submitted.</p>
        ) : applications.map((application) => (
          <article key={application.id} className="mb-4 rounded-md border border-milevo-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{application.store_name}</h2>
                <p className="text-xs text-milevo-muted">
                  {application.contact_name} · {application.contact_email} · {new Date(application.created_at).toLocaleString()}
                </p>
                <a href={application.website_url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sm text-milevo-primary underline">
                  {application.website_url}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm capitalize">{application.status}</span>
                {application.status === 'pending' && (
                  <>
                    <Button type="button" disabled={busyId !== null} loading={busyId === application.id}
                      loadingText="Reviewing…" onClick={() => void review(application, 'approve')}>Approve</Button>
                    <Button type="button" variant="secondary" disabled={busyId !== null}
                      onClick={() => void review(application, 'reject')}>Reject</Button>
                  </>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{application.details}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
