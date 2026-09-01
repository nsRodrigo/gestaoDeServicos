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
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
