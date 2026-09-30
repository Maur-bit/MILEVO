import Link from 'next/link';
import { Rating } from '@/components/product/Rating';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback';
import type { Store } from '@/types';

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link href={`/store/${store.slug}`} className="block w-[160px] md:w-auto shrink-0 rounded-md border border-milevo-border p-4 text-center">
      <div className="relative mx-auto mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-milevo-bg">
        <span aria-hidden="true" className="text-xs font-bold text-milevo-muted">{store.name.slice(0, 1)}</span>
        {store.logoUrl && <ImageWithFallback src={store.logoUrl} alt={`${store.name} logo`} width={48} height={48} unoptimized className="absolute inset-0 h-full w-full object-contain" />}
      </div>
      <div className="font-semibold text-sm">{store.name}</div>
      <Rating value={store.rating} count={store.reviews} />
    </Link>
  );
}
