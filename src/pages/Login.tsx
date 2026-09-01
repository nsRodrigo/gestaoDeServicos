import { useState, type FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password, remember)
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
            <Scissors className="h-7 w-7 text-gold" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">BARBEARIA</h1>
          <p className="text-xs tracking-[0.3em] text-muted">PROFISSIONAL</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="seuemail@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordInput
            label="Senha"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-surface accent-[rgb(var(--color-gold))]"
            />
            Lembrar-me
          </label>

          <Button type="submit" size="lg" loading={loading} className="mt-2">
            Entrar
          </Button>

          <Link to="/esqueci-minha-senha" className="text-center text-sm text-gold hover:text-gold-light">
            Esqueci minha senha
          </Link>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Não tem conta?{' '}
          <Link to="/criar-conta" className="text-gold hover:text-gold-light">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
