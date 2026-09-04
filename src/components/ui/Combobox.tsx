import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
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

type Row = { kind: 'option'; option: ComboboxOption } | { kind: 'freetext'; text: string }

function isRowDisabled(row: Row) {
  return row.kind === 'option' && !!row.option.disabled
}

/** Wrapping index helper: -1 means "no selection yet" and picks the natural first/last row. */
function stepIndex(current: number, delta: number, length: number) {
  if (length === 0) return -1
  if (current < 0) return delta > 0 ? 0 : length - 1
  return (current + delta + length) % length
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
  const [activeIndex, setActiveIndex] = useState(-1)
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())
  const showFreeTextOption = allowFreeText && query.trim().length > 0 && !exactMatch

  const rows = useMemo<Row[]>(() => {
    const base: Row[] = filtered.map((option) => ({ kind: 'option', option }))
    if (showFreeTextOption) base.push({ kind: 'freetext', text: query.trim() })
    return base
  }, [filtered, showFreeTextOption, query])

  // Sempre que a lista reabre ou o filtro muda, a opção destacada volta pra primeira habilitada.
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1)
      return
    }
    setActiveIndex(stepIndex(-1, 1, rows.length))
  }, [open, query, rows.length])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.querySelector<HTMLElement>(`[data-row-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery('')
  }

  function selectOption(option: ComboboxOption) {
    if (option.disabled) return
    onSelect(option)
    handleOpenChange(false)
  }

  function selectFreeText() {
    onSelect({ value: '', label: query.trim() })
    handleOpenChange(false)
  }

  function selectRow(row: Row) {
    if (row.kind === 'freetext') selectFreeText()
    else selectOption(row.option)
  }

  function moveHighlight(delta: number) {
    setActiveIndex((prev) => {
      if (rows.length === 0) return -1
      let idx = prev
      for (let i = 0; i < rows.length; i++) {
        idx = stepIndex(idx, delta, rows.length)
        if (!isRowDisabled(rows[idx])) return idx
      }
      return prev
    })
  }

  function jumpToEdge(edge: 'first' | 'last') {
    const indices = rows.map((_, i) => i).filter((i) => !isRowDisabled(rows[i]))
    if (indices.length === 0) return
    setActiveIndex(edge === 'first' ? indices[0] : indices[indices.length - 1])
  }

  function handleListKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        handleOpenChange(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        moveHighlight(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        moveHighlight(-1)
        break
      case 'Home':
        e.preventDefault()
        jumpToEdge('first')
        break
      case 'End':
        e.preventDefault()
        jumpToEdge('last')
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && rows[activeIndex]) selectRow(rows[activeIndex])
        break
      case 'Escape':
        e.preventDefault()
        handleOpenChange(false)
        break
      default:
        break
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <div className="relative">
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={open && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined}
              onKeyDown={handleListKeyDown}
              className={cn(
                'flex h-12 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-gold/60',
                onClear && value && 'pr-9',
              )}
            >
              <span className={cn('truncate text-left', !value && 'text-muted')}>{value || placeholder}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
            </button>
          </Popover.Trigger>
          {onClear && value && (
            <button
              type="button"
              aria-label="Limpar seleção"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-gold/60"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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
                  onKeyDown={handleListKeyDown}
                  placeholder="Buscar (opcional)..."
                  aria-label="Buscar opções"
                  aria-controls={listboxId}
                  aria-activedescendant={activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined}
                  className="h-9 w-full rounded-md bg-transparent pl-7 pr-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
                />
              </div>
            )}
            <div id={listboxId} role="listbox" aria-label={label ?? 'Opções'} ref={listRef} className="overflow-y-auto p-1">
              {rows.length === 0 ? (
                <p className="px-3.5 py-3 text-sm text-muted">{emptyText}</p>
              ) : (
                rows.map((row, index) => {
                  const rowId = `${baseId}-option-${index}`
                  const active = index === activeIndex
                  if (row.kind === 'freetext') {
                    return (
                      <button
                        key="__freetext"
                        id={rowId}
                        data-row-index={index}
                        role="option"
                        aria-selected={false}
                        type="button"
                        onClick={() => selectRow(row)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded-md px-3 py-2.5 text-left text-sm text-gold hover:bg-surface-hover',
                          active && 'bg-surface-hover',
                        )}
                      >
                        Usar "{row.text}"
                      </button>
                    )
                  }
                  const opt = row.option
                  return (
                    <button
                      key={opt.value}
                      id={rowId}
                      data-row-index={index}
                      role="option"
                      aria-selected={value === opt.label}
                      aria-disabled={opt.disabled || undefined}
                      disabled={opt.disabled}
                      type="button"
                      onClick={() => selectRow(row)}
                      onMouseEnter={() => !opt.disabled && setActiveIndex(index)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface-hover disabled:opacity-40',
                        value === opt.label && 'text-gold',
                        active && 'bg-surface-hover',
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {opt.sublabel && <span className="text-xs text-muted">{opt.sublabel}</span>}
                        {value === opt.label && <Check className="h-4 w-4 text-gold" />}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
