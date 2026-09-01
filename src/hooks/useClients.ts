import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import type { ClientRow, LoyaltyPeriod, Status } from '@/types/database'

export interface ClientInput {
  name: string
  phone: string
  email: string
  loyaltyEnabled: boolean
  loyaltyPeriod: LoyaltyPeriod | null
  loyaltyVisitsRequired: number | null
}

export function useClients() {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['clients', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('name', { ascending: true })
      if (error) throw error
      return data as ClientRow[]
    },
  })
}

export function useActiveClients() {
  const query = useClients()
  return {
    ...query,
    data: query.data?.filter((c) => c.status === 'active'),
  }
}

export function useClientMutations() {
  const queryClient = useQueryClient()
  const { targetUserId } = useEffectiveUser()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clients'] })

  const create = useMutation({
    mutationFn: async (input: ClientInput) => {
      if (!targetUserId) throw new Error('not authenticated')
      const { error } = await supabase.from('clients').insert({
        user_id: targetUserId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        status: 'active',
        loyalty_enabled: input.loyaltyEnabled,
        loyalty_period: input.loyaltyEnabled ? input.loyaltyPeriod : null,
        loyalty_visits_required: input.loyaltyEnabled ? input.loyaltyVisitsRequired : null,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ClientInput }) => {
      const { error } = await supabase
        .from('clients')
        .update({
          name: input.name,
          phone: input.phone || null,
          email: input.email || null,
          loyalty_enabled: input.loyaltyEnabled,
          loyalty_period: input.loyaltyEnabled ? input.loyaltyPeriod : null,
          loyalty_visits_required: input.loyaltyEnabled ? input.loyaltyVisitsRequired : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from('clients').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { create, update, setStatus }
}
