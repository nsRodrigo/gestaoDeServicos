import { useBusinessName } from '@/hooks/useProfile'
import { BusinessLogo } from '@/components/BusinessLogo'
import { NotificationBell } from '@/components/NotificationBell'

export function TopBar({ title }: { title?: string }) {
  const businessName = useBusinessName()
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3.5 backdrop-blur md:hidden">
      <BusinessLogo className="h-5 w-5" />
      <span className="truncate text-sm font-semibold">{title ?? businessName}</span>
      <NotificationBell className="ml-auto" />
    </header>
  )
}
