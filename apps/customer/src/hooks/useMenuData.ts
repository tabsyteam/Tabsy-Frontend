/**
 * Optimized menu data hook using React Query
 * Prevents duplicate API calls through proper caching
 */

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/components/providers/api-provider'
import { queryKeys, queryConfigs } from './useQueryConfig'
import type { MenuCategory } from '@tabsy/shared-types'

interface UseMenuDataOptions {
  restaurantId: string | null | undefined
  enabled?: boolean
}

export function useMenuData({ restaurantId, enabled = true }: UseMenuDataOptions) {
  const { api } = useApi()

  return useQuery({
    queryKey: restaurantId ? queryKeys.menu(restaurantId) : ['menu', 'null'],

    queryFn: async () => {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required')
      }

      console.log('[useMenuData] Fetching menu for restaurant:', restaurantId)

      const response = await api.menu.getActiveMenu(restaurantId)

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load menu')
      }

      // Handle different response structures
      let categories: MenuCategory[] = []

      if (Array.isArray(response.data)) {
        const firstMenu = response.data[0]
        categories = firstMenu?.categories || []
      } else if (response.data.categories) {
        categories = response.data.categories
      }

      console.log('[useMenuData] Menu loaded successfully:', {
        categoriesCount: categories.length,
        itemsCount: categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0)
      })

      return categories
    },

    // Only fetch if we have restaurantId and enabled
    enabled: enabled && !!restaurantId,

    // Use semi-static config (menu doesn't change frequently)
    ...queryConfigs.semiStatic,

    // Override for better UX - refetch on window focus after 5 min
    refetchOnWindowFocus: (query) => {
      const dataAge = Date.now() - (query.state.dataUpdatedAt || 0)
      return dataAge > 1000 * 60 * 5 // Only refetch if data is older than 5 minutes
    },
  })
}
