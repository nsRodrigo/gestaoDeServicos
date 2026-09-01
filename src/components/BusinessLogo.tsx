import { Scissors } from 'lucide-react'
import { useBusinessLogo } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

export function BusinessLogo({ className }: { className?: string }) {
  const logoUrl = useBusinessLogo()
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return <Scissors className={cn('shrink-0 text-gold', className)} />
}
