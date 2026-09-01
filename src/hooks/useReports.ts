import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import type { PeriodSummary } from '@/types/database'

export function usePeriodSummary(startDate: string, endDate: string) {
  const { targetUserId, actingAs } = useEffectiveUser()
  return useQuery({
    queryKey: ['reports', targetUserId, startDate, endDate],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_report_summary', {
        p_start: startDate,
        p_end: endDate,
        p_target_user_id: actingAs?.userId ?? null,
      })
      if (error) throw error
      return data as unknown as PeriodSummary
    },
  })
}
