import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-milevo-border bg-white', className)} {...props} />;
}

const badgeVariants = cva('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-milevo-bg text-milevo-text',
      primary: 'bg-orange-50 text-milevo-primary',
      success: 'bg-green-50 text-milevo-success',
      danger: 'bg-red-50 text-red-600',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
