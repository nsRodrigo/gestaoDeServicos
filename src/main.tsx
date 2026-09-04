import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/hooks/useAuth'
import { ActingAsProvider } from '@/hooks/useActingAs'
import { ThemeProvider } from '@/hooks/useAppTheme'
import { ToastProvider } from '@/components/ui/Toast'
import { InstallPromptBanner } from '@/components/InstallPromptBanner'
import { initSentry, SentryErrorBoundary } from '@/lib/sentry'
import App from './App'
import './index.css'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-4 text-center">
          <p className="text-lg font-semibold">Algo deu errado.</p>
          <p className="text-sm text-muted">Recarregue a página. Se persistir, avise o suporte.</p>
        </div>
      }
    >
      <div id="app-shell">
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ActingAsProvider>
                <ThemeProvider>
                  <ToastProvider>
                    <App />
                    <InstallPromptBanner />
                  </ToastProvider>
                </ThemeProvider>
              </ActingAsProvider>
            </AuthProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </div>
      <div id="print-root" />
    </SentryErrorBoundary>
  </StrictMode>,
)
