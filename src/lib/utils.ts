import { createElement } from 'react';
import { Icon } from '@/components/ui/Icon';

export { cn } from "cn";

const ghanaCedi = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGHS(amount: number): string {
  return ghanaCedi.format(amount);
}

export function stars(rating: number) {
  const count = Math.max(0, Math.min(5, Math.round(rating)));
  return createElement(
    'span',
    {
      'aria-label': `${count} out of 5 stars`,
      className: 'inline-flex items-center gap-0.5 align-middle',
    },
    Array.from({ length: count }, (_, index) => createElement(Icon, { key: index, name: 'star', size: 14, filled: true })),
  );
}
