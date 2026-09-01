import { useState } from 'react'
import { Plus, Pencil, Users, Star, Phone, Mail } from 'lucide-react'
import { useClients, useClientMutations, type ClientInput } from '@/hooks/useClients'
import { useViewMode } from '@/hooks/useViewMode'
import type { ClientRow, LoyaltyPeriod } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ViewModeToggle } from '@/components/ui/ViewModeToggle'
import { useToast } from '@/components/ui/Toast'

const emptyForm: ClientInput = {
  name: '',
  phone: '',
  email: '',
  loyaltyEnabled: false,
  loyaltyPeriod: 'monthly',
  loyaltyVisitsRequired: 5,
}

const periodOptions: { value: LoyaltyPeriod; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
]

export default function Clients() {
  const { data: clients, isLoading } = useClients()
  const { create, update, setStatus } = useClientMutations()
  const [viewMode, setViewMode] = useViewMode('clients_view_mode', 'list')
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ClientRow | null>(null)
  const [form, setForm] = useState<ClientInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(client: ClientRow) {
    setEditing(client)
    setForm({
      name: client.name,
      phone: client.phone ?? '',
      email: client.email ?? '',
      loyaltyEnabled: client.loyalty_enabled,
      loyaltyPeriod: client.loyalty_period ?? 'monthly',
      loyaltyVisitsRequired: client.loyalty_visits_required ?? 5,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Informe o nome do cliente.')
      return
    }
    if (form.loyaltyEnabled && (!form.loyaltyVisitsRequired || form.loyaltyVisitsRequired < 1)) {
      setError('Informe quantas visitas são necessárias para a fidelidade.')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: form })
        toast.success('Cliente atualizado.')
      } else {
        await create.mutateAsync(form)
        toast.success('Cliente cadastrado.')
      }
      setModalOpen(false)
    } catch {
      setError('Não foi possível salvar o cliente.')
    }
  }

  async function toggleStatus(client: ClientRow) {
    try {
      await setStatus.mutateAsync({ id: client.id, status: client.status === 'active' ? 'inactive' : 'active' })
      toast.success(client.status === 'active' ? 'Cliente inativado.' : 'Cliente ativado.')
    } catch {
      toast.error('Não foi possível atualizar o status.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="hidden text-xl font-semibold md:block">Clientes</h1>
        <div className="ml-auto flex items-center gap-2">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Você ainda não possui clientes cadastrados."
          description="Cadastre clientes para agilizar o registro de atendimentos e ativar a fidelidade."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Cadastrar cliente</Button>}
        />
      ) : viewMode === 'list' ? (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-foreground">{client.name}</p>
                  <Badge variant={client.status === 'active' ? 'success' : 'neutral'}>
                    {client.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {client.loyalty_enabled && (
                    <Badge variant="gold">
                      <Star className="h-3 w-3" /> Fidelidade
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted">
                  {[client.phone, client.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(client)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(client)}>
                  {client.status === 'active' ? 'Inativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div key={client.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{client.name}</p>
                  {client.phone && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <Phone className="h-3.5 w-3.5" /> {client.phone}
                    </p>
                  )}
                  {client.email && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <Mail className="h-3.5 w-3.5" /> {client.email}
                    </p>
                  )}
                </div>
                <Badge variant={client.status === 'active' ? 'success' : 'neutral'}>
                  {client.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {client.loyalty_enabled && (
                <div className="mt-2">
                  <Badge variant="gold">
                    <Star className="h-3 w-3" /> Fidelidade: {client.loyalty_visits_required}x /{' '}
                    {periodOptions.find((p) => p.value === client.loyalty_period)?.label.toLowerCase()}
                  </Badge>
                </div>
              )}
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Button size="sm" variant="ghost" onClick={() => openEdit(client)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => toggleStatus(client)}>
                  {client.status === 'active' ? 'Inativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Editar cliente' : 'Novo cliente'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" placeholder="Ex: João Silva" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Telefone (opcional)"
            placeholder="(11) 91234-5678"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="E-mail (opcional)"
            type="email"
            placeholder="cliente@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.loyaltyEnabled}
              onChange={(e) => setForm({ ...form, loyaltyEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-surface accent-[rgb(var(--color-gold))]"
            />
            Cliente fidelidade
          </label>

          {form.loyaltyEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Período"
                value={form.loyaltyPeriod ?? 'monthly'}
                onChange={(v) => setForm({ ...form, loyaltyPeriod: v as LoyaltyPeriod })}
                options={periodOptions}
              />
              <Input
                label="Visitas necessárias"
                type="number"
                min={1}
                value={form.loyaltyVisitsRequired ?? ''}
                onChange={(e) => setForm({ ...form, loyaltyVisitsRequired: Number(e.target.value) })}
              />
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button size="lg" onClick={handleSubmit} loading={saving}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
