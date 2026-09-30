export function SpecificationTable({ specs }: { specs: Record<string, string> }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {Object.entries(specs).map(([k, v]) => (
          <tr key={k} className="border-b border-milevo-border">
            <td className="py-2 pr-4 text-milevo-muted w-2/5 align-top">{k}</td>
            <td className="py-2 align-top">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ProductGallery({ alt, images = [] }: { alt: string; images?: ProductImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];
  return (
    <div>
      <div className="relative mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-milevo-bg" role="img" aria-label={activeImage?.altText || alt}>
        {activeImage ? (
          <>
            <Icon name="package" size={40} className="text-milevo-muted" />
            <ImageWithFallback src={activeImage.url} alt={activeImage.altText || alt} fill unoptimized className="object-contain" />
          </>
        ) : <Icon name="package" size={40} className="text-milevo-muted" />}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2" aria-label="Product images">
          {images.map((image, index) => (
            <button key={`${image.url}-${index}`} type="button" aria-label={`Show image ${index + 1}`}
              aria-pressed={activeIndex === index} onClick={() => setActiveIndex(index)}
              className={`relative h-14 w-14 overflow-hidden rounded-sm border bg-milevo-bg ${activeIndex === index ? 'border-milevo-primary' : 'border-milevo-border'}`}>
              <ImageWithFallback src={image.url} alt="" width={56} height={56} unoptimized className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import type { ProductImage } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback';
