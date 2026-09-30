'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function ReportForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setStatus('sending');
    const form = new FormData(formElement);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.get('category'),
          details: form.get('details'),
          email: form.get('email'),
          pagePath: window.location.pathname,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to submit your report.');
      setStatus('sent');
      formElement.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit your report.');
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="rounded-md border border-milevo-border bg-milevo-bg p-4">
        <h2 className="font-semibold">Report received</h2>
        <p className="mt-1 text-sm text-milevo-muted">Your report was saved to the Milevo administrator support queue. No email was sent.</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => setStatus('idle')}>Send another report</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="text-sm font-medium">
        What is the issue?
        <select name="category" required className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5">
          <option value="incorrect-price">Incorrect price or availability</option>
          <option value="incorrect-information">Incorrect product or store information</option>
          <option value="broken-link">Broken retailer or product link</option>
          <option value="broken-feature">A feature is not working</option>
          <option value="accessibility">Accessibility issue</option>
          <option value="account">Account issue</option>
          <option value="privacy">Privacy request</option>
          <option value="merchant">Merchant issue</option>
          <option value="general">General support</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Details
        <textarea name="details" required minLength={10} maxLength={3000} rows={6}
          className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
      </label>
      <label className="text-sm font-medium">
        Email (optional, if you would like a reply)
        <input name="email" type="email" maxLength={254} autoComplete="email"
          className="mt-1 block w-full rounded-sm border border-milevo-border p-2.5" />
      </label>
      <p className="text-xs text-milevo-muted">Please do not include passwords, payment details, or other sensitive information.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={status === 'sending'} loadingText="Sending report…">Send report</Button>
    </form>
  );
}
