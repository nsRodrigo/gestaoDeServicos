import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    'Supabase não configurado: crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Exposição temporária para depuração local (só em modo dev — não entra no build de produção).
if (import.meta.env.DEV) {
  ;(window as unknown as { supabase: typeof supabase }).supabase = supabase
}
