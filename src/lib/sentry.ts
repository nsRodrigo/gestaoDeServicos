import * as Sentry from '@sentry/react'

// Sem VITE_SENTRY_DSN configurada isso é um no-op — não força ninguém a ter conta no Sentry
// pra rodar o app localmente ou em CI. Configure a chave em produção pra passar a receber os
// erros que hoje só aparecem quando um usuário reclama (ex.: o bug de e-mail não confirmado).
const dsn = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  if (!dsn) return
  Sentry.init({ dsn })
}

export const SentryErrorBoundary = Sentry.ErrorBoundary
