import { Navigate, Outlet } from 'react-router-dom'
import { Clock, ShieldX, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { LoadingState } from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/Button'
import { BiometricLockScreen } from '@/components/BiometricLockScreen'

function StatusScreen({ icon: Icon, title, description }: { icon: typeof Clock; title: string; description: string }) {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Icon className="h-10 w-10 text-gold" />
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      </div>
      <Button variant="secondary" onClick={() => signOut()}>
        <LogOut className="h-4 w-4" /> Sair
      </Button>
    </div>
  )
}

export function ProtectedRoute() {
  const { session, loading, locked } = useAuth()
  const { data: profile, isLoading: loadingProfile } = useProfile()

  if (loading || (session && loadingProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState label="Carregando sessão..." />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (locked) {
    return <BiometricLockScreen />
  }

  if (profile?.account_status === 'pending') {
    return (
      <StatusScreen
        icon={Clock}
        title="Sua conta está aguardando aprovação"
        description="Assim que o administrador liberar o acesso, você poderá entrar normalmente. Tente novamente mais tarde."
      />
    )
  }

  if (profile?.account_status === 'blocked') {
    return (
      <StatusScreen
        icon={ShieldX}
        title="Sua conta está bloqueada"
        description="Fale com o administrador do sistema para mais informações."
      />
    )
  }

  return <Outlet />
}
