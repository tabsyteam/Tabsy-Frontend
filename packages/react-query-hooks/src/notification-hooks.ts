import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI } from '@tabsy/api-client'

// ===========================
// STANDARD PATTERN: Notification Hook Factory
// ===========================

/**
 * Factory function that creates notification hooks with proper QueryClient injection
 * This is the standard enterprise pattern for monorepo shared hooks
 */
export function createNotificationHooks(useQuery: any) {
  return {
    useUserNotifications: (filters?: any) => {
      return useQuery({
        queryKey: ['notifications', 'user', filters],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.notification.getUserNotifications(filters)
        }
      })
    },

    useRestaurantNotifications: (restaurantId: string, filters?: any) => {
      return useQuery({
        queryKey: ['notifications', 'restaurant', restaurantId, filters],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.notification.getRestaurantNotifications(restaurantId, filters)
        },
        enabled: !!restaurantId,
      })
    },

    useNotificationPreferences: () => {
      return useQuery({
        queryKey: ['notification-preferences'],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.notification.getPreferences()
        }
      })
    }
  }
}

// Notification Mutations
export function useSendNotification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const client = new TabsyAPI()
      return await client.notification.send(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const client = new TabsyAPI()
      return await client.notification.markAsRead(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

export function useMarkMultipleNotificationsAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const client = new TabsyAPI()
      return await client.notification.markMultipleAsRead(ids)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const client = new TabsyAPI()
      return await client.notification.clearAll()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (preferences: any) => {
      const client = new TabsyAPI()
      return await client.notification.updatePreferences(preferences)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    }
  })
}

export function useTestNotification() {
  return useMutation({
    mutationFn: async (data: any) => {
      const client = new TabsyAPI()
      return await client.notification.test(data)
    }
  })
}
