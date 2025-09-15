import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'

// ===========================
// STANDARD PATTERN: Table Hook Factory
// ===========================

/**
 * Factory function that creates table hooks with proper QueryClient injection
 * This is the standard enterprise pattern for monorepo shared hooks
 */
export function createTableHooks(useQuery: any) {
  return {
    useTables: (restaurantId: string) => {
      return useQuery({
        queryKey: ['tables', restaurantId],
        queryFn: async () => {
          // Use the shared client instance that has auth token
          return await tabsyClient.table.list(restaurantId)
        },
        enabled: !!restaurantId,
      })
    },

    useTable: (restaurantId: string, tableId: string) => {
      return useQuery({
        queryKey: ['table', restaurantId, tableId],
        queryFn: async () => {
          // Use the shared client instance that has auth token
          return await tabsyClient.table.getById(restaurantId, tableId)
        },
        enabled: !!restaurantId && !!tableId,
      })
    },

    useTableQRCode: (restaurantId: string, tableId: string) => {
      return useQuery({
        queryKey: ['table-qrcode', restaurantId, tableId],
        queryFn: async () => {
          // Use the shared client instance that has auth token
          return await tabsyClient.table.getQRCode(restaurantId, tableId)
        },
        enabled: !!restaurantId && !!tableId,
      })
    },

    useTableSessions: (restaurantId: string, tableId: string) => {
      return useQuery({
        queryKey: ['table-sessions', restaurantId, tableId],
        queryFn: async () => {
          // Use the shared client instance that has auth token
          return await tabsyClient.table.getSessions(restaurantId, tableId)
        },
        enabled: !!restaurantId && !!tableId,
      })
    },

    useTableQRCodeImage: (restaurantId: string, tableId: string) => {
      return useQuery({
        queryKey: ['table-qrcode-image', restaurantId, tableId],
        queryFn: async () => {
          // Use the shared client instance that has auth token
          return await tabsyClient.table.getQRCodeImage(restaurantId, tableId)
        },
        enabled: !!restaurantId && !!tableId,
      })
    }
  }
}

// ===========================
// STANDARD PATTERN: Table Mutations (use queryClient directly)
// ===========================
export function useCreateTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string } & any) => {
      // Use the shared client instance that has auth token
      return await tabsyClient.table.create(data.restaurantId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
    }
  })
}

export function useUpdateTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string } & any) => {
      // Use the shared client instance that has auth token
      return await tabsyClient.table.update(data.restaurantId, data.tableId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] })
    }
  })
}

export function useDeleteTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string }) => {
      // Use the shared client instance that has auth token
      return await tabsyClient.table.delete(data.restaurantId, data.tableId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
      queryClient.removeQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] })
    }
  })
}

export function useUpdateTableStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string; status: any }) => {
      // Use the shared client instance that has auth token
      return await tabsyClient.table.updateStatus(data.restaurantId, data.tableId, data.status)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] })
    }
  })
}

export function useResetTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string }) => {
      // Use the shared client instance that has auth token
      return await tabsyClient.table.reset(data.restaurantId, data.tableId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] })
      queryClient.invalidateQueries({ queryKey: ['table-sessions', variables.tableId] })
    }
  })
}
