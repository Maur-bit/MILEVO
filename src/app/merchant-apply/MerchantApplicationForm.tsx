'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function MerchantApplicationForm({ email }: { email: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (loading) return;
    const values = new FormData(formElement);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/merchant/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: values.get('storeName'),
          websiteUrl: values.get('websiteUrl'),
          contactName: values.get('contactName'),
          details: values.get('details'),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to submit your application.');
      setSubmitted(true);
      formElement.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit your application.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-md border border-milevo-border p-4">
        <h2 className="font-semibold">Application received</h2>
        <p className="mt-2 text-sm text-milevo-muted">
          The Milevo team will review your business details. This request does not grant merchant access; an administrator must verify and approve the account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-milevo-muted">Applying as {email}. Merchant access is manually reviewed and only enabled after approval.</p>
      <label className="text-sm font-medium">
        Store or business name
        <input name="storeName" required minLength={2} maxLength={120} className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
      </label>
      <label className="text-sm font-medium">
        Store website
        <input name="websiteUrl" required type="url" maxLength={2048} placeholder="https://example.com" className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
      </label>
      <label className="text-sm font-medium">
        Contact name
        <input name="contactName" required minLength={2} maxLength={120} autoComplete="name" className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
      </label>
      <label className="text-sm font-medium">
        Business details
        <textarea name="details" required minLength={10} maxLength={2000} rows={5}
          placeholder="Describe the products you sell and how you would like to work with Milevo."
          className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
      </label>
      <p className="text-xs text-milevo-muted">Do not include passwords, payment details, or sensitive identity documents.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={loading} loadingText="Submitting application…">Submit application</Button>
    </form>
  );
}
