'use client';

import { useState } from 'react';
import { useToast } from '@/components/shared/Toast';
import { formatGHS } from '@/lib/utils';
import { captureError } from '@/lib/monitoring';
import { Button } from '@/components/ui/Button';

export interface MatchQueueItem {
  id: string;
  confidence: number;
  candidateName: string;
  storeName: string;
  price: number;
  suggestedName: string | null;
}

export function MatchingQueue({ initialMatches }: { initialMatches: MatchQueueItem[] }) {
  const toast = useToast();
  const [matches, setMatches] = useState(initialMatches);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [workingStatus, setWorkingStatus] = useState<'confirmed' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (match: MatchQueueItem, status: 'confirmed' | 'rejected') => {
    setWorkingId(match.id);
    setWorkingStatus(status);
    setError(null);
    try {
      const response = await fetch(`/api/admin/matching/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to update this match.');
      setMatches((current) => current.filter((item) => item.id !== match.id));
      toast(status === 'confirmed' ? 'Match confirmed' : 'Match rejected');
    } catch (err) {
      captureError(err);
      setError(err instanceof Error ? err.message : 'Unable to update this match.');
    } finally {
      setWorkingId(null);
      setWorkingStatus(null);
    }
  };

  return (
    <div>
      <div className="border-b border-milevo-border p-5">
        <h1 className="font-display text-xl">Product matching</h1>
        <p className="mt-1 text-xs text-milevo-muted">Review candidate offers before confirming or rejecting their product match.</p>
      </div>
      <div className="p-4">
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {matches.length === 0 ? (
          <div className="py-16 text-center text-milevo-muted">
            <h3 className="mb-2 font-display text-lg text-milevo-text">No matches pending review.</h3>
          </div>
        ) : (
          matches.map((match) => (
            <div key={match.id} className="mb-3 rounded-md border border-milevo-border p-4">
              <div className="mb-2 text-xs text-milevo-muted">Confidence: {Math.round(match.confidence * 100)}%</div>
              <div className="font-semibold">{match.candidateName}</div>
              <div className="mb-3 text-sm text-milevo-muted">{match.storeName} · {formatGHS(match.price)}</div>
              {match.suggestedName ? (
                <div className="mb-3"><strong>Suggested master product:</strong> {match.suggestedName}</div>
              ) : (
                <div className="mb-3 text-milevo-primary">No suggested master product — reject or link a product first.</div>
              )}
              <div className="flex flex-wrap gap-2">
                {match.suggestedName && (
                  <Button
                    onClick={() => void decide(match, 'confirmed')}
                    disabled={Boolean(workingId)}
                    loading={workingId === match.id && workingStatus === 'confirmed'}
                    loadingText="Saving…"
                  >
                    Confirm match
                  </Button>
                )}
                <Button
                  onClick={() => void decide(match, 'rejected')}
                  disabled={Boolean(workingId)}
                  variant="secondary"
                  loading={workingId === match.id && workingStatus === 'rejected'}
                  loadingText="Rejecting…"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
