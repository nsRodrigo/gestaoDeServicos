import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  hint?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const inputId = id ?? props.name

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={cn(
              'h-12 w-full rounded-lg border border-border bg-surface px-3.5 pr-11 text-base text-foreground placeholder:text-muted',
              'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60',
              error && 'border-danger focus:ring-danger/50 focus:border-danger',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-foreground"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="text-xs text-muted">{hint}</span>
        ) : null}
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
