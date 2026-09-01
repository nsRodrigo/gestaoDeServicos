import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  show: (title: string, options?: { description?: string; variant?: ToastVariant }) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
  error: <XCircle className="h-5 w-5 text-danger shrink-0" />,
  info: <Info className="h-5 w-5 text-gold shrink-0" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback<ToastContextValue['show']>((title, options) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, title, description: options?.description, variant: options?.variant ?? 'info' }])
  }, [])

  const success = useCallback((title: string, description?: string) => show(title, { description, variant: 'success' }), [show])
  const error = useCallback((title: string, description?: string) => show(title, { description, variant: 'error' }), [show])

  function remove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => !open && remove(item.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg',
              'data-[state=open]:animate-[toast-in_0.2s_ease-out] data-[state=closed]:opacity-0',
              'w-[calc(100vw-2rem)] max-w-sm',
            )}
          >
            {icons[item.variant]}
            <div className="flex-1 min-w-0">
              <RadixToast.Title className="text-sm font-medium text-foreground">{item.title}</RadixToast.Title>
              {item.description && (
                <RadixToast.Description className="mt-0.5 text-xs text-muted">{item.description}</RadixToast.Description>
              )}
            </div>
            <RadixToast.Close aria-label="Fechar" className="text-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 outline-none md:bottom-6 md:left-auto md:right-6 md:translate-x-0" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
