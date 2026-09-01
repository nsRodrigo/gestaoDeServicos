import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import type { ServiceRow, Status } from '@/types/database'

export interface ServiceInput {
  name: string
  description: string
  price: number
}

export function useServices() {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['services', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('name', { ascending: true })
      if (error) throw error
      return data as ServiceRow[]
    },
  })
}

export function useActiveServices() {
  const query = useServices()
  return {
    ...query,
    data: query.data?.filter((s) => s.status === 'active'),
  }
}

export function useServiceMutations() {
  const queryClient = useQueryClient()
  const { targetUserId } = useEffectiveUser()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] })

  const create = useMutation({
    mutationFn: async (input: ServiceInput) => {
      if (!targetUserId) throw new Error('not authenticated')
      const { error } = await supabase.from('services').insert({
        user_id: targetUserId,
        name: input.name,
        description: input.description || null,
        price: input.price,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ServiceInput }) => {
      const { error } = await supabase
        .from('services')
        .update({ name: input.name, description: input.description || null, price: input.price })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from('services').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { create, update, setStatus }
}
