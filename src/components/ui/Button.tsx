import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/shared/Spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none min-h-touch',
  {
    variants: {
      variant: {
        primary: 'bg-milevo-primary text-[#171717] hover:bg-[#ff8a3d] dark:hover:bg-[#ff9a52]',
        secondary: 'bg-white text-milevo-text border border-milevo-border hover:bg-milevo-bg',
        ghost: 'bg-transparent text-milevo-text hover:bg-milevo-bg',
        link: 'bg-transparent text-milevo-primary underline-offset-4 hover:underline p-0 h-auto min-h-0',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'px-3 py-1.5 text-xs',
        icon: 'h-touch w-touch',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading = false, loadingText, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Spinner className="mr-2" />}
        {loading ? loadingText ?? children : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
