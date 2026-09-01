import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-12 w-full rounded-lg border border-border bg-surface px-3.5 text-base text-foreground placeholder:text-muted',
            'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60',
            error && 'border-danger focus:ring-danger/50 focus:border-danger',
            className,
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="text-xs text-muted">{hint}</span>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={cn(
            'w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-base text-foreground placeholder:text-muted resize-none',
            'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
