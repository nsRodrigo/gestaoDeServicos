import { Download, Share, X } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export function InstallPromptBanner() {
  const { showAndroidPrompt, showIosHint, promptInstall, dismiss } = useInstallPrompt()

  if (!showAndroidPrompt && !showIosHint) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/10">
          {showIosHint ? <Share className="h-5 w-5 text-gold" /> : <Download className="h-5 w-5 text-gold" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Instale o app</p>
          <p className="text-xs text-muted">
            {showIosHint
              ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".'
              : 'Acesso mais rápido, direto da tela inicial do seu aparelho.'}
          </p>
        </div>
        {!showIosHint && (
          <button
            onClick={promptInstall}
            className="shrink-0 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-black hover:bg-gold-light"
          >
            Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
