import { supabase } from '@/lib/supabase'

const MAX_SIZE_BYTES = 2 * 1024 * 1024

export async function uploadLogo(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Envie um arquivo de imagem.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Imagem muito grande (máximo 2MB).')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/logo.${ext}`

  const { error } = await supabase.storage.from('logos').upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw error

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
