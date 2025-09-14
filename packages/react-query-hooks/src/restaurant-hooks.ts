import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tabsyClient } from '@tabsy/api-client'
import { QUERY_KEYS } from './auth-hooks'

// ===========================
// STANDARD PATTERN: Restaurant Hook Factory
// ===========================

/**
 * Factory function that creates restaurant hooks with proper QueryClient injection
 * This is the standard enterprise pattern for monorepo shared hooks
 */
export function createRestaurantHooks(useQuery: any) {
  return {
    useRestaurants: () => {
      return useQuery({
        queryKey: QUERY_KEYS.restaurants.all,
        queryFn: async () => {
          return await tabsyClient.restaurant.list()
        }
      })
    },

    useRestaurant: (id: string) => {
      return useQuery({
        queryKey: QUERY_KEYS.restaurants.detail(id),
        queryFn: async () => {
          console.log('useRestaurant - Making API call:', {
            id,
            hasToken: !!tabsyClient.getAuthToken()
          })
          const result = await tabsyClient.restaurant.getById(id)
          console.log('useRestaurant - API result:', result)
          return result
        },
        enabled: !!id
      })
    },

    useRestaurantMenu: (restaurantId: string) => {
      return useQuery({
        queryKey: QUERY_KEYS.restaurants.menu(restaurantId),
        queryFn: async () => {
          return await tabsyClient.menu.listMenus(restaurantId)
        },
        enabled: !!restaurantId
      })
    },

    useRestaurantTables: (restaurantId: string) => {
      return useQuery({
        queryKey: QUERY_KEYS.restaurants.tables(restaurantId),
        queryFn: async () => {
          return await tabsyClient.table.list(restaurantId)
        },
        enabled: !!restaurantId
      })
    },

    useRestaurantAnalytics: (restaurantId: string, dateRange?: { start: string; end: string }) => {
      return useQuery({
        queryKey: QUERY_KEYS.restaurants.analytics(restaurantId),
        queryFn: async () => {
          // This would be a placeholder until we implement analytics endpoints
          return { data: null }
        },
        enabled: !!restaurantId
      })
    }
  }
}

// Restaurant Mutations
export function useCreateRestaurant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      return await tabsyClient.restaurant.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.restaurants.all })
    }
  })
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await tabsyClient.restaurant.update(id, data)
    },
    onSuccess: (response) => {
      const restaurant = response.data as any
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.restaurants.all })
      if (restaurant && restaurant.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.restaurants.detail(restaurant.id) })
      }
    }
  })
}

export function useDeleteRestaurant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await tabsyClient.restaurant.delete(id)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.restaurants.all })
      queryClient.removeQueries({ queryKey: QUERY_KEYS.restaurants.detail(id) })
    }
  })
}

export function useUpdateRestaurantStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      return await tabsyClient.restaurant.partialUpdate(id, { status })
    },
    onSuccess: (response) => {
      const restaurant = response.data as any
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.restaurants.all })
      if (restaurant && 'id' in restaurant) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.restaurants.detail(restaurant.id) })
      }
    }
  })
}
