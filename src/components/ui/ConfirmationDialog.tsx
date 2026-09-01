import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex gap-3">
        {variant === 'danger' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/15">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
        )}
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
