'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/components/providers/api-provider'
import type {
  TableSessionUsersResponse,
  TableSessionOrdersResponse
} from '@tabsy/api-client'
import type { GuestSession } from '@tabsy/shared-types'

interface TableSessionInfo {
  id: string
  createdAt: string
  status: string
  expiresAt: string
  totalAmount: number
  paidAmount: number
}

interface SessionDetails {
  session: GuestSession | null
  tableSession: TableSessionInfo | null
  users: TableSessionUsersResponse | null
  orders: TableSessionOrdersResponse | null
  error: string | null
  isLoading: boolean
}

export function useSessionDetails(sessionId: string | null, tableSessionId: string | null) {
  const [sessionDetails, setSessionDetails] = useState<SessionDetails>({
    session: null,
    tableSession: null,
    users: null,
    orders: null,
    error: null,
    isLoading: false
  })

  const { api } = useApi()

  const fetchSessionDetails = useCallback(async () => {
    if (!sessionId) {
      setSessionDetails(prev => ({ ...prev, error: 'No session ID provided' }))
      return
    }

    setSessionDetails(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Fetch session details
      const sessionResponse = await api.session.getById(sessionId)

      if (!sessionResponse.success) {
        throw new Error(sessionResponse.error?.message || 'Failed to fetch session details')
      }

      let usersData: TableSessionUsersResponse | null = null
      let ordersData: TableSessionOrdersResponse | null = null

      let tableSessionData: TableSessionInfo | null = null

      // Fetch table session users and orders if tableSessionId is available
      if (tableSessionId) {
        try {
          const [usersResponse, ordersResponse] = await Promise.all([
            api.tableSession.getUsers(tableSessionId),
            api.tableSession.getOrders(tableSessionId)
          ])

          if (usersResponse.success && usersResponse.data) {
            usersData = usersResponse.data
            // Extract table session info from users response
            tableSessionData = usersResponse.data.tableSession
          }

          if (ordersResponse.success && ordersResponse.data) {
            ordersData = ordersResponse.data
          }
        } catch (error) {
          console.warn('Failed to fetch table session data:', error)
          // Don't fail the entire operation if table session data fails
        }
      }

      setSessionDetails({
        session: sessionResponse.data,
        tableSession: tableSessionData,
        users: usersData,
        orders: ordersData,
        error: null,
        isLoading: false
      })

    } catch (error) {
      console.error('Error fetching session details:', error)
      setSessionDetails(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch session details',
        isLoading: false
      }))
    }
  }, [sessionId, tableSessionId, api])

  const refreshSessionDetails = useCallback(() => {
    fetchSessionDetails()
  }, [fetchSessionDetails])

  // Initial fetch
  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails()
    }
  }, [fetchSessionDetails, sessionId])

  return {
    ...sessionDetails,
    refreshSessionDetails
  }
}