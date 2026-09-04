import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useActiveProducts } from '@/hooks/useProducts'
import { useActiveClients } from '@/hooks/useClients'
import { useActivePaymentMethods } from '@/hooks/usePaymentMethods'
import { useAppointmentMutations, type AppointmentFormInput } from '@/hooks/useAppointments'
import { Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, todayISO, nowTimeHHMM } from '@/lib/format'
import { CartEditor, type CartItem } from '@/components/appointments/CartEditor'

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function SaleForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: products, isLoading: loadingProducts } = useActiveProducts()
  const { data: clients } = useActiveClients()
  const { data: paymentMethods } = useActivePaymentMethods()
  const { create } = useAppointmentMutations()

  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [cartProducts, setCartProducts] = useState<CartItem[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const productsTotal = cartProducts.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const canSave = cartProducts.length > 0 && !!paymentMethodId
  const saving = create.isPending

  // Pré-seleciona a forma de pagamento padrão, mesmo comportamento do atendimento.
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

  const clientOptions: ComboboxOption[] = (clients ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.phone ?? undefined,
  }))
  const paymentOptions = (paymentMethods ?? []).map((m) => ({ value: m.id, label: m.name }))

  async function handleSave() {
    setFormError(null)
    if (cartProducts.length === 0) {
      setFormError('Informe pelo menos um produto.')
      return
    }
    if (!paymentMethodId) {
      setFormError('Selecione a forma de pagamento.')
      return
    }

    const input: AppointmentFormInput = {
      type: 'venda',
      clientId,
      clientName,
      paymentMethodId,
      notes,
      date: todayISO(),
      time: `${nowTimeHHMM()}:00`,
      durationMinutes: 0,
      services: [],
      products: cartProducts.map((p) => ({ id: p.id, quantity: p.quantity, lineId: p.lineId, customPrice: p.customPrice })),
    }

    try {
      const result = await create.mutateAsync(input)
      toast.success('Venda registrada com sucesso!')
      result.low_stock.forEach((n) => toast.show(n.title, { variant: 'warning', description: n.message }))
      navigate('/')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível registrar a venda.')
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-32 md:pb-6">
      <Combobox
        label="Cliente (opcional)"
        placeholder="Nome do cliente"
        value={clientName}
        onSelect={handleClientSelect}
        onClear={clearClient}
        allowFreeText
        options={clientOptions}
        emptyText="Nenhum cliente cadastrado ainda. Digite um nome pra usar mesmo assim."
      />

      <CartEditor
        items={cartProducts}
        onChange={setCartProducts}
        catalog={products}
        loading={loadingProducts}
        sectionLabel="Produtos"
        addPlaceholder="Adicionar produto"
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
        placeholder="Observação da venda"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {formError}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface p-4 md:static md:rounded-xl md:border md:bottom-auto">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-base font-semibold">
            Total: <span className="text-gold">{formatCurrency(productsTotal)}</span>
          </span>
          <Button size="lg" onClick={handleSave} loading={saving} disabled={!canSave}>
            Salvar venda
          </Button>
        </div>
      </div>
    </div>
  )
}
