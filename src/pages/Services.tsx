import { useState } from 'react'
import { Plus, Pencil, ScissorsIcon } from 'lucide-react'
import { useServices, useServiceMutations, type ServiceInput } from '@/hooks/useServices'
import { useViewMode } from '@/hooks/useViewMode'
import type { ServiceRow } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ViewModeToggle } from '@/components/ui/ViewModeToggle'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/format'

const emptyForm: ServiceInput = { name: '', description: '', price: 0 }

export default function Services() {
  const { data: services, isLoading } = useServices()
  const { create, update, setStatus } = useServiceMutations()
  const [viewMode, setViewMode] = useViewMode('services_view_mode', 'list')
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceRow | null>(null)
  const [form, setForm] = useState<ServiceInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(service: ServiceRow) {
    setEditing(service)
    setForm({ name: service.name, description: service.description ?? '', price: service.price })
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Informe o nome do serviço.')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: form })
        toast.success('Serviço atualizado.')
      } else {
        await create.mutateAsync(form)
        toast.success('Serviço criado.')
      }
      setModalOpen(false)
    } catch {
      setError('Não foi possível salvar o serviço.')
    }
  }

  async function toggleStatus(service: ServiceRow) {
    try {
      await setStatus.mutateAsync({ id: service.id, status: service.status === 'active' ? 'inactive' : 'active' })
      toast.success(service.status === 'active' ? 'Serviço inativado.' : 'Serviço ativado.')
    } catch {
      toast.error('Não foi possível atualizar o status.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="hidden text-xl font-semibold md:block">Tipos de Corte</h1>
        <div className="ml-auto flex items-center gap-2">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo tipo de corte
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !services || services.length === 0 ? (
        <EmptyState
          icon={ScissorsIcon}
          title="Você ainda não possui tipos de corte cadastrados."
          description="Cadastre serviços como Degradê, Barba, Corte Social."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Cadastrar tipo de corte</Button>}
        />
      ) : viewMode === 'list' ? (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {services.map((service) => (
            <div key={service.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{service.name}</p>
                  <Badge variant={service.status === 'active' ? 'success' : 'neutral'}>
                    {service.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {service.description && <p className="truncate text-sm text-muted">{service.description}</p>}
              </div>
              <p className="shrink-0 font-semibold text-gold">{formatCurrency(service.price)}</p>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(service)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(service)}>
                  {service.status === 'active' ? 'Inativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{service.name}</p>
                  <p className="mt-0.5 text-lg font-semibold text-gold">{formatCurrency(service.price)}</p>
                </div>
                <Badge variant={service.status === 'active' ? 'success' : 'neutral'}>
                  {service.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {service.description && <p className="mt-2 text-sm text-muted">{service.description}</p>}
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Button size="sm" variant="ghost" onClick={() => openEdit(service)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => toggleStatus(service)}>
                  {service.status === 'active' ? 'Inativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Editar tipo de corte' : 'Novo tipo de corte'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" placeholder="Ex: Degradê" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <CurrencyInput label="Valor" value={form.price} onChange={(price) => setForm({ ...form, price })} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button size="lg" onClick={handleSubmit} loading={saving}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
