import { NavLink, Outlet } from 'react-router-dom'
import { Building2, ShieldCheck, LogOut, Scissors } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBusinessName } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/administracao', label: 'Contas', icon: ShieldCheck },
]

export function AdminShell() {
  const { signOut } = useAuth()
  const businessName = useBusinessName()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <Scissors className="h-5 w-5 shrink-0 text-gold" />
            <span className="truncate text-sm font-semibold">{businessName} · Administração</span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted hover:text-danger"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground',
                  isActive && 'border-gold text-gold hover:text-gold',
                )
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
