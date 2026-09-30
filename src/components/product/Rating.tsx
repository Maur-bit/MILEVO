import { stars } from '@/lib/utils';

export function Rating({ value, count, size = 'sm' }: { value: number; count?: number; size?: 'sm' | 'base' }) {
  return (
    <div className={size === 'sm' ? 'text-xs text-milevo-muted' : 'text-sm text-milevo-muted'}>
      <span className="text-milevo-primary">{stars(value)}</span> {value}
      {typeof count === 'number' && ` · ${count} reviews`}
    </div>
  );
}
