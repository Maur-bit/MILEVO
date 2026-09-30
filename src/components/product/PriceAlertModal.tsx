'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { formatGHS } from '@/lib/utils';
import { createPriceAlert } from '@/services/account';
import { track } from '@/lib/analytics';
import { useToast } from '@/components/shared/Toast';
import { AuthenticationRequiredError } from '@/services/account';
import { captureError } from '@/lib/monitoring';

const schema = z.object({
  targetPrice: z.coerce.number().positive('Enter a target price above zero'),
});
type FormValues = z.infer<typeof schema>;

export function PriceAlertModal({
  open, onOpenChange, slug, currentPrice, variantId, variantLabel,
}: { open: boolean; onOpenChange: (v: boolean) => void; slug: string; currentPrice: number; variantId?: string; variantLabel?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    setSaving(true);
    setError(null);
    try {
      await createPriceAlert(slug, values.targetPrice, variantId);
      track({ name: 'price_alert_created', slug, targetPrice: values.targetPrice });
      onOpenChange(false);
      reset();
      toast(`We'll notify you at ${formatGHS(values.targetPrice)}`);
    } catch (err) {
      if (err instanceof AuthenticationRequiredError) {
        router.push(`/login?next=${encodeURIComponent(`/product/${slug}`)}`);
        return;
      }
      captureError(err);
      setError('Unable to save this price alert. Please try again.');
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Set a price alert</DialogTitle>
        <p className="text-sm text-milevo-muted mb-3">Current price: {formatGHS(currentPrice)}</p>
        {variantLabel && <p className="mb-3 text-xs text-milevo-muted">Watching variant: {variantLabel}</p>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <label htmlFor="target" className="text-sm block mb-1">Notify me when price reaches</label>
          <input
            id="target"
            type="number"
            step="1"
            placeholder="e.g. 8000"
            className="w-full rounded-sm border border-milevo-border p-2.5 mb-1"
            aria-invalid={Boolean(errors.targetPrice)}
            aria-describedby={errors.targetPrice ? 'target-price-error' : undefined}
            {...register('targetPrice')}
          />
          {errors.targetPrice && <p id="target-price-error" className="text-xs text-red-600 mb-2">{errors.targetPrice.message}</p>}
          {error && <p role="alert" className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <Button type="button" variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="w-full" loading={saving} loadingText="Saving…">Create alert</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
