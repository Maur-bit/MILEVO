'use client';

import { useState } from 'react';
import { stars } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { captureError } from '@/lib/monitoring';
import { Button } from '@/components/ui/Button';

export interface ModerationReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  productName: string;
}

export function ReviewQueue({ initialReviews }: { initialReviews: ModerationReview[] }) {
  const toast = useToast();
  const [queue, setQueue] = useState(initialReviews);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [workingAction, setWorkingAction] = useState<'approve' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const moderate = async (review: ModerationReview, action: 'approve' | 'remove') => {
    setWorkingId(review.id);
    setWorkingAction(action);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to update this review.');
      setQueue((current) => current.filter((item) => item.id !== review.id));
      toast(action === 'approve' ? 'Review approved and published' : 'Review removed');
    } catch (err) {
      captureError(err);
      setError(err instanceof Error ? err.message : 'Unable to update this review.');
    } finally {
      setWorkingId(null);
      setWorkingAction(null);
    }
  };

  return (
    <div>
      <div className="border-b border-milevo-border p-5"><h1 className="font-display text-xl">Review moderation</h1></div>
      <div className="p-4">
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {queue.length === 0 ? (
          <div className="py-16 text-center text-milevo-muted">
            <h3 className="font-display text-lg text-milevo-text">No reviews pending moderation.</h3>
          </div>
        ) : (
          queue.map((review) => (
            <div key={review.id} className="mb-3 rounded-md border border-milevo-border p-4">
              <div className="text-xs uppercase text-milevo-muted">Product review · {review.productName}</div>
              <div className="text-milevo-primary">{stars(review.rating)}</div>
              <div className="my-1 font-bold">{review.title}</div>
              <p className="text-sm">{review.body}</p>
              <div className="my-2 text-xs text-milevo-muted">{new Date(review.createdAt).toLocaleString()}</div>
              <div className="flex gap-2">
                <Button
                  onClick={() => void moderate(review, 'approve')}
                  disabled={Boolean(workingId)}
                  loading={workingId === review.id && workingAction === 'approve'}
                  loadingText="Saving…"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => void moderate(review, 'remove')}
                  disabled={Boolean(workingId)}
                  variant="secondary"
                  loading={workingId === review.id && workingAction === 'remove'}
                  loadingText="Removing…"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
