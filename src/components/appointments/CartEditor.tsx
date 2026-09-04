import { useState } from 'react'
import { Trash2, Pencil, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox'
import { QuantitySelector } from '@/components/ui/QuantitySelector'
import { formatCurrency } from '@/lib/format'

export interface CartItem {
  id: string
  name: string
  /** Effective price used for the total: customPrice when set, catalog price otherwise. */
  price: number
  customPrice: number | null
  quantity: number
  stockControl?: boolean
  stockQuantity?: number
  lineId?: string
}

export interface CartCatalogItem {
  id: string
  name: string
  price: number
  stock_control?: boolean
  stock_quantity?: number
}

interface CartEditorProps {
  items: CartItem[]
  onChange: (items: CartItem[]) => void
  catalog: CartCatalogItem[] | undefined
  loading?: boolean
  sectionLabel: string
  addPlaceholder: string
  emptyText: string
  /** Disambiguates the price-editing key when two CartEditors render on the same page. */
  namespace: 'service' | 'product'
}

export function CartEditor({
  items,
  onChange,
  catalog,
  loading,
  sectionLabel,
  addPlaceholder,
  emptyText,
  namespace,
}: CartEditorProps) {
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null)

  const availableCatalog = (catalog ?? []).filter((c) => !items.some((i) => i.id === c.id))
  const catalogOptions: ComboboxOption[] = availableCatalog.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.stock_control && (c.stock_quantity ?? 0) <= 0 ? 'Sem estoque' : formatCurrency(c.price),
    disabled: !!c.stock_control && (c.stock_quantity ?? 0) <= 0,
  }))

  function addItem(option: ComboboxOption) {
    const entry = catalog?.find((c) => c.id === option.value)
    if (!entry) return
    const existing = items.find((i) => i.id === entry.id)
    if (existing) {
      onChange(items.map((i) => (i.id === entry.id ? { ...i, quantity: i.quantity + 1 } : i)))
      return
    }
    onChange([
      ...items,
      {
        id: entry.id,
        name: entry.name,
        price: entry.price,
        customPrice: null,
        quantity: 1,
        stockControl: entry.stock_control,
        stockQuantity: entry.stock_quantity,
      },
    ])
  }

  function applyCustomPrice(id: string, value: number) {
    onChange(items.map((i) => (i.id === id ? { ...i, customPrice: value, price: value } : i)))
  }

  function resetCustomPrice(id: string) {
    onChange(
      items.map((i) => {
        if (i.id !== id) return i
        const catalogPrice = catalog?.find((c) => c.id === id)?.price ?? i.price
        return { ...i, customPrice: null, price: catalogPrice }
      }),
    )
  }

  function setQuantity(id: string, q: number) {
    onChange(items.map((i) => (i.id === id ? { ...i, quantity: q } : i)))
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id))
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{sectionLabel}</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const key = `${namespace}:${item.id}`
          const isEditingPrice = editingPriceKey === key
          return (
            <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  {isEditingPrice ? (
                    <div className="mt-1 flex items-center gap-2">
                      <CurrencyInput value={item.price} onChange={(v) => applyCustomPrice(item.id, v)} className="h-9" />
                      <button type="button" onClick={() => setEditingPriceKey(null)} className="text-xs text-gold">
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingPriceKey(key)}
                      className="mt-0.5 flex items-center gap-1 text-xs text-muted hover:text-gold"
                    >
                      {formatCurrency(item.price)}
                      <Pencil className="h-3 w-3" />
                      {item.customPrice !== null && <Badge variant="gold">Personalizado</Badge>}
                    </button>
                  )}
                  {item.customPrice !== null && !isEditingPrice && (
                    <button
                      type="button"
                      onClick={() => resetCustomPrice(item.id)}
                      className="mt-0.5 flex items-center gap-1 text-xs text-muted hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> usar valor cadastrado
                    </button>
                  )}
                </div>
                <QuantitySelector value={item.quantity} onChange={(q) => setQuantity(item.id, q)} />
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => removeItem(item.id)}
                  className="text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <Combobox
        className="mt-3"
        placeholder={loading ? 'Carregando...' : addPlaceholder}
        value=""
        onSelect={addItem}
        options={catalogOptions}
        emptyText={emptyText}
      />
    </section>
  )
}
