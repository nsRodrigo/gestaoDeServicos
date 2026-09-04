import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { data: count } = useUnreadNotificationsCount()
  const unread = count ?? 0

  return (
    <button
      type="button"
      onClick={() => navigate('/notificacoes')}
      aria-label={unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações'}
      className={cn('relative rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground', className)}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
