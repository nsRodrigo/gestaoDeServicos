import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
  {
    variants: {
      variant: {
        primary: 'bg-gold text-black hover:bg-gold-light active:bg-gold-dark',
        secondary: 'bg-surface text-foreground border border-border hover:bg-surface-hover',
        ghost: 'text-foreground hover:bg-surface',
        danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
        link: 'text-gold hover:text-gold-light underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-14 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
