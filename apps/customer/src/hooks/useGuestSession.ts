/**
 * Optimized guest session hook using React Query
 * Prevents duplicate session creation calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/components/providers/api-provider'
import { queryKeys, queryConfigs } from './useQueryConfig'
import { unifiedSessionStorage } from '@/lib/unifiedSessionStorage'

interface CreateSessionParams {
  qrCode: string
  tableId: string
  restaurantId: string
  deviceSessionId?: string
}

interface GuestSessionData {
  sessionId: string
  tableSessionId: string
  createdAt: string
}

export function useGuestSession(params: CreateSessionParams & { enabled?: boolean }) {
  const { api } = useApi()
  const queryClient = useQueryClient()
  const { qrCode, tableId, restaurantId, enabled = true } = params

  return useQuery({
    queryKey: queryKeys.guestSession(qrCode, tableId),

    queryFn: async (): Promise<GuestSessionData> => {
      // ✅ FIXED: Check storage FIRST (fast path - no API call needed)
      const cached = unifiedSessionStorage.getSession()
      if (cached && cached.tableId === tableId && cached.restaurantId === restaurantId && cached.guestSessionId) {
        console.log('[useGuestSession] Using cached session:', cached.guestSessionId)
        return {
          sessionId: cached.guestSessionId,
          tableSessionId: cached.tableSessionId,
          createdAt: new Date(cached.createdAt).toISOString()
        }
      }

      // Only reach here if no cached session exists
      console.log('[useGuestSession] Creating new session via API')

      // Get existing session ID for device tracking
      const existingGuestSessionId = api.getGuestSessionId() ||
        sessionStorage.getItem(`guestSession-${tableId}`) ||
        localStorage.getItem('tabsy-guest-session-id')

      const response = await api.qr.createGuestSession({
        qrCode,
        tableId,
        restaurantId,
        deviceSessionId: existingGuestSessionId || undefined
      })

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create session')
      }

      const session = response.data

      // Store in unified storage
      unifiedSessionStorage.setSession({
        guestSessionId: session.sessionId,
        tableSessionId: session.tableSessionId,
        restaurantId,
        tableId,
        createdAt: session.createdAt ? new Date(session.createdAt).getTime() : Date.now(),
        lastActivity: Date.now()
      })

      // Also set in API client
      api.setGuestSession(session.sessionId)

      console.log('[useGuestSession] Session created successfully:', session.sessionId)

      return session
    },

    // ✅ FIXED: Simpler enabled logic - just check required params
    // Session validity is checked inside queryFn, allowing React Query to cache the result
    enabled: enabled && !!qrCode && !!tableId && !!restaurantId,

    // Session config - cache but don't auto-refetch
    ...queryConfigs.session,

    // Critical: Never auto-refetch session - it's created once
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,

    // On success, update the cache
    onSuccess: (data) => {
      console.log('[useGuestSession] Session query successful:', data)
    }
  })
}

/**
 * Mutation for creating a new session manually
 */
export function useCreateGuestSession() {
  const { api } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateSessionParams) => {
      const response = await api.qr.createGuestSession(params)

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create session')
      }

      return response.data
    },

    onSuccess: (data, variables) => {
      // Update unified storage
      unifiedSessionStorage.setSession({
        guestSessionId: data.sessionId,
        tableSessionId: data.tableSessionId,
        restaurantId: variables.restaurantId,
        tableId: variables.tableId,
        createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
        lastActivity: Date.now()
      })

      // Update API client
      api.setGuestSession(data.sessionId)

      // Invalidate and update session query
      queryClient.setQueryData(
        queryKeys.guestSession(variables.qrCode, variables.tableId),
        data
      )

      console.log('[useCreateGuestSession] Session created successfully:', data.sessionId)
    }
  })
}
