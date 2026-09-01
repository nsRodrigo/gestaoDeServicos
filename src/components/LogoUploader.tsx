import { useRef, useState, type ChangeEvent } from 'react'
import { Scissors, Upload } from 'lucide-react'
import { uploadLogo } from '@/lib/logoUpload'
import { useToast } from '@/components/ui/Toast'

interface LogoUploaderProps {
  userId: string
  logoUrl: string | null
  onUploaded: (url: string) => void
}

export function LogoUploader({ userId, logoUrl, onUploaded }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadLogo(userId, file)
      onUploaded(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-gold/10">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo da barbearia" className="h-full w-full object-cover" />
        ) : (
          <Scissors className="h-7 w-7 text-gold" />
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
        >
          <Upload className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Enviar logo'}
        </button>
        <p className="mt-1 text-xs text-muted">PNG ou JPG, até 2MB. Opcional.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  )
}
