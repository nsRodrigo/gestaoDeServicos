import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

export function QuantitySelector({ value, onChange, min = 1, max = 999, disabled, className }: QuantitySelectorProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-lg border border-border bg-surface p-1', className)}>
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-surface-hover disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-surface-hover disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
