import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffectiveUser } from '@/hooks/useEffectiveUser'
import type { ProductRow, Status } from '@/types/database'

export interface ProductInput {
  name: string
  description: string
  price: number
  stockControl: boolean
  stockQuantity: number
  minimumStock: number
}

export function useProducts() {
  const { targetUserId } = useEffectiveUser()
  return useQuery({
    queryKey: ['products', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('name', { ascending: true })
      if (error) throw error
      return data as ProductRow[]
    },
  })
}

export function useActiveProducts() {
  const query = useProducts()
  return {
    ...query,
    data: query.data?.filter((p) => p.status === 'active'),
  }
}

export function useProductMutations() {
  const queryClient = useQueryClient()
  const { targetUserId } = useEffectiveUser()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] })

  const create = useMutation({
    mutationFn: async (input: ProductInput) => {
      if (!targetUserId) throw new Error('not authenticated')
      const { error } = await supabase.from('products').insert({
        user_id: targetUserId,
        name: input.name,
        description: input.description || null,
        price: input.price,
        stock_control: input.stockControl,
        stock_quantity: input.stockQuantity,
        minimum_stock: input.minimumStock,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ProductInput }) => {
      const { error } = await supabase
        .from('products')
        .update({
          name: input.name,
          description: input.description || null,
          price: input.price,
          stock_control: input.stockControl,
          stock_quantity: input.stockQuantity,
          minimum_stock: input.minimumStock,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from('products').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { create, update, setStatus }
}
