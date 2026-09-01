import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    'Supabase não configurado: crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).',
  )
}

// "Lembrar-me" desmarcado no login = guarda a sessão em sessionStorage (some ao fechar o
// navegador) em vez de localStorage (sobrevive pra sempre). setRememberMe precisa ser chamado
// ANTES do signInWithPassword, pra sessão gerada já cair no lugar certo.
const REMEMBER_KEY = 'auth_remember_me'

export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false')
}

function activeStorage() {
  return localStorage.getItem(REMEMBER_KEY) === 'false' ? sessionStorage : localStorage
}

const dynamicStorage = {
  getItem: (key: string) => activeStorage().getItem(key),
  setItem: (key: string, value: string) => activeStorage().setItem(key, value),
  removeItem: (key: string) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: dynamicStorage,
  },
})

// Exposição temporária para depuração local (só em modo dev — não entra no build de produção).
if (import.meta.env.DEV) {
  ;(window as unknown as { supabase: typeof supabase }).supabase = supabase
}
