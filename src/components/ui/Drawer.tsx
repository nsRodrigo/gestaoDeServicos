import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  className?: string
}

export function Drawer({ open, onOpenChange, title, children, className }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl focus:outline-none',
            'md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border',
            className,
          )}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border md:hidden" />
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
            <Dialog.Close className="text-muted hover:text-foreground" aria-label="Fechar">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
