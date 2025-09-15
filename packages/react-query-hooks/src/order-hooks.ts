import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'
import type { OrderStatus } from '@tabsy/shared-types'

// ===========================
// SENIOR ENGINEER SOLUTION: Simple Hook Factory Pattern
// ===========================

/**
 * Factory function that creates order hooks with proper QueryClient injection
 * This is the clean, production-ready approach for monorepo shared hooks
 */
export function createOrderHooks(useQuery: any, useMutation?: any, useQueryClient?: any) {
  return {
    useOrdersByRestaurant: (restaurantId: string, filters?: any, options?: any) => {
      return useQuery({
        queryKey: ['orders', 'restaurant', restaurantId, filters],
        queryFn: async () => {
          console.log('useOrdersByRestaurant - Making API call:', {
            restaurantId,
            filters,
            hasToken: !!tabsyClient.getAuthToken()
          })
          const result = await tabsyClient.order.getByRestaurant(restaurantId, filters)
          console.log('useOrdersByRestaurant - API result:', result)
          return result
        },
        enabled: !!restaurantId,
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        ...options
      })
    },

    useOrders: (filters?: any) => {
      return useQuery({
        queryKey: ['orders', filters],
        queryFn: async () => {
          return await tabsyClient.order.list(filters)
        }
      })
    },

    useOrder: (id: string) => {
      return useQuery({
        queryKey: ['order', id],
        queryFn: async () => {
          return await tabsyClient.order.getById(id)
        },
        enabled: !!id
      })
    },

    // Add mutation hooks if dependencies are available
    ...(useMutation && useQueryClient ? {
      useUpdateOrderStatus: () => {
        const queryClient = useQueryClient()
        
        return useMutation({
          mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
            return await tabsyClient.order.updateStatus(id, status)
          },
          onSuccess: (response: any, { id, status }: { id: string; status: OrderStatus }) => {
            // Invalidate all order-related queries to ensure UI sync
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            queryClient.invalidateQueries({ queryKey: ['order', id] })
            
            // Also invalidate restaurant-specific order queries
            queryClient.invalidateQueries({ 
              predicate: (query: any) => {
                return query.queryKey[0] === 'orders' && 
                       query.queryKey[1] === 'restaurant'
              }
            })
            
            // Optimistic update for immediate UI feedback
            queryClient.setQueriesData(
              { queryKey: ['orders'] },
              (oldData: any) => {
                if (!oldData?.data?.orders) return oldData
                
                return {
                  ...oldData,
                  data: {
                    ...oldData.data,
                    orders: oldData.data.orders.map((order: any) => 
                      order.id === id ? { ...order, status } : order
                    )
                  }
                }
              }
            )
          }
        })
      }
    } : {})
  }
}

// ===========================
// STANDALONE HOOKS FOR DIRECT IMPORT
// Note: These require @tanstack/react-query to be installed in the consuming app
// ===========================

/**
 * Standalone version of useOrdersByRestaurant hook
 * Requires @tanstack/react-query useQuery to be available in the consuming app
 */
export function useOrdersByRestaurant(restaurantId: string, filters?: any, options?: any) {
  // This is a simplified version that works with the factory pattern
  // The actual implementation will be provided by the consuming app
  // through dependency injection or direct import of @tanstack/react-query
  
  // Import useQuery dynamically if available
  let useQuery: any
  try {
    // Use dynamic import for ES modules
    if (typeof window !== 'undefined') {
      useQuery = (globalThis as any).__TABSY_USE_QUERY__ || null
    }
  } catch (error) {
    console.warn('useQuery not available for useOrdersByRestaurant')
  }
  
  if (!useQuery) {
    // Return a mock implementation if useQuery is not available
    return {
      data: null,
      isLoading: false,
      error: new Error('useQuery from @tanstack/react-query is required but not available'),
      refetch: () => Promise.resolve()
    }
  }
  
  return useQuery({
    queryKey: ['orders', 'restaurant', restaurantId, filters],
    queryFn: async () => {
      console.log('useOrdersByRestaurant - Making API call:', {
        restaurantId,
        filters,
        hasToken: !!tabsyClient.getAuthToken()
      })
      const result = await tabsyClient.order.getByRestaurant(restaurantId, filters)
      console.log('useOrdersByRestaurant - API result:', result)
      return result
    },
    enabled: !!restaurantId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    ...options
  })
}

// ===========================
// SIMPLE PATTERN: Export the factory
// Apps import this and inject their own useQuery
// ===========================

// Order Mutations
export function useCreateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      return await tabsyClient.order.create(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await tabsyClient.order.update(id, data)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', id] })
    }
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      return await tabsyClient.order.updateStatus(id, status)
    },
    onSuccess: (response: any, { id, status }: { id: string; status: OrderStatus }) => {
      // Invalidate all order-related queries to ensure UI sync
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      
      // Also invalidate restaurant-specific order queries
      queryClient.invalidateQueries({ 
        predicate: (query: any) => {
          return query.queryKey[0] === 'orders' && 
                 query.queryKey[1] === 'restaurant'
        }
      })
      
      // Optimistic update for immediate UI feedback
      queryClient.setQueriesData(
        { queryKey: ['orders'] },
        (oldData: any) => {
          if (!oldData?.data?.orders) return oldData
          
          return {
            ...oldData,
            data: {
              ...oldData.data,
              orders: oldData.data.orders.map((order: any) => 
                order.id === id ? { ...order, status } : order
              )
            }
          }
        }
      )
    }
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await tabsyClient.order.cancel(id)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', id] })
    }
  })
}

export function useAddOrderItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ orderId, item }: { orderId: string; item: any }) => {
      return await tabsyClient.order.addItem(orderId, item)
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    }
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ orderId, itemId, data }: { orderId: string; itemId: string; data: any }) => {
      return await tabsyClient.order.updateItem(orderId, itemId, data)
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    }
  })
}

export function useRemoveOrderItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ orderId, itemId }: { orderId: string; itemId: string }) => {
      return await tabsyClient.order.removeItem(orderId, itemId)
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    }
  })
}
