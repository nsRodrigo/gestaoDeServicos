import { useEffect, useState } from 'react'
import { Download, Fingerprint, LogOut, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTargetProfile, useProfileMutations, DEFAULT_BUSINESS_NAME } from '@/hooks/useProfile'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { todayISO } from '@/lib/format'
import {
  disableBiometric,
  enableBiometric,
  hasBiometricEnabled,
  isBiometricAvailableOnDevice,
} from '@/lib/biometric'

export default function Settings() {
  const { displayName, user, signOut } = useAuth()
  const { data: profile } = useTargetProfile()
  const { updateBusinessName } = useProfileMutations()
  const { targetUserId } = useEffectiveUser()
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => {
    if (profile) setBusinessName(profile.business_name ?? '')
  }, [profile])

  useEffect(() => {
    isBiometricAvailableOnDevice().then(setBiometricSupported)
  }, [])

  useEffect(() => {
    if (user) setBiometricEnabled(hasBiometricEnabled(user.id))
  }, [user])

  async function handleToggleBiometric() {
    if (!user) return
    setBiometricLoading(true)
    try {
      if (biometricEnabled) {
        disableBiometric(user.id)
        setBiometricEnabled(false)
        toast.success('Desbloqueio por biometria desativado.')
      } else {
        await enableBiometric(user.id, user.email ?? '', displayName)
        setBiometricEnabled(true)
        toast.success('Desbloqueio por biometria ativado.')
      }
    } catch {
      toast.error('Não foi possível configurar a biometria neste aparelho.')
    } finally {
      setBiometricLoading(false)
    }
  }

  async function handleSaveBusinessName() {
    try {
      await updateBusinessName.mutateAsync(businessName)
      toast.success('Nome da barbearia atualizado.')
    } catch {
      toast.error('Não foi possível salvar o nome da barbearia.')
    }
  }

  async function handleBackup() {
    if (!targetUserId) return
    setExporting(true)
    try {
      const [services, products, appointments] = await Promise.all([
        supabase.from('services').select('*').eq('user_id', targetUserId),
        supabase.from('products').select('*').eq('user_id', targetUserId),
        supabase
          .from('appointments')
          .select('*, appointment_services(*), appointment_products(*)')
          .eq('user_id', targetUserId),
      ])
      if (services.error || products.error || appointments.error) {
        throw services.error ?? products.error ?? appointments.error
      }

      const payload = {
        exported_at: new Date().toISOString(),
        user: user?.email,
        services: services.data,
        products: products.data,
        appointments: appointments.data,
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-barbearia-${todayISO()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Backup gerado com sucesso!', 'Salve o arquivo em um local seguro, como o Google Drive.')
    } catch {
      toast.error('Não foi possível gerar o backup.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="hidden text-xl font-semibold md:block">Configurações</h1>

      <Card>
        <CardTitle>Conta</CardTitle>
        <p className="mt-1 text-base font-medium text-foreground">{displayName}</p>
        <p className="text-sm text-muted">{user?.email}</p>
      </Card>

      <Card>
        <CardTitle>Nome da barbearia</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Aparece no menu, na tela inicial e no cabeçalho dos relatórios impressos.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            placeholder={DEFAULT_BUSINESS_NAME}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button onClick={handleSaveBusinessName} loading={updateBusinessName.isPending}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </Card>

      {biometricSupported && (
        <Card>
          <CardTitle>Segurança</CardTitle>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-medium text-foreground">Desbloqueio por biometria</p>
                <p className="text-sm text-muted">
                  Use a digital ou o reconhecimento facial deste aparelho para reabrir o app sem digitar a senha.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={biometricEnabled}
              disabled={biometricLoading}
              onClick={handleToggleBiometric}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                biometricEnabled ? 'bg-gold' : 'bg-surface-hover'
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  biometricEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Backup dos dados</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Baixe um arquivo com todos os seus serviços, produtos e atendimentos. Salve-o em um local seguro, como uma
          pasta sincronizada do Google Drive.
        </p>
        <Button className="mt-4" onClick={handleBackup} loading={exporting}>
          <Download className="h-4 w-4" /> Baixar backup
        </Button>
      </Card>

      <Button variant="danger" onClick={() => signOut()} className="md:w-fit">
        <LogOut className="h-4 w-4" /> Sair
      </Button>
    </div>
  )
}
