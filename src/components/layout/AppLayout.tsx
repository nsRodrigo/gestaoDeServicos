import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import { useActingAsContext } from '@/hooks/useActingAs'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/atendimentos': 'Atendimentos',
  '/atendimentos/novo': 'Novo atendimento',
  '/tipos-de-corte': 'Tipos de Corte',
  '/produtos-extras': 'Produtos / Extras',
  '/clientes': 'Clientes',
  '/formas-pagamento': 'Formas de Pagamento',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
  '/mais': 'Mais',
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const title = titles[location.pathname]
  const { actingAs } = useEffectiveUser()
  const { clearActingAs } = useActingAsContext()

  function switchCompany() {
    clearActingAs()
    navigate('/empresas')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {actingAs && (
          <div className="flex items-center justify-center gap-2 bg-gold px-4 py-2 text-center text-xs font-medium text-black">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Visualizando como admin: {actingAs.label}</span>
            <button onClick={switchCompany} className="shrink-0 underline underline-offset-2">
              Trocar empresa
            </button>
          </div>
        )}
        <TopBar title={title} />
        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
