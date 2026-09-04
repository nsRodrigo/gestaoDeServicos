import { cn } from '@/lib/utils'

export function AppVersionBadge({ className }: { className?: string }) {
  return <span className={cn('text-[11px] text-muted/70', className)}>v{__APP_VERSION__}</span>
}
