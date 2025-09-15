import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'

// ===========================
// STANDARD PATTERN: Payment Hook Factory
// ===========================

/**
 * Factory function that creates payment hooks with proper QueryClient injection
 * This is the standard enterprise pattern for monorepo shared hooks
 */
export function createPaymentHooks(useQuery: any) {
  return {
    usePayment: (id: string) => {
      return useQuery({
        queryKey: ['payment', id],
        queryFn: async () => {
          const client = tabsyClient
          return await client.payment.getById(id)
        },
        enabled: !!id,
      })
    },

    useOrderPayments: (orderId: string) => {
      return useQuery({
        queryKey: ['payments', 'order', orderId],
        queryFn: async () => {
          const client = tabsyClient
          return await client.payment.getByOrder(orderId)
        },
        enabled: !!orderId,
      })
    },

    useRestaurantPayments: (restaurantId: string, filters?: any) => {
      return useQuery({
        queryKey: ['payments', 'restaurant', restaurantId, filters],
        queryFn: async () => {
          const client = tabsyClient
          return await client.payment.getByRestaurant(restaurantId, filters)
        },
        enabled: !!restaurantId,
      })
    },

    usePaymentReceipt: (paymentId: string) => {
      return useQuery({
        queryKey: ['payment-receipt', paymentId],
        queryFn: async () => {
          const client = tabsyClient
          return await client.payment.getReceipt(paymentId)
        },
        enabled: !!paymentId,
      })
    },

    useSplitPayments: (groupId: string) => {
      return useQuery({
        queryKey: ['split-payments', groupId],
        queryFn: async () => {
          const client = tabsyClient
          return await client.payment.getSplitPayments(groupId)
        },
        enabled: !!groupId,
      })
    }
  }
}

// ===========================
// STANDARD PATTERN: Payment Mutations (use queryClient directly)
// ===========================
export function useCreatePaymentIntent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const client = tabsyClient
      return await client.payment.createIntent(data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'order', variables.orderId] })
    }
  })
}

export function useCreateOrderPayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { orderId: string } & any) => {
      const client = tabsyClient
      return await client.payment.createForOrder(data.orderId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'order', variables.orderId] })
    }
  })
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { paymentId: string; status: any }) => {
      const client = tabsyClient
      return await client.payment.updateStatus(data.paymentId, data.status)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment', variables.paymentId] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })
}

export function useAddTip() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { paymentId: string; tipAmount: number }) => {
      const client = tabsyClient
      return await client.payment.addTip(data.paymentId, data.tipAmount)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment', variables.paymentId] })
    }
  })
}

export function useRecordCashPayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const client = tabsyClient
      return await client.payment.recordCash(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })
}

export function useCreateSplitPayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const client = tabsyClient
      return await client.payment.createSplit(data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'order', variables.orderId] })
    }
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const client = tabsyClient
      return await client.payment.delete(paymentId)
    },
    onSuccess: (_, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.removeQueries({ queryKey: ['payment', paymentId] })
    }
  })
}
