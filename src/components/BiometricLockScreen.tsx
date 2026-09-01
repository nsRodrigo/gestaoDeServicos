import { useState } from 'react'
import { Fingerprint, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export function BiometricLockScreen() {
  const { displayName, signOut, unlockWithBiometric } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleUnlock() {
    setError(null)
    setLoading(true)
    const { error } = await unlockWithBiometric()
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
        <Fingerprint className="h-7 w-7 text-gold" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">App travado</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Olá, {displayName}. Use a digital ou o reconhecimento facial deste aparelho para continuar.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3">
        <Button size="lg" loading={loading} onClick={handleUnlock}>
          <Fingerprint className="h-4 w-4" /> Desbloquear
        </Button>
        <Button variant="ghost" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" /> Sair e entrar com senha
        </Button>
      </div>
    </div>
  )
}
