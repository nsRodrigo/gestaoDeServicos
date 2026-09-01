import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useActingAsContext } from '@/hooks/useActingAs'
import type { ProfileRow } from '@/types/database'

export const DEFAULT_BUSINESS_NAME = 'Barbearia Profissional'

/** Always the logged-in user's own profile — used for role/account_status checks. */
export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      if (error) throw error
      return data as ProfileRow
    },
  })
}

function useTargetUserId() {
  const { user } = useAuth()
  const { data: ownProfile } = useProfile()
  const { actingAs } = useActingAsContext()
  const isAdmin = ownProfile?.role === 'admin'
  return isAdmin && actingAs ? actingAs.userId : (user?.id ?? null)
}

/** Profile of the company currently being viewed (the admin's own, unless acting as another). */
export function useTargetProfile() {
  const targetUserId = useTargetUserId()
  return useQuery({
    queryKey: ['profile', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', targetUserId!).single()
      if (error) throw error
      return data as ProfileRow
    },
  })
}

/** Business name for display, with the default fallback baked in. */
export function useBusinessName() {
  const { data } = useTargetProfile()
  return data?.business_name?.trim() || DEFAULT_BUSINESS_NAME
}

export function useProfileMutations() {
  const queryClient = useQueryClient()
  const targetUserId = useTargetUserId()

  const updateBusinessName = useMutation({
    mutationFn: async (businessName: string) => {
      if (!targetUserId) throw new Error('not authenticated')
      const { error } = await supabase
        .from('profiles')
        .update({ business_name: businessName.trim() || null })
        .eq('id', targetUserId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })

  return { updateBusinessName }
}
