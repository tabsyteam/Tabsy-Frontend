import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'

// ===========================
// STANDARD PATTERN: Notification Hook Factory
// ===========================

/**
 * Factory function that creates notification hooks with proper QueryClient injection
 * This is the standard enterprise pattern for monorepo shared hooks
 */
export function createNotificationHooks(useQuery: any) {
  return {
    useUserNotifications: (filters?: any, options?: any) => {
      return useQuery({
        queryKey: ['notifications', 'user', filters],
        queryFn: async () => {
          const client = tabsyClient
          const response = await client.notification.getUserNotifications(filters)
          // Extract notifications from paginated response
          return response.data || response
        },
        select: (data: any) => {
          // Handle both paginated and direct response formats
          if (data.data && Array.isArray(data.data)) {
            return {
              notifications: data.data,
              pagination: data.meta?.pagination,
              total: data.meta?.pagination?.total || 0
            }
          }
          // Fallback for direct array response or data property
          const notifications = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
          return {
            notifications,
            pagination: null,
            total: notifications.length
          }
        },
        ...options
      })
    },

    useNotificationPreferences: () => {
      return useQuery({
        queryKey: ['notification-preferences'],
        queryFn: async () => {
          const client = tabsyClient
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
      const client = tabsyClient
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
      const client = tabsyClient
      return await client.notification.markAsRead(id)
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
      const client = tabsyClient
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
      const client = tabsyClient
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
      const client = tabsyClient
      return await client.notification.test(data)
    }
  })
}
