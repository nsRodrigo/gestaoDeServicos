import { forwardRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  label?: string
  error?: string
  value: number
  onChange: (value: number) => void
  id?: string
  name?: string
  className?: string
}

function toDisplay(value: number) {
  return value === 0 ? '' : value.toFixed(2).replace('.', ',')
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, error, value, onChange, id, name, className }, ref) => {
    const [display, setDisplay] = useState(toDisplay(value))

    useEffect(() => {
      setDisplay(toDisplay(value))
    }, [value])

    function handleChange(raw: string) {
      const cleaned = raw.replace(/[^\d,]/g, '')
      setDisplay(cleaned)
      const numeric = parseFloat(cleaned.replace(',', '.'))
      onChange(Number.isFinite(numeric) ? numeric : 0)
    }

    const inputId = id ?? name

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">R$</span>
          <input
            ref={ref}
            id={inputId}
            name={name}
            inputMode="decimal"
            placeholder="0,00"
            value={display}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'h-12 w-full rounded-lg border border-border bg-surface pl-10 pr-3.5 text-base text-foreground placeholder:text-muted',
              'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60',
              error && 'border-danger',
              className,
            )}
          />
        </div>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  },
)
CurrencyInput.displayName = 'CurrencyInput'
