import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await resetPassword(email)
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
            <MailCheck className="h-10 w-10 text-success" />
            <h1 className="text-lg font-semibold">Verifique seu e-mail</h1>
            <p className="text-sm text-muted">
              Se houver uma conta para <strong className="text-foreground">{email}</strong>, enviamos um link para
              redefinir sua senha.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-semibold">Esqueci minha senha</h1>
            <p className="mb-6 text-sm text-muted">Informe seu e-mail para receber o link de redefinição.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" size="lg" loading={loading}>
                Enviar link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
