import { Bell, PackageX } from 'lucide-react'
import { useNotifications, useNotificationMutations } from '@/hooks/useNotifications'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications()
  const { markRead, markAllRead } = useNotificationMutations()

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0

  if (isLoading) return <LoadingState />

  if (!notifications || notifications.length === 0) {
    return <EmptyState icon={Bell} title="Nenhuma notificação por aqui." description="Avisos de estoque baixo aparecem aqui." />
  }

  return (
    <div className="flex flex-col gap-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
            Marcar todas como lidas
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read_at && markRead.mutate(n.id)}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4 text-left',
              n.read_at ? 'border-border bg-surface' : 'border-gold/40 bg-gold/5',
            )}
          >
            <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="mt-0.5 text-sm text-muted">{n.message}</p>
              <p className="mt-1 text-xs text-muted">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
            </div>
            {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
          </button>
        ))}
      </div>
    </div>
  )
}
