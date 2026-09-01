import { useState } from 'react'
import { Plus, Pencil, PackageIcon, AlertTriangle } from 'lucide-react'
import { useProducts, useProductMutations, type ProductInput } from '@/hooks/useProducts'
import { useViewMode } from '@/hooks/useViewMode'
import type { ProductRow } from '@/types/database'
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

const emptyForm: ProductInput = { name: '', description: '', price: 0, stockControl: false, stockQuantity: 0, minimumStock: 0 }

export default function Products() {
  const { data: products, isLoading } = useProducts()
  const { create, update, setStatus } = useProductMutations()
  const [viewMode, setViewMode] = useViewMode('products_view_mode')
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [form, setForm] = useState<ProductInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(product: ProductRow) {
    setEditing(product)
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      stockControl: product.stock_control,
      stockQuantity: product.stock_quantity,
      minimumStock: product.minimum_stock,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Informe o nome do produto.')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: form })
        toast.success('Produto atualizado.')
      } else {
        await create.mutateAsync(form)
        toast.success('Produto criado.')
      }
      setModalOpen(false)
    } catch {
      setError('Não foi possível salvar o produto.')
    }
  }

  async function toggleStatus(product: ProductRow) {
    try {
      await setStatus.mutateAsync({ id: product.id, status: product.status === 'active' ? 'inactive' : 'active' })
      toast.success(product.status === 'active' ? 'Produto inativado.' : 'Produto ativado.')
    } catch {
      toast.error('Não foi possível atualizar o status.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="hidden text-xl font-semibold md:block">Produtos / Extras</h1>
        <div className="ml-auto flex items-center gap-2">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !products || products.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Você ainda não possui produtos cadastrados."
          description="Cadastre extras como Água, Refrigerante, Suco."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Cadastrar produto</Button>}
        />
      ) : viewMode === 'list' ? (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {products.map((product) => {
            const lowStock = product.stock_control && product.stock_quantity < product.minimum_stock
            return (
              <div key={product.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{product.name}</p>
                    <Badge variant={product.status === 'active' ? 'success' : 'neutral'}>
                      {product.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {lowStock && (
                      <Badge variant="danger">
                        <AlertTriangle className="h-3 w-3" /> Baixo
                      </Badge>
                    )}
                  </div>
                  {product.description && <p className="truncate text-sm text-muted">{product.description}</p>}
                  {product.stock_control && <p className="text-sm text-muted">Estoque: {product.stock_quantity}</p>}
                </div>
                <p className="shrink-0 font-semibold text-gold">{formatCurrency(product.price)}</p>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(product)}>
                    {product.status === 'active' ? 'Inativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const lowStock = product.stock_control && product.stock_quantity < product.minimum_stock
            return (
              <div key={product.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{product.name}</p>
                    <p className="mt-0.5 text-lg font-semibold text-gold">{formatCurrency(product.price)}</p>
                  </div>
                  <Badge variant={product.status === 'active' ? 'success' : 'neutral'}>
                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {product.description && <p className="mt-2 text-sm text-muted">{product.description}</p>}
                {product.stock_control && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm">
                    <span className="text-muted">Estoque: {product.stock_quantity}</span>
                    {lowStock && (
                      <Badge variant="danger">
                        <AlertTriangle className="h-3 w-3" /> Baixo
                      </Badge>
                    )}
                  </div>
                )}
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(product)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => toggleStatus(product)}>
                    {product.status === 'active' ? 'Inativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Editar produto' : 'Novo produto'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" placeholder="Ex: Água" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <CurrencyInput label="Valor" value={form.price} onChange={(price) => setForm({ ...form, price })} />

          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.stockControl}
              onChange={(e) => setForm({ ...form, stockControl: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-surface accent-[rgb(var(--color-gold))]"
            />
            Controlar estoque
          </label>

          {form.stockControl && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Estoque atual"
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
              />
              <Input
                label="Estoque mínimo"
                type="number"
                min={0}
                value={form.minimumStock}
                onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })}
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
