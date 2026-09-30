import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 px-4 text-center text-milevo-muted">
      <h3 className="font-display text-lg text-milevo-text mb-2">{title}</h3>
      {description && <p className="mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong.', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="py-16 px-4 text-center text-milevo-muted">
      <h3 className="font-display text-lg text-milevo-text mb-2">{title}</h3>
      {onRetry && (
        <button onClick={onRetry} className="text-milevo-primary font-semibold">
          Try again
        </button>
      )}
    </div>
  );
}
