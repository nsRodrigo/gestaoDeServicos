import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingState({ label = 'Carregando...', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-14 text-muted', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-hover', className)} />
}
