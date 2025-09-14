import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI } from '@tabsy/api-client'

// ===========================
// STANDARD PATTERN: User Hook Factory
// ===========================

/**
 * Factory function that creates user hooks with proper QueryClient injection
 * This is the standard enterprise pattern for monorepo shared hooks
 */
export function createUserHooks(useQuery: any) {
  return {
    useCurrentUser: () => {
      return useQuery({
        queryKey: ['user', 'current'],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.user.getCurrentUser()
        }
      })
    },

    useUsers: (filters?: any) => {
      return useQuery({
        queryKey: ['users', filters],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.user.list(filters)
        }
      })
    },

    useUser: (id: string) => {
      return useQuery({
        queryKey: ['user', id],
        queryFn: async () => {
          const client = new TabsyAPI()
          return await client.user.getById(id)
        },
        enabled: !!id,
      })
    }
  }
}

// ===========================
// STANDARD PATTERN: User Mutations (use queryClient directly)
// ===========================
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const client = new TabsyAPI()
      return await client.user.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { id: string } & any) => {
      const client = new TabsyAPI()
      return await client.user.update(data.id, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
    }
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const client = new TabsyAPI()
      return await client.user.delete(id)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.removeQueries({ queryKey: ['user', id] })
    }
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { id: string; status: any }) => {
      const client = new TabsyAPI()
      return await client.user.updateStatus(data.id, data.status)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
    }
  })
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { id: string; roles: any[] }) => {
      const client = new TabsyAPI()
      return await client.user.updateRoles(data.id, data.roles)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
    }
  })
}
