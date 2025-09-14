import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI } from '@tabsy/api-client'

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
          const client = new TabsyAPI()
          return await client.table.list(restaurantId)
        },
        enabled: !!restaurantId,
      })
    },

    useTable: (restaurantId: string, tableId: string) => {
      return useQuery({
        queryKey: ['table', restaurantId, tableId],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.table.getById(restaurantId, tableId)
        },
        enabled: !!restaurantId && !!tableId,
      })
    },

    useTableQRCode: (restaurantId: string, tableId: string) => {
      return useQuery({
        queryKey: ['table-qrcode', restaurantId, tableId],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.table.getQRCode(restaurantId, tableId)
        },
        enabled: !!restaurantId && !!tableId,
      })
    },

    useTableSessions: (tableId: string) => {
      return useQuery({
        queryKey: ['table-sessions', tableId],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.table.getSessions(tableId)
        },
        enabled: !!tableId,
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
      const client = new TabsyAPI()
      return await client.table.create(data.restaurantId, data)
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
      const client = new TabsyAPI()
      return await client.table.update(data.restaurantId, data.tableId, data)
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
      const client = new TabsyAPI()
      return await client.table.delete(data.restaurantId, data.tableId)
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
      const client = new TabsyAPI()
      return await client.table.updateStatus(data.restaurantId, data.tableId, data.status)
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
      const client = new TabsyAPI()
      return await client.table.reset(data.restaurantId, data.tableId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] })
      queryClient.invalidateQueries({ queryKey: ['table-sessions', variables.tableId] })
    }
  })
}
