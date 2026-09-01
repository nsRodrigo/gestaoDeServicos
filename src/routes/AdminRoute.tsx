import { Navigate, Outlet } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile'
import { LoadingState } from '@/components/ui/LoadingState'

export function AdminRoute() {
  const { data: profile, isLoading } = useProfile()

  if (isLoading) return <LoadingState label="Carregando..." />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}
