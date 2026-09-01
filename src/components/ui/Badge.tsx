import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      gold: 'bg-gold/15 text-gold',
      success: 'bg-success/15 text-success',
      danger: 'bg-danger/15 text-danger',
      neutral: 'bg-foreground/10 text-muted',
    },
  },
  defaultVariants: { variant: 'neutral' },
})

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
