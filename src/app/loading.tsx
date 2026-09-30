import { Spinner } from '@/components/shared/Spinner';

export default function Loading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-sm text-milevo-muted">
        <Spinner className="h-5 w-5 text-milevo-primary" />
        <span>Loading page…</span>
      </div>
    </div>
  );
}
