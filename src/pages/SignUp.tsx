import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SignUp() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await signUp(email, password, name)
    setLoading(false)
    if (error) setError(error)
    else setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </Link>

        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Clock className="h-10 w-10 text-gold" />
            <h1 className="text-lg font-semibold">Solicitação enviada</h1>
            <p className="text-sm text-muted">
              Sua conta foi criada e está aguardando aprovação do administrador. Assim que for liberada, você poderá
              entrar normalmente.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-semibold">Criar conta</h1>
            <p className="mb-6 text-sm text-muted">
              Seu acesso precisa ser aprovado pelo administrador antes de você conseguir entrar.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Nome" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Senha"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" size="lg" loading={loading}>
                Solicitar acesso
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
