import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AccountStatus, AdminAccountRow } from '@/types/database'

export function useAdminAccounts() {
  return useQuery({
    queryKey: ['admin-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_admin_list_accounts')
      if (error) throw error
      return data as AdminAccountRow[]
    },
  })
}

export function useAdminAccountMutations() {
  const queryClient = useQueryClient()

  const setStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: AccountStatus }) => {
      const { error } = await supabase.rpc('fn_admin_set_account_status', { p_user_id: userId, p_status: status })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-accounts'] }),
  })

  const deleteAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('fn_admin_delete_account', { p_user_id: userId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-accounts'] }),
  })

  return { setStatus, deleteAccount }
}
