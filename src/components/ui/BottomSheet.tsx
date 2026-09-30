'use client';

import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function BottomSheet({
  open, onClose, title, children, footer,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className={cn('fixed inset-0 z-[100] bg-black/40 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={title}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-lg bg-white p-4 transition-transform',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
        </div>
        {children}
        {footer && <div className="sticky bottom-0 mt-4 bg-white pt-3">{footer}</div>}
      </div>
    </>
  );
}
