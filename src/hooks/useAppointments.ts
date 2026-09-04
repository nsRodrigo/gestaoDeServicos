import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import type { AppointmentKind, AppointmentWithItems, LoyaltyAlert, LowStockAlert } from '@/types/database'

export interface AppointmentLineInput {
  id: string
  quantity: number
  /** id of the existing appointment_services/appointment_products row, when editing a pre-existing line */
  lineId?: string
  /** overrides the catalog price for this line, only for this appointment */
  customPrice?: number | null
}

export interface AppointmentFormInput {
  type?: AppointmentKind
  clientId: string | null
  clientName: string
  paymentMethodId: string | null
  notes: string
  date: string
  time: string
  durationMinutes: number
  services: AppointmentLineInput[]
  products: AppointmentLineInput[]
}

export interface CreateAppointmentResult {
  id: string
  appointment_number: number
  loyalty: LoyaltyAlert | null
  low_stock: LowStockAlert[]
}

export interface UpdateAppointmentResult {
  low_stock: LowStockAlert[]
  loyalty: LoyaltyAlert | null
}

const APPOINTMENT_SELECT = '*, appointment_services(*), appointment_products(*)'

function lineToJson(line: AppointmentLineInput, idKey: 'service_id' | 'product_id') {
  return {
    line_id: line.lineId ?? null,
    [idKey]: line.id,
    quantity: line.quantity,
    custom_price: line.customPrice ?? null,
  }
}

export function useAppointmentsByPeriod(startDate: string, endDate: string) {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['appointments', targetUserId, startDate, endDate],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('user_id', targetUserId!)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
      if (error) throw error
      return data as unknown as AppointmentWithItems[]
    },
  })
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: ['appointment', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('appointments').select(APPOINTMENT_SELECT).eq('id', id).single()
      if (error) throw error
      return data as unknown as AppointmentWithItems
    },
  })
}

/** Next appointment_number for display purposes only (the real one is assigned server-side on save). */
export function useNextAppointmentNumber() {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['next-appointment-number', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_number')
        .eq('user_id', targetUserId!)
        .order('appointment_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data?.appointment_number ?? 0) + 1
    },
  })
}

function friendlyError(message: string) {
  if (message.includes('Estoque insuficiente')) return message
  if (message.includes('pelo menos um serviço')) return 'Informe pelo menos um serviço.'
  if (message.includes('pelo menos um produto')) return 'Informe pelo menos um produto.'
  if (message.includes('Cliente inválido')) return 'Cliente inválido.'
  if (message.includes('Forma de pagamento inválida')) return 'Forma de pagamento inválida.'
  if (message.includes('Já existe um atendimento nesse horário')) return message
  if (message.includes('já foi concluído ou cancelado')) return message
  if (message.includes('não está mais agendado')) return message
  if (message.includes('podem ser concluídos')) return message
  if (message.includes('podem ser cancelados')) return message
  if (message.includes('Atendimento não encontrado')) return 'Atendimento não encontrado.'
  return 'Não foi possível salvar o atendimento.'
}

export function useAppointmentMutations() {
  const queryClient = useQueryClient()
  const { actingAs } = useEffectiveUser()
  const targetUserId = actingAs?.userId ?? null

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
    queryClient.invalidateQueries({ queryKey: ['appointment'] })
    queryClient.invalidateQueries({ queryKey: ['reports'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['next-appointment-number'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const create = useMutation({
    mutationFn: async (input: AppointmentFormInput) => {
      const { data, error } = await supabase.rpc('fn_create_appointment', {
        p_client_id: input.clientId,
        p_client_name: input.clientName || null,
        p_notes: input.notes || null,
        p_date: input.date,
        p_time: input.time,
        p_payment_method_id: input.paymentMethodId,
        p_services: input.services.map((s) => lineToJson(s, 'service_id')),
        p_products: input.products.map((p) => lineToJson(p, 'product_id')),
        p_target_user_id: targetUserId,
        p_duration_minutes: input.durationMinutes,
        p_type: input.type ?? 'atendimento',
      })
      if (error) throw new Error(friendlyError(error.message))
      return data as unknown as CreateAppointmentResult
    },
    onSuccess: invalidateAll,
  })

  const update = useMutation({
    mutationFn: async ({ id, input, conclude }: { id: string; input: AppointmentFormInput; conclude?: boolean }) => {
      const { data, error } = await supabase.rpc('fn_update_appointment', {
        p_appointment_id: id,
        p_client_id: input.clientId,
        p_client_name: input.clientName || null,
        p_notes: input.notes || null,
        p_date: input.date,
        p_time: input.time,
        p_payment_method_id: input.paymentMethodId,
        p_services: input.services.map((s) => lineToJson(s, 'service_id')),
        p_products: input.products.map((p) => lineToJson(p, 'product_id')),
        p_target_user_id: targetUserId,
        p_duration_minutes: input.durationMinutes,
        p_conclude: conclude ?? false,
      })
      if (error) throw new Error(friendlyError(error.message))
      return data as unknown as UpdateAppointmentResult
    },
    onSuccess: invalidateAll,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id)
      if (error) throw new Error('Não foi possível excluir o atendimento.')
    },
    onSuccess: invalidateAll,
  })

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('fn_cancel_appointment', {
        p_appointment_id: id,
        p_target_user_id: targetUserId,
      })
      if (error) throw new Error(friendlyError(error.message))
    },
    onSuccess: invalidateAll,
  })

  return { create, update, remove, cancel }
}
