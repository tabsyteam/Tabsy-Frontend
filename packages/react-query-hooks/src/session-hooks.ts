import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'

// Session Queries
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const client = tabsyClient
      return await client.session.getById(sessionId)
    },
    enabled: !!sessionId,
  })
}

export function useSessionValidation(sessionId: string) {
  return useQuery({
    queryKey: ['session', 'validation', sessionId],
    queryFn: async () => {
      const client = tabsyClient
      return await client.session.validate(sessionId)
    },
    enabled: !!sessionId,
  })
}

// QR Access Queries
export function useTableInfo(qrCode: string) {
  return useQuery({
    queryKey: ['qr', 'table-info', qrCode],
    queryFn: async () => {
      const client = tabsyClient
      return await client.qr.getTableInfo(qrCode)
    },
    enabled: !!qrCode,
  })
}

// Session Mutations
export function useCreateGuestSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const client = tabsyClient
      return await client.session.createGuest(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    }
  })
}

export function useCreateGuestSessionFromQR() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ qrCode, guestData }: { qrCode: string; guestData: any }) => {
      const client = tabsyClient
      return await client.qr.createGuestSession({
        qrCode,
        ...guestData
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    }
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { sessionId: string } & any) => {
      const client = tabsyClient
      return await client.session.update(data.sessionId, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] })
    }
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const client = tabsyClient
      return await client.session.delete(sessionId)
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
      queryClient.removeQueries({ queryKey: ['session', sessionId] })
    }
  })
}

export function usePingSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const client = tabsyClient
      return await client.session.ping(sessionId)
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    }
  })
}
