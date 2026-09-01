import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Search, Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
  disabled?: boolean
}

interface ComboboxProps {
  label?: string
  placeholder?: string
  /** Text shown on the closed trigger — the selected label, or empty to show the placeholder. */
  value: string
  options: ComboboxOption[]
  onSelect: (option: ComboboxOption) => void
  /** When true, typing text that doesn't match any option is accepted as-is (ex: cliente avulso). */
  allowFreeText?: boolean
  /** Shows an optional search field inside the list — never focused automatically, so opening
   *  the dropdown never pops the mobile keyboard. Default true. */
  searchable?: boolean
  emptyText?: string
  className?: string
  onClear?: () => void
}

export function Combobox({
  label,
  placeholder = 'Selecione',
  value,
  options,
  onSelect,
  allowFreeText = false,
  searchable = true,
  emptyText = 'Nenhum resultado.',
  className,
  onClear,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())
  const showFreeTextOption = allowFreeText && query.trim().length > 0 && !exactMatch

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery('')
  }

  function selectOption(option: ComboboxOption) {
    onSelect(option)
    handleOpenChange(false)
  }

  function selectFreeText() {
    onSelect({ value: '', label: query.trim() })
    handleOpenChange(false)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between rounded-lg border border-border bg-surface px-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-gold/60"
          >
            <span className={cn('truncate text-left', !value && 'text-muted')}>{value || placeholder}</span>
            <span className="flex shrink-0 items-center gap-1">
              {onClear && value && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClear()
                  }}
                  className="rounded p-0.5 text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted" />
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            onOpenAutoFocus={(e) => e.preventDefault()}
            align="start"
            sideOffset={4}
            className="z-[60] flex max-h-80 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
            style={{ width: 'var(--radix-popper-anchor-width)' }}
          >
            {searchable && (
              <div className="relative shrink-0 border-b border-border p-2">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar (opcional)..."
                  className="h-9 w-full rounded-md bg-transparent pl-7 pr-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
                />
              </div>
            )}
            <div className="overflow-y-auto p-1">
              {filtered.length === 0 && !showFreeTextOption ? (
                <p className="px-3.5 py-3 text-sm text-muted">{emptyText}</p>
              ) : (
                <>
                  {filtered.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => selectOption(opt)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface-hover disabled:opacity-40',
                        value === opt.label && 'text-gold',
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {opt.sublabel && <span className="text-xs text-muted">{opt.sublabel}</span>}
                        {value === opt.label && <Check className="h-4 w-4 text-gold" />}
                      </span>
                    </button>
                  ))}
                  {showFreeTextOption && (
                    <button
                      type="button"
                      onClick={selectFreeText}
                      className="flex w-full items-center gap-1.5 rounded-md px-3 py-2.5 text-left text-sm text-gold hover:bg-surface-hover"
                    >
                      Usar "{query.trim()}"
                    </button>
                  )}
                </>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
