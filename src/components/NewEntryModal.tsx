import { useNavigate } from 'react-router-dom'
import { Scissors, ShoppingBag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface NewEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewEntryModal({ open, onOpenChange }: NewEntryModalProps) {
  const navigate = useNavigate()

  function go(path: string) {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="O que você vai registrar?">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => go('/atendimentos/novo')}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-hover p-3.5 text-left hover:border-gold/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Scissors className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">Novo atendimento</span>
            <span className="block text-xs text-muted">Serviço, com ou sem produtos</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => go('/vendas/novo')}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-hover p-3.5 text-left hover:border-gold/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">Nova venda</span>
            <span className="block text-xs text-muted">Só produto — sem serviço, sem horário</span>
          </span>
        </button>
      </div>
    </Modal>
  )
}
