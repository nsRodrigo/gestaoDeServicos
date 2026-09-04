import { Link } from 'react-router-dom'
import { Scissors, ShoppingBag, Settings, LogOut, ChevronRight, Users, Wallet, ShieldCheck, Building2, Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

const items = [
  { to: '/vendas/novo', label: 'Nova venda', icon: ShoppingBag },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/tipos-de-corte', label: 'Tipos de Corte', icon: Scissors },
  { to: '/produtos-extras', label: 'Produtos / Extras', icon: ShoppingBag },
  { to: '/formas-pagamento', label: 'Formas de Pagamento', icon: Wallet },
  { to: '/notificacoes', label: 'Notificações', icon: Bell },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function More() {
  const { displayName, user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const navItems =
    profile?.role === 'admin'
      ? [
          ...items,
          { to: '/empresas', label: 'Trocar empresa', icon: Building2 },
          { to: '/administracao', label: 'Administração', icon: ShieldCheck },
        ]
      : items

  return (
    <div className="flex flex-col gap-5 md:hidden">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {navItems.map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <Icon className="h-4 w-4 text-muted" />
            {label}
            <ChevronRight className="ml-auto h-4 w-4 text-muted" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => signOut()}
        className="flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3.5 text-sm font-medium text-danger"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </div>
  )
}
