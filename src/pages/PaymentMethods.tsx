import { useState } from 'react'
import { Plus, Pencil, Wallet, Star } from 'lucide-react'
import { usePaymentMethods, usePaymentMethodMutations } from '@/hooks/usePaymentMethods'
import { useViewMode } from '@/hooks/useViewMode'
import type { PaymentMethodRow } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ViewModeToggle } from '@/components/ui/ViewModeToggle'
import { useToast } from '@/components/ui/Toast'

export default function PaymentMethods() {
  const { data: methods, isLoading } = usePaymentMethods()
  const { create, update, setStatus, setDefault } = usePaymentMethodMutations()
  const [viewMode, setViewMode] = useViewMode('payment_methods_view_mode', 'list')
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethodRow | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setName('')
    setError(null)
    setModalOpen(true)
  }

  function openEdit(method: PaymentMethodRow) {
    setEditing(method)
    setName(method.name)
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Informe o nome da forma de pagamento.')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name })
        toast.success('Forma de pagamento atualizada.')
      } else {
        await create.mutateAsync(name)
        toast.success('Forma de pagamento criada.')
      }
      setModalOpen(false)
    } catch {
      setError('Não foi possível salvar.')
    }
  }

  async function toggleStatus(method: PaymentMethodRow) {
    try {
      await setStatus.mutateAsync({ id: method.id, status: method.status === 'active' ? 'inactive' : 'active' })
      toast.success(method.status === 'active' ? 'Forma de pagamento inativada.' : 'Forma de pagamento ativada.')
    } catch {
      toast.error('Não foi possível atualizar o status.')
    }
  }

  async function makeDefault(method: PaymentMethodRow) {
    try {
      await setDefault.mutateAsync(method.id)
      toast.success(`${method.name} agora é a forma de pagamento padrão.`)
    } catch {
      toast.error('Não foi possível definir como padrão.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="hidden text-xl font-semibold md:block">Formas de Pagamento</h1>
        <div className="ml-auto flex items-center gap-2">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova forma de pagamento
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !methods || methods.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Você ainda não possui formas de pagamento cadastradas."
          description="Ex: Dinheiro, Pix, Cartão de Crédito, Cartão de Débito."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Cadastrar forma de pagamento</Button>}
        />
      ) : viewMode === 'list' ? (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {methods.map((method) => (
            <div key={method.id} className="flex items-center gap-3 p-3.5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <p className="truncate font-medium text-foreground">{method.name}</p>
                <Badge variant={method.status === 'active' ? 'success' : 'neutral'}>
                  {method.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
                {method.is_default && (
                  <Badge variant="gold">
                    <Star className="h-3 w-3" /> Padrão
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(method)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {!method.is_default && method.status === 'active' && (
                  <Button size="sm" variant="ghost" onClick={() => makeDefault(method)}>
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(method)}>
                  {method.status === 'active' ? 'Inativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {methods.map((method) => (
            <div key={method.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium text-foreground">{method.name}</p>
                <Badge variant={method.status === 'active' ? 'success' : 'neutral'}>
                  {method.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {method.is_default && (
                <div className="mt-2">
                  <Badge variant="gold">
                    <Star className="h-3 w-3" /> Padrão
                  </Badge>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <Button size="sm" variant="ghost" onClick={() => openEdit(method)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                {!method.is_default && method.status === 'active' && (
                  <Button size="sm" variant="ghost" onClick={() => makeDefault(method)}>
                    <Star className="h-4 w-4" /> Tornar padrão
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => toggleStatus(method)}>
                  {method.status === 'active' ? 'Inativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" placeholder="Ex: Pix" value={name} onChange={(e) => setName(e.target.value)} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button size="lg" onClick={handleSubmit} loading={saving}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
