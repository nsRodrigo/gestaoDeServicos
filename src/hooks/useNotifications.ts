import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import type { NotificationRow } from '@/types/database'

export function useNotifications() {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['notifications', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as NotificationRow[]
    },
  })
}

export function useUnreadNotificationsCount() {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['notifications', targetUserId, 'unread-count'],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId!)
        .is('read_at', null)
      if (error) throw error
      return count ?? 0
    },
  })
}

export function useNotificationMutations() {
  const queryClient = useQueryClient()
  const { targetUserId } = useEffectiveUser()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!targetUserId) return
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', targetUserId)
        .is('read_at', null)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { markRead, markAllRead }
}
