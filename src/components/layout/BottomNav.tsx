import { NavLink } from 'react-router-dom'
import { Home, CalendarClock, Plus, FileBarChart, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/atendimentos', label: 'Atendimentos', icon: CalendarClock },
  { to: '/atendimentos/novo', label: 'Novo', icon: Plus, highlight: true },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { to: '/mais', label: 'Mais', icon: Menu },
]

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegação principal"
    >
      <ul className="flex items-stretch justify-between px-1">
        {items.map(({ to, label, icon: Icon, end, highlight }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted',
                  isActive && !highlight && 'text-gold',
                )
              }
            >
              {({ isActive }) =>
                highlight ? (
                  <>
                    <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-black shadow-lg shadow-gold/20">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className={cn(isActive && 'text-gold')}>{label}</span>
                  </>
                ) : (
                  <>
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
