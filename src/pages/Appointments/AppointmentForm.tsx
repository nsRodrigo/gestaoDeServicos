import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Mail } from 'lucide-react'
import { useActiveServices } from '@/hooks/useServices'
import { useActiveProducts } from '@/hooks/useProducts'
import { useActiveClients } from '@/hooks/useClients'
import { useActivePaymentMethods } from '@/hooks/usePaymentMethods'
import { useAppointmentMutations, useNextAppointmentNumber, type AppointmentFormInput } from '@/hooks/useAppointments'
import type { AppointmentWithItems } from '@/types/database'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox'
import { Select } from '@/components/ui/Select'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, todayISO, nowTimeHHMM } from '@/lib/format'
import { CartEditor, type CartItem } from '@/components/appointments/CartEditor'
import { cn } from '@/lib/utils'

interface AppointmentFormProps {
  mode: 'create' | 'edit'
  appointmentId?: string
  initialData?: AppointmentWithItems
}

const durationOptions = [15, 30, 45, 60, 90, 120].map((m) => ({ value: String(m), label: `${m} min` }))

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
  const { create, update, cancel } = useAppointmentMutations()

  // Tipo é decidido na criação (NewAppointment vs NewSale) e é imutável depois — ao editar, só
  // olhamos o que já está salvo pra saber se escondemos serviço/data/hora.
  const isSale = mode === 'edit' && initialData?.type === 'venda'
  // Um atendimento agendado (data futura, ainda não concluído) ganha os botões de
  // concluir/cancelar em vez do "Salvar" único.
  const isScheduled = mode === 'edit' && initialData?.type === 'atendimento' && initialData?.status === 'agendado'

  const [clientId, setClientId] = useState<string | null>(initialData?.client_id ?? null)
  const [clientName, setClientName] = useState(initialData?.client_name ?? '')
  const [clientNote, setClientNote] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(initialData?.payment_method_id ?? null)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [date, setDate] = useState(initialData?.appointment_date ?? todayISO())
  const [time, setTime] = useState(initialData?.appointment_time.slice(0, 5) ?? nowTimeHHMM())
  const [durationMinutes, setDurationMinutes] = useState(String(initialData?.duration_minutes ?? 30))

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
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'save' | 'conclude' | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const selectedClient = clients?.find((c) => c.id === clientId) ?? null

  const servicesTotal = useMemo(() => cartServices.reduce((sum, i) => sum + i.price * i.quantity, 0), [cartServices])
  const productsTotal = useMemo(() => cartProducts.reduce((sum, i) => sum + i.price * i.quantity, 0), [cartProducts])
  const grandTotal = servicesTotal + productsTotal

  const saving = create.isPending || update.isPending
  // Ao criar um novo atendimento, escolher uma data/hora futura já muda o rótulo do botão
  // pra "Agendar" antes mesmo de salvar — não é uma opção à parte, é automático pela data.
  const willSchedule = mode === 'create' && !isSale && new Date(`${date}T${time}`) > new Date()

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

  function showLowStockToasts(alerts: { title: string; message: string }[]) {
    alerts.forEach((n) => toast.show(n.title, { variant: 'warning', description: n.message }))
  }

  function showLoyaltyToast(loyalty: { client_name: string; visits: number; period: string } | null) {
    if (!loyalty) return
    const periodLabel = loyaltyPeriodLabels[loyalty.period] ?? loyalty.period
    toast.show('Cliente fidelidade!', {
      variant: 'success',
      description: `${loyalty.client_name} completou ${loyalty.visits} visitas neste ${periodLabel}.`,
    })
  }

  async function handleSave(conclude = false) {
    setFormError(null)
    if (!isSale && cartServices.length === 0) {
      setFormError('Informe pelo menos um serviço.')
      return
    }
    if (isSale && cartProducts.length === 0) {
      setFormError('Informe pelo menos um produto.')
      return
    }
    if (!paymentMethodId) {
      setFormError('Selecione a forma de pagamento.')
      return
    }

    const input: AppointmentFormInput = {
      type: isSale ? 'venda' : 'atendimento',
      clientId,
      clientName,
      paymentMethodId,
      notes,
      date,
      time: `${time}:00`,
      durationMinutes: Number(durationMinutes),
      services: cartServices.map((s) => ({ id: s.id, quantity: s.quantity, lineId: s.lineId, customPrice: s.customPrice })),
      products: cartProducts.map((p) => ({ id: p.id, quantity: p.quantity, lineId: p.lineId, customPrice: p.customPrice })),
    }

    setPendingAction(conclude ? 'conclude' : 'save')
    try {
      if (mode === 'create') {
        const result = await create.mutateAsync(input)
        toast.success(willSchedule ? 'Atendimento agendado com sucesso!' : 'Atendimento salvo com sucesso!')
        showLoyaltyToast(result.loyalty)
        showLowStockToasts(result.low_stock)
        navigate('/')
      } else if (appointmentId) {
        const result = await update.mutateAsync({ id: appointmentId, input, conclude })
        toast.success(conclude ? 'Atendimento concluído com sucesso!' : 'Atendimento atualizado com sucesso!')
        showLoyaltyToast(result.loyalty)
        showLowStockToasts(result.low_stock)
        navigate('/atendimentos')
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o atendimento.')
    } finally {
      setPendingAction(null)
    }
  }

  async function confirmCancel() {
    if (!appointmentId) return
    try {
      await cancel.mutateAsync(appointmentId)
      toast.success('Atendimento cancelado.')
      navigate('/atendimentos')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível cancelar o atendimento.')
    } finally {
      setCancelling(false)
    }
  }

  const clientOptions: ComboboxOption[] = (clients ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.phone ?? undefined,
  }))

  const paymentOptions = (paymentMethods ?? []).map((m) => ({ value: m.id, label: m.name }))
  const canSave = (isSale ? cartProducts.length > 0 : cartServices.length > 0) && !!paymentMethodId

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
        <div className={cn('grid gap-4', isSale ? 'grid-cols-2' : 'grid-cols-3')}>
          <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Horário" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          {!isSale && (
            <Select label="Duração" value={durationMinutes} onChange={setDurationMinutes} options={durationOptions} />
          )}
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

      {!isSale && (
        <CartEditor
          items={cartServices}
          onChange={setCartServices}
          catalog={services}
          loading={loadingServices}
          sectionLabel="Serviços"
          addPlaceholder="Adicionar serviço"
          emptyText="Nenhum serviço disponível. Cadastre em Tipos de Corte."
          namespace="service"
        />
      )}

      <CartEditor
        items={cartProducts}
        onChange={setCartProducts}
        catalog={products}
        loading={loadingProducts}
        sectionLabel="Extras"
        addPlaceholder="Adicionar extra"
        emptyText="Nenhum produto disponível. Cadastre em Produtos/Extras."
        namespace="product"
      />

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
            {!isSale && (
              <span>
                Total serviços: <strong className="text-foreground">{formatCurrency(servicesTotal)}</strong>
              </span>
            )}
            <span>
              Total extras: <strong className="text-foreground">{formatCurrency(productsTotal)}</strong>
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between md:mt-0 md:gap-4">
            <span className="text-base font-semibold">
              Total: <span className="text-gold">{formatCurrency(grandTotal)}</span>
            </span>
            <div className="ml-4 flex flex-wrap items-center justify-end gap-2 md:ml-0">
              {isScheduled && (
                <Button variant="ghost" className="text-danger" onClick={() => setCancelling(true)} disabled={saving}>
                  Cancelar atendimento
                </Button>
              )}
              <Button
                size="lg"
                variant={isScheduled ? 'secondary' : 'primary'}
                onClick={() => handleSave(false)}
                loading={pendingAction === 'save' && update.isPending}
                disabled={!canSave || (saving && pendingAction !== 'save')}
              >
                {isScheduled ? 'Salvar alterações' : willSchedule ? 'Agendar' : 'Salvar'}
              </Button>
              {isScheduled && (
                <Button
                  size="lg"
                  onClick={() => handleSave(true)}
                  loading={pendingAction === 'conclude' && update.isPending}
                  disabled={!canSave || (saving && pendingAction !== 'conclude')}
                >
                  Concluir atendimento
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title="Cancelar atendimento?"
        description="O cliente ainda não foi cobrado e nada foi descontado do estoque. Essa ação não pode ser desfeita."
        confirmLabel="Cancelar atendimento"
        loading={cancel.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  )
}
