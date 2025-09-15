import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'

// ===========================
// STANDARD PATTERN: Menu Hook Factory
// ===========================

/**
 * Factory function that creates menu hooks with proper QueryClient injection
 * This is the standard enterprise pattern for monorepo shared hooks
 */
export function createMenuHooks(useQuery: any) {
  return {
    useMenus: (restaurantId: string) => {
      return useQuery({
        queryKey: ['menus', restaurantId],
        queryFn: async () => {
          return await tabsyClient.menu.listMenus(restaurantId)
        },
        enabled: !!restaurantId,
      })
    },

    useActiveMenu: (restaurantId: string, filters?: any) => {
      return useQuery({
        queryKey: ['menu', 'active', restaurantId, filters],
        queryFn: async () => {
          return await tabsyClient.menu.getActiveMenu(restaurantId, filters)
        },
        enabled: !!restaurantId,
      })
    },

    useMenuCategories: (restaurantId: string, options?: any) => {
      return useQuery({
        queryKey: ['menu-categories', restaurantId],
        queryFn: async () => {
          return await tabsyClient.menu.getCategories(restaurantId)
        },
        enabled: !!restaurantId,
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        ...options
      })
    },

    useMenuItems: (restaurantId: string, filters?: any, options?: any) => {
      return useQuery({
        queryKey: ['menu-items', restaurantId, filters],
        queryFn: async () => {
          return await tabsyClient.menu.getItems(restaurantId, filters)
        },
        enabled: !!restaurantId,
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        ...options
      })
    }
  }
}

// ===========================
// STANDARD PATTERN: Menu Mutations (use queryClient directly)
// ===========================
export function useCreateMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; name: string; description?: string }) => {
      return await tabsyClient.menu.createMenu(data.restaurantId, { name: data.name, description: data.description })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menus', variables.restaurantId] })
    }
  })
}

export function useUpdateMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; menuId: string; name?: string; description?: string; isActive?: boolean }) => {
      return await tabsyClient.menu.updateMenu(data.restaurantId, data.menuId, { name: data.name, description: data.description, isActive: data.isActive })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menus', variables.restaurantId] })
    }
  })
}

export function useDeleteMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; menuId: string }) => {
      return await tabsyClient.menu.deleteMenu(data.restaurantId, data.menuId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menus', variables.restaurantId] })
    }
  })
}

// Category Mutations
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string } & any) => {
      return await tabsyClient.menu.createCategory(data.restaurantId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', variables.restaurantId] })
    }
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; categoryId: string } & any) => {
      return await tabsyClient.menu.updateCategory(data.restaurantId, data.categoryId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', variables.restaurantId] })
    }
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; categoryId: string }) => {
      return await tabsyClient.menu.deleteCategory(data.restaurantId, data.categoryId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', variables.restaurantId] })
    }
  })
}

// Menu Item Mutations
export function useCreateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string } & any) => {
      return await tabsyClient.menu.createItem(data.restaurantId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', variables.restaurantId] })
    }
  })
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; itemId: string } & any) => {
      return await tabsyClient.menu.updateItem(data.restaurantId, data.itemId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', variables.restaurantId] })
    }
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; itemId: string }) => {
      return await tabsyClient.menu.deleteItem(data.restaurantId, data.itemId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', variables.restaurantId] })
    }
  })
}
