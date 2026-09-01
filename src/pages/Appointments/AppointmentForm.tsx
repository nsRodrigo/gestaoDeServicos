import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, AlertTriangle, Pencil, X, Mail } from 'lucide-react'
import { useActiveServices } from '@/hooks/useServices'
import { useActiveProducts } from '@/hooks/useProducts'
import { useActiveClients } from '@/hooks/useClients'
import { useActivePaymentMethods } from '@/hooks/usePaymentMethods'
import { useAppointmentMutations, useNextAppointmentNumber, type AppointmentFormInput } from '@/hooks/useAppointments'
import type { AppointmentWithItems } from '@/types/database'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { QuantitySelector } from '@/components/ui/QuantitySelector'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, todayISO, nowTimeHHMM } from '@/lib/format'

interface CartItem {
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

interface AppointmentFormProps {
  mode: 'create' | 'edit'
  appointmentId?: string
  initialData?: AppointmentWithItems
}

const loyaltyPeriodLabels: Record<string, string> = {
  monthly: 'mês',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  annual: 'ano',
}

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function AppointmentForm({ mode, appointmentId, initialData }: AppointmentFormProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: services, isLoading: loadingServices } = useActiveServices()
  const { data: products, isLoading: loadingProducts } = useActiveProducts()
  const { data: clients } = useActiveClients()
  const { data: paymentMethods } = useActivePaymentMethods()
  const { data: nextNumber } = useNextAppointmentNumber()
  const { create, update } = useAppointmentMutations()

  const [clientId, setClientId] = useState<string | null>(initialData?.client_id ?? null)
  const [clientName, setClientName] = useState(initialData?.client_name ?? '')
  const [clientNote, setClientNote] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(initialData?.payment_method_id ?? null)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [date, setDate] = useState(initialData?.appointment_date ?? todayISO())
  const [time, setTime] = useState(initialData?.appointment_time.slice(0, 5) ?? nowTimeHHMM())

  const [cartServices, setCartServices] = useState<CartItem[]>(
    initialData?.appointment_services.map((s) => ({
      id: s.service_id ?? s.id,
      lineId: s.id,
      name: s.service_name_snapshot,
      price: s.service_price_snapshot,
      customPrice: s.custom_price,
      quantity: s.quantity,
    })) ?? [],
  )
  const [cartProducts, setCartProducts] = useState<CartItem[]>(
    initialData?.appointment_products.map((p) => ({
      id: p.product_id ?? p.id,
      lineId: p.id,
      name: p.product_name_snapshot,
      price: p.product_price_snapshot,
      customPrice: p.custom_price,
      quantity: p.quantity,
    })) ?? [],
  )
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedClient = clients?.find((c) => c.id === clientId) ?? null

  const servicesTotal = useMemo(() => cartServices.reduce((sum, i) => sum + i.price * i.quantity, 0), [cartServices])
  const productsTotal = useMemo(() => cartProducts.reduce((sum, i) => sum + i.price * i.quantity, 0), [cartProducts])
  const grandTotal = servicesTotal + productsTotal

  function addService(option: ComboboxOption) {
    const svc = services?.find((s) => s.id === option.value)
    if (!svc) return
    setCartServices((prev) => {
      const existing = prev.find((i) => i.id === svc.id)
      if (existing) return prev.map((i) => (i.id === svc.id ? { ...i, quantity: i.quantity + 1 } : i))
      return [...prev, { id: svc.id, name: svc.name, price: svc.price, customPrice: null, quantity: 1 }]
    })
  }

  function addProduct(option: ComboboxOption) {
    const prod = products?.find((p) => p.id === option.value)
    if (!prod) return
    setCartProducts((prev) => {
      const existing = prev.find((i) => i.id === prod.id)
      if (existing) return prev.map((i) => (i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i))
      return [
        ...prev,
        { id: prod.id, name: prod.name, price: prod.price, customPrice: null, quantity: 1, stockControl: prod.stock_control, stockQuantity: prod.stock_quantity },
      ]
    })
  }

  function applyCustomPrice(kind: 'service' | 'product', id: string, value: number) {
    const setter = kind === 'service' ? setCartServices : setCartProducts
    setter((prev) => prev.map((i) => (i.id === id ? { ...i, customPrice: value, price: value } : i)))
  }

  function resetCustomPrice(kind: 'service' | 'product', id: string) {
    const catalog = kind === 'service' ? services : products
    const setter = kind === 'service' ? setCartServices : setCartProducts
    setter((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const catalogPrice = catalog?.find((c) => c.id === id)?.price ?? i.price
        return { ...i, customPrice: null, price: catalogPrice }
      }),
    )
  }

  const saving = create.isPending || update.isPending

  // Pré-seleciona a forma de pagamento padrão (definida em Formas de Pagamento) ou, na falta
  // dela, qualquer uma chamada "Débito" — só quando o barbeiro ainda não escolheu nenhuma.
  useEffect(() => {
    if (paymentMethodId || !paymentMethods || paymentMethods.length === 0) return
    const preferred =
      paymentMethods.find((m) => m.is_default) ?? paymentMethods.find((m) => normalize(m.name).includes('debito'))
    if (preferred) setPaymentMethodId(preferred.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethods])

  function handleClientSelect(option: ComboboxOption) {
    setClientId(option.value || null)
    setClientName(option.label)
  }

  function clearClient() {
    setClientId(null)
    setClientName('')
  }

  function sendClientNote() {
    if (!selectedClient?.email) return
    const subject = encodeURIComponent('Sua visita na Barbearia Profissional')
    const body = encodeURIComponent(clientNote)
    window.location.href = `mailto:${selectedClient.email}?subject=${subject}&body=${body}`
  }

  async function handleSave() {
    setFormError(null)
    if (cartServices.length === 0) {
      setFormError('Informe pelo menos um serviço.')
      return
    }
    if (!paymentMethodId) {
      setFormError('Selecione a forma de pagamento.')
      return
    }

    const input: AppointmentFormInput = {
      clientId,
      clientName,
      paymentMethodId,
      notes,
      date,
      time: `${time}:00`,
      services: cartServices.map((s) => ({ id: s.id, quantity: s.quantity, lineId: s.lineId, customPrice: s.customPrice })),
      products: cartProducts.map((p) => ({ id: p.id, quantity: p.quantity, lineId: p.lineId, customPrice: p.customPrice })),
    }

    try {
      if (mode === 'create') {
        const result = await create.mutateAsync(input)
        toast.success('Atendimento salvo com sucesso!')
        if (result.loyalty) {
          const periodLabel = loyaltyPeriodLabels[result.loyalty.period] ?? result.loyalty.period
          toast.show('Cliente fidelidade!', {
            variant: 'success',
            description: `${result.loyalty.client_name} completou ${result.loyalty.visits} visitas neste ${periodLabel}.`,
          })
        }
        navigate('/')
      } else if (appointmentId) {
        await update.mutateAsync({ id: appointmentId, input })
        toast.success('Atendimento atualizado com sucesso!')
        navigate('/atendimentos')
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o atendimento.')
    }
  }

  const availableServices = (services ?? []).filter((s) => !cartServices.some((c) => c.id === s.id))
  const availableProducts = (products ?? []).filter((p) => !cartProducts.some((c) => c.id === p.id))

  const clientOptions: ComboboxOption[] = (clients ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.phone ?? undefined,
  }))
  const serviceOptions: ComboboxOption[] = availableServices.map((s) => ({
    value: s.id,
    label: s.name,
    sublabel: formatCurrency(s.price),
  }))
  const productOptions: ComboboxOption[] = availableProducts.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: p.stock_control && p.stock_quantity <= 0 ? 'Sem estoque' : formatCurrency(p.price),
    disabled: p.stock_control && p.stock_quantity <= 0,
  }))

  const paymentOptions = (paymentMethods ?? []).map((m) => ({ value: m.id, label: m.name }))
  const canSave = cartServices.length > 0 && !!paymentMethodId

  function renderCartItem(item: CartItem, kind: 'service' | 'product') {
    const key = `${kind}:${item.id}`
    const isEditingPrice = editingPriceKey === key
    const setQuantity = (q: number) => {
      const setter = kind === 'service' ? setCartServices : setCartProducts
      setter((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: q } : i)))
    }
    const removeItem = () => {
      const setter = kind === 'service' ? setCartServices : setCartProducts
      setter((prev) => prev.filter((i) => i.id !== item.id))
    }

    return (
      <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
            {isEditingPrice ? (
              <div className="mt-1 flex items-center gap-2">
                <CurrencyInput
                  value={item.price}
                  onChange={(v) => applyCustomPrice(kind, item.id, v)}
                  className="h-9"
                />
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
                onClick={() => resetCustomPrice(kind, item.id)}
                className="mt-0.5 flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                <X className="h-3 w-3" /> usar valor cadastrado
              </button>
            )}
          </div>
          <QuantitySelector value={item.quantity} onChange={setQuantity} />
          <button type="button" aria-label="Remover" onClick={removeItem} className="text-muted hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-32 md:pb-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Combobox
          label="Cliente (opcional)"
          placeholder={nextNumber ? `Atendimento ${nextNumber}` : 'Nome do cliente'}
          value={clientName}
          onSelect={handleClientSelect}
          onClear={clearClient}
          allowFreeText
          options={clientOptions}
          emptyText="Nenhum cliente cadastrado ainda. Digite um nome pra usar mesmo assim."
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Horário" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      {selectedClient?.email && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Mail className="h-4 w-4 text-gold" /> Nota para {selectedClient.name}
          </h2>
          <Textarea
            placeholder="Mensagem que será enviada por e-mail ao cliente (opcional)"
            value={clientNote}
            onChange={(e) => setClientNote(e.target.value)}
          />
          <Button variant="secondary" size="sm" className="mt-2" onClick={sendClientNote} disabled={!clientNote.trim()}>
            <Mail className="h-4 w-4" /> Enviar nota
          </Button>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Serviços</h2>
        <div className="flex flex-col gap-2">{cartServices.map((item) => renderCartItem(item, 'service'))}</div>
        <Combobox
          className="mt-3"
          placeholder={loadingServices ? 'Carregando...' : 'Adicionar serviço'}
          value=""
          onSelect={addService}
          options={serviceOptions}
          emptyText="Nenhum serviço disponível. Cadastre em Tipos de Corte."
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Extras</h2>
        <div className="flex flex-col gap-2">{cartProducts.map((item) => renderCartItem(item, 'product'))}</div>
        <Combobox
          className="mt-3"
          placeholder={loadingProducts ? 'Carregando...' : 'Adicionar extra'}
          value=""
          onSelect={addProduct}
          options={productOptions}
          emptyText="Nenhum produto disponível. Cadastre em Produtos/Extras."
        />
      </section>

      <Select
        label="Forma de pagamento"
        placeholder="Selecione a forma de pagamento"
        value={paymentMethodId ?? ''}
        onChange={(v) => setPaymentMethodId(v)}
        options={paymentOptions}
      />

      <Textarea
        label="Observação (opcional)"
        placeholder="Observação do atendimento"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {formError}
        </div>
      )}

      {/* Resumo — sticky no mobile, estático no desktop */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface p-4 md:static md:rounded-xl md:border md:bottom-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
          <div className="flex justify-between text-sm text-muted md:gap-6">
            <span>Total serviços: <strong className="text-foreground">{formatCurrency(servicesTotal)}</strong></span>
            <span>Total extras: <strong className="text-foreground">{formatCurrency(productsTotal)}</strong></span>
          </div>
          <div className="mt-2 flex items-center justify-between md:mt-0 md:gap-4">
            <span className="text-base font-semibold">
              Total: <span className="text-gold">{formatCurrency(grandTotal)}</span>
            </span>
            <Button size="lg" className="ml-4 md:ml-0" onClick={handleSave} loading={saving} disabled={!canSave}>
              Salvar atendimento
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
