'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/components/providers/api-provider'
import { dualReadSession } from '@/lib/unifiedSessionStorage'
import { toast } from 'sonner'
import { STORAGE_KEYS } from '@/constants/storage'
import type {
  MultiUserTableSession,
  TableSessionUser
} from '@tabsy/shared-types'
import { TableSessionStatus } from '@tabsy/shared-types'

export function useTableSessionData() {
  const [tableSession, setTableSession] = useState<MultiUserTableSession | null>(null)
  const [currentUser, setCurrentUser] = useState<TableSessionUser | null>(null)
  const [users, setUsers] = useState<TableSessionUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { api } = useApi()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const loadTableSessionData = async () => {
      try {
        // Check if user has an active session - using unified storage
        const session = dualReadSession()
        if (!session) {
          if (cancelled) return
          console.warn('[useTableSessionData] No session found in unified storage')
          router.push('/table')
          return
        }

        console.log('[useTableSessionData] Session loaded from unified storage:', {
          tableSessionId: session.tableSessionId,
          restaurantId: session.restaurantId,
          tableId: session.tableId
        })

        // Get the guest session ID from API client
        const guestSessionId = api.getGuestSessionId()
        if (!guestSessionId) {
          if (cancelled) return
          setError('No guest session found')
          router.push('/table')
          return
        }

        console.log('[useTableSessionData] Loading data for guest session:', guestSessionId)

        // Get the tableSessionId from stored session data (should be saved during QR scan)
        let tableSessionId = session.tableSessionId

        // If not in session data, try to get it from sessionStorage
        if (!tableSessionId) {
          const storedTableSessionId = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.TABLE_SESSION_ID) : null
          if (storedTableSessionId) {
            tableSessionId = storedTableSessionId
          }
        }

        if (!tableSessionId) {
          throw new Error('No table session ID found. Please scan the QR code again.')
        }

        console.log('[useTableSessionData] Using table session ID:', tableSessionId)

        // Get the table session data directly using the ID
        const usersResponse = await api.tableSession.getUsers(tableSessionId)

        if (cancelled) return

        console.log('[useTableSessionData] Table session users response:', usersResponse)

        if (!usersResponse.success) {
          throw new Error('Failed to load table session users')
        }

        const users = usersResponse.data?.users || []
        console.log('[useTableSessionData] Available users:', users)
        console.log('[useTableSessionData] Looking for guestSessionId:', guestSessionId)

        let currentUser = users.find(user => user.guestSessionId === guestSessionId)

        if (!currentUser) {
          console.warn('[useTableSessionData] Current user not found in table session. Available users:',
            users.map(u => ({ id: u.id, guestSessionId: u.guestSessionId, userName: u.userName })))

          // Instead of throwing an error, create a minimal user object for the current session
          // This handles cases where the user hasn't been explicitly added to the table session yet
          currentUser = {
            id: guestSessionId,
            guestSessionId: guestSessionId,
            userName: '', // Empty username - will be set during order
            isHost: false,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          }

          console.log('[useTableSessionData] Created fallback user for guest session:', currentUser)
        }

        if (cancelled) return
        setCurrentUser(currentUser)

        // Create table session object from available data
        const tableSession: MultiUserTableSession = {
          id: tableSessionId,
          tableId: session.tableId,
          restaurantId: session.restaurantId,
          sessionCode: usersResponse.data?.tableSessionId || 'UNKNOWN',
          status: TableSessionStatus.ACTIVE,
          totalAmount: 0,
          paidAmount: 0,
          createdAt: new Date(session.createdAt).toISOString(),
          expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : new Date(session.createdAt + 2 * 60 * 60 * 1000).toISOString(),
          lastActivity: new Date().toISOString()
        }

        console.log('[useTableSessionData] Loaded table session data:', {
          tableSession,
          currentUser,
          totalUsers: users.length
        })

        if (cancelled) return
        setTableSession(tableSession)
        setUsers(users)

      } catch (error) {
        if (cancelled) return

        const err = error instanceof Error ? error : new Error(String(error))
        console.error('[useTableSessionData] Error loading session data:', err)
        setError(err.message || 'Failed to load table session data')
        toast.error('Failed to load table session data', {
          description: err.message || 'Please try refreshing the page'
        })
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadTableSessionData()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [api, router])

  return {
    tableSession,
    currentUser,
    users,
    isLoading,
    error,
    api
  }
}