import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, setRememberMe } from '@/lib/supabase'
import { ACTING_AS_STORAGE_KEY } from '@/hooks/useActingAs'
import { hasBiometricEnabled, verifyBiometric } from '@/lib/biometric'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  displayName: string
  locked: boolean
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: string | null }>
  signInWithGoogle: (remember?: boolean) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  unlockWithBiometric: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Evita contas duplicadas/travadas por espaço ou maiúscula digitados sem querer:
// o e-mail que confirma o cadastro precisa ser o mesmo, byte a byte, que o do login.
function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    let settled = false
    // Se getSession() nunca resolver nem rejeitar (trava conhecida do supabase-js em alguns
    // cenários de refresh token inválido/corrompido), isso evita ficar preso para sempre em
    // "Carregando sessão...".
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        setLoading(false)
      }
    }, 8000)

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        setSession(data.session)
        setLoading(false)
        // Só trava se já existia uma sessão salva ao abrir o app (ex.: reabriu o navegador);
        // um login com senha feito agora nunca passa por aqui.
        if (data.session && hasBiometricEnabled(data.session.user.id)) {
          setLocked(true)
        }
      })
      .catch(() => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      clearTimeout(timeout)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function unlockWithBiometric() {
    if (!session) return { error: 'Sessão não encontrada.' }
    try {
      const ok = await verifyBiometric(session.user.id)
      if (!ok) return { error: 'Biometria não reconhecida.' }
      setLocked(false)
      return { error: null }
    } catch {
      return { error: 'Não foi possível verificar a biometria.' }
    }
  }

  async function signIn(email: string, password: string, remember = true) {
    setRememberMe(remember)
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('invalid login credentials')) {
        return { error: 'E-mail ou senha incorretos.' }
      }
      if (message.includes('email not confirmed')) {
        return { error: 'E-mail ainda não confirmado. Verifique sua caixa de entrada ou peça para o administrador liberar seu acesso.' }
      }
      return { error: 'Não foi possível entrar. Tente novamente.' }
    }
    return { error: null }
  }

  async function signInWithGoogle(remember = true) {
    setRememberMe(remember)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) {
      return { error: 'Não foi possível entrar com o Google. Tente novamente.' }
    }
    return { error: null }
  }

  async function signUp(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { name } },
    })
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return { error: 'Já existe uma conta com esse e-mail.' }
      }
      return { error: 'Não foi possível criar a conta. Tente novamente.' }
    }
    return { error: null }
  }

  async function signOut() {
    try {
      sessionStorage.removeItem(ACTING_AS_STORAGE_KEY)
    } catch {
      // ignora
    }
    setLocked(false)
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      return { error: 'Não foi possível enviar o e-mail de recuperação.' }
    }
    return { error: null }
  }

  const displayName =
    (session?.user.user_metadata?.name as string | undefined) ??
    session?.user.email?.split('@')[0] ??
    'Barbeiro'

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        displayName,
        locked,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        resetPassword,
        unlockWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
