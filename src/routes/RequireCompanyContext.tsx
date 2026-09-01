import { Navigate, Outlet } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile'
import { useActingAsContext } from '@/hooks/useActingAs'
import { LoadingState } from '@/components/ui/LoadingState'

/**
 * Gate for every "company data" screen (Dashboard, Atendimentos, etc). A regular
 * user always passes straight through. An admin who hasn't picked a company yet
 * gets redirected to the company picker first.
 */
export function RequireCompanyContext() {
  const { data: profile, isLoading } = useProfile()
  const { actingAs } = useActingAsContext()

  if (isLoading) return <LoadingState label="Carregando..." />
  if (profile?.role === 'admin' && !actingAs) return <Navigate to="/empresas" replace />

  return <Outlet />
}
