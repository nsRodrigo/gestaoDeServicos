import { NavLink } from 'react-router-dom'
import { Home, CalendarClock, Scissors, ShoppingBag, FileBarChart, Settings, LogOut, Plus, Users, Wallet, ShieldCheck, Building2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBusinessName, useProfile } from '@/hooks/useProfile'
import { useActingAsContext } from '@/hooks/useActingAs'
import { BusinessLogo } from '@/components/BusinessLogo'
import { NotificationBell } from '@/components/NotificationBell'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/atendimentos', label: 'Atendimentos', icon: CalendarClock },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/tipos-de-corte', label: 'Tipos de Corte', icon: Scissors },
  { to: '/produtos-extras', label: 'Produtos / Extras', icon: ShoppingBag },
  { to: '/formas-pagamento', label: 'Formas de Pagamento', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { displayName, signOut } = useAuth()
  const businessName = useBusinessName()
  const { data: profile } = useProfile()
  const { actingAs } = useActingAsContext()
  const isAdmin = profile?.role === 'admin'
  const navItems = isAdmin
    ? [
        ...items,
        { to: '/empresas', label: 'Trocar empresa', icon: Building2 },
        { to: '/administracao', label: 'Administração', icon: ShieldCheck },
      ]
    : items

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <BusinessLogo className="h-6 w-6" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{businessName}</p>
          {isAdmin && actingAs && (
            <p className="truncate text-xs leading-tight text-gold">Visualizando como admin</p>
          )}
        </div>
        <NotificationBell />
      </div>

      <div className="flex flex-col gap-2 px-4">
        <NavLink to="/atendimentos/novo">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-black hover:bg-gold-light">
            <Plus className="h-4 w-4" /> Novo atendimento
          </button>
        </NavLink>
        <NavLink to="/vendas/novo">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover">
            <ShoppingBag className="h-4 w-4" /> Nova venda
          </button>
        </NavLink>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground',
                isActive && 'bg-gold/10 text-gold hover:bg-gold/10 hover:text-gold',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted">{isAdmin ? 'Administrador geral' : 'Barbeiro'}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-danger"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  )
}
