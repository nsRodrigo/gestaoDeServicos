import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import type { PaymentMethodRow, Status } from '@/types/database'

export function usePaymentMethods() {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['payment_methods', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('name', { ascending: true })
      if (error) throw error
      return data as PaymentMethodRow[]
    },
  })
}

export function useActivePaymentMethods() {
  const query = usePaymentMethods()
  return {
    ...query,
    data: query.data?.filter((p) => p.status === 'active'),
  }
}

export function usePaymentMethodMutations() {
  const queryClient = useQueryClient()
  const { targetUserId, actingAs } = useEffectiveUser()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payment_methods'] })

  const create = useMutation({
    mutationFn: async (name: string) => {
      if (!targetUserId) throw new Error('not authenticated')
      const { error } = await supabase.from('payment_methods').insert({ user_id: targetUserId, name, status: 'active' })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('payment_methods').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from('payment_methods').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('fn_set_default_payment_method', {
        p_id: id,
        p_target_user_id: actingAs?.userId ?? null,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { create, update, setStatus, setDefault }
}
