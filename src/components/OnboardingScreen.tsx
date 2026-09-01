import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSelfProfileMutations, DEFAULT_BUSINESS_NAME } from '@/hooks/useProfile'
import { LogoUploader } from '@/components/LogoUploader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function OnboardingScreen() {
  const { user, displayName } = useAuth()
  const { completeOnboarding, skipOnboarding } = useSelfProfileMutations()
  const [businessName, setBusinessName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  if (!user) return null

  async function handleContinue() {
    await completeOnboarding.mutateAsync({ businessName, logoUrl })
  }

  async function handleSkip() {
    await skipOnboarding.mutateAsync()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
            <Scissors className="h-7 w-7 text-gold" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">Bem-vindo, {displayName}!</h1>
          <p className="mt-1 text-sm text-muted">
            Vamos personalizar sua barbearia. Dá pra mudar tudo isso depois em Configurações.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <Input
            label="Nome da barbearia"
            placeholder={DEFAULT_BUSINESS_NAME}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Logo</p>
            <LogoUploader userId={user.id} logoUrl={logoUrl} onUploaded={setLogoUrl} />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <Button size="lg" onClick={handleContinue} loading={completeOnboarding.isPending}>
              Continuar
            </Button>
            <Button variant="ghost" onClick={handleSkip} loading={skipOnboarding.isPending}>
              Pular por agora
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
