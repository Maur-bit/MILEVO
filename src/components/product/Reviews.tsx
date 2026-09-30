'use client';

import { stars } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { submitProductReview } from '@/services/reviews';
import { useToast } from '@/components/shared/Toast';
import { track } from '@/lib/analytics';
import type { ProductReview } from '@/types';
import { AuthenticationRequiredError } from '@/services/account';
import { captureError } from '@/lib/monitoring';
import { Icon } from '@/components/ui/Icon';

export function ReviewSummary({ reviews, fallbackRating }: { reviews: ProductReview[]; fallbackRating: number }) {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : fallbackRating;
  return (
    <div className="flex items-center gap-5">
      <div className="text-3xl font-extrabold">{avg.toFixed(1)}</div>
      <div>
        <div className="text-milevo-primary">{stars(avg)}</div>
        <div className="text-sm text-milevo-muted">{reviews.length} review{reviews.length === 1 ? '' : 's'}</div>
      </div>
    </div>
  );
}

export function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <div className="border-b border-milevo-border py-4">
      <div className="text-milevo-primary">{stars(review.rating)}</div>
      <div className="font-bold my-1">{review.title}</div>
      <p className="text-sm">{review.body}</p>
      <div className="text-xs text-milevo-muted mt-1">
        {review.verified && <span className="text-milevo-success font-semibold">Verified purchase</span>}{review.verified && ' · '}{review.date}
      </div>
    </div>
  );
}

const schema = z.object({
  title: z.string().min(1, 'Give it a short title'),
  body: z.string().min(10, 'Share a bit more detail (10+ characters)'),
});
type FormValues = z.infer<typeof schema>;

export function WriteReviewModal({
  open, onOpenChange, slug, onSubmitted,
}: { open: boolean; onOpenChange: (v: boolean) => void; slug: string; onSubmitted: () => void | Promise<void> }) {
  const router = useRouter();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (submissionInProgress.current) return;
    submissionInProgress.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await submitProductReview(slug, { rating, ...values });
      track({ name: 'review_submitted', slug, rating });
      onOpenChange(false);
      reset();
      setRating(5);
      await onSubmitted();
      toast('Thanks — your review was submitted for moderation');
    } catch (err) {
      if (err instanceof AuthenticationRequiredError) {
        router.push(`/login?next=${encodeURIComponent(`/product/${slug}`)}`);
        return;
      }
      captureError(err);
      setError('Unable to submit your review. Please try again.');
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Write a review</DialogTitle>
        <div
          role="radiogroup"
          aria-label="Rating"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              const next = Math.min(5, rating + 1);
              setRating(next);
              event.currentTarget.querySelector<HTMLButtonElement>(`[data-rating="${next}"]`)?.focus();
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              const next = Math.max(1, rating - 1);
              setRating(next);
              event.currentTarget.querySelector<HTMLButtonElement>(`[data-rating="${next}"]`)?.focus();
            }
          }}
          className="mb-2 flex"
        >
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                data-rating={value}
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                aria-checked={rating === value}
                tabIndex={rating === value ? 0 : -1}
                onClick={() => setRating(value)}
                className={`min-h-touch min-w-touch text-2xl ${value <= rating ? 'text-milevo-primary' : 'text-milevo-border'}`}
              >
                <Icon name="star" size={22} filled={value <= rating} />
              </button>
            );
          })}
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label htmlFor="review-title" className="mb-1 block text-sm font-medium">Review title</label>
          <input
            id="review-title"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'review-title-error' : undefined}
            placeholder="Summarize your experience"
            className="mb-1 w-full rounded-sm border border-milevo-border p-2.5"
            {...register('title')}
          />
          {errors.title && <p id="review-title-error" className="mb-2 text-xs text-red-600">{errors.title.message}</p>}
          <label htmlFor="review-body" className="mb-1 block text-sm font-medium">Your review</label>
          <textarea
            id="review-body"
            aria-invalid={Boolean(errors.body)}
            aria-describedby={errors.body ? 'review-body-error' : undefined}
            placeholder="Share your experience"
            className="min-h-[80px] w-full rounded-sm border border-milevo-border p-2.5"
            {...register('body')}
          />
          {errors.body && <p id="review-body-error" className="mb-2 text-xs text-red-600">{errors.body.message}</p>}
          {error && <p role="alert" className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <Button type="button" variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="w-full" loading={submitting} loadingText="Submitting…">Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
