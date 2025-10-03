'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TableSessionBill } from '@/components/table/TableSessionBill'
import { useApi } from '@/components/providers/api-provider'
import { SessionManager } from '@/lib/session'
import { toast } from 'sonner'
import type {
  MultiUserTableSession,
  TableSessionUser
} from '@tabsy/shared-types'

export function TableBillWrapper() {
  const [tableSession, setTableSession] = useState<MultiUserTableSession | null>(null)
  const [currentUser, setCurrentUser] = useState<TableSessionUser | null>(null)
  const [users, setUsers] = useState<TableSessionUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { api } = useApi()
  const router = useRouter()

  // FIXED: Use ref to track retry attempts without causing re-renders
  const retryAttempts = useRef(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // FIXED: Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const loadTableSessionData = async () => {
      try {
        // Check if user has an active session
        const session = SessionManager.getDiningSession()
        if (!session) {
          router.push('/table')
          return
        }

        // Log session debug info for troubleshooting
        console.log('[TableBillWrapper] Session debug info:', SessionManager.getSessionDebugInfo())

        // Get table session from URL parameters or session storage
        const urlParams = new URLSearchParams(window.location.search)
        const tableSessionId = urlParams.get('tableSessionId') || session.tableSessionId

        if (!tableSessionId) {
          console.error('[TableBillWrapper] No table session ID found')
          setError('No table session found')
          toast.error('No table session found')
          return
        }

        // Validate session context
        const validation = SessionManager.validateTableSessionContext(tableSessionId)
        if (!validation.isValid) {
          console.warn('[TableBillWrapper] Session validation failed:', validation.error)
          if (validation.suggestion) {
            console.log('[TableBillWrapper] Suggestion:', validation.suggestion)
          }
          // Continue anyway, but log the warning - this is just for debugging
        }

        // Fetch real table session data
        const [usersResponse, billResponse] = await Promise.all([
          api.tableSession.getUsers(tableSessionId),
          api.tableSession.getBill(tableSessionId).catch(err => {
            console.warn('[TableBillWrapper] Bill not available yet:', err)
            return null
          })
        ])

        if (!usersResponse.success || !usersResponse.data) {
          throw new Error('Failed to load table session users')
        }

        const tableSessionData = usersResponse.data
        const rawUsers = tableSessionData.users || []

        console.log('[TableBillWrapper] Raw API response users:', rawUsers)

        // Map backend guestSession structure to frontend TableSessionUser structure
        const sessionUsers: TableSessionUser[] = rawUsers.map((user: any) => ({
          id: user.id,                              // Keep backend id
          guestSessionId: user.id,                  // Backend uses 'id', frontend expects 'guestSessionId'
          userName: user.userName || `User ${user.id?.slice(-4) || ''}`,  // Use partial ID instead of "Guest"
          isHost: user.isHost || false,
          createdAt: user.createdAt,
          lastActivity: user.lastActivity
        }))

        // Find current user in the session
        console.log('[TableBillWrapper] Debug session matching:', {
          sessionId: session.sessionId,
          sessionUsers: sessionUsers.map(u => ({ id: u.id, guestSessionId: u.guestSessionId, userName: u.userName })),
          tableSessionId: tableSessionId
        })

        let currentSessionUser = sessionUsers.find(u => u.guestSessionId === session.sessionId)

        // Fallback: If not found by guestSessionId, try to find by other means
        if (!currentSessionUser) {
          // Try to find a session user that might match this guest
          // This could happen if there's a session ID format mismatch
          console.warn('[TableBillWrapper] Could not find user by guestSessionId, attempting fallback matching')

          // If there's only one user, it's likely the current user
          if (sessionUsers.length === 1) {
            console.log('[TableBillWrapper] Only one user in session, assuming it\'s the current user')
            currentSessionUser = sessionUsers[0]
          }

          // Don't create synthetic users - this was inflating the count
          if (!currentSessionUser && sessionUsers.length > 0) {
            console.warn('[TableBillWrapper] Using first available user as current user')
            currentSessionUser = sessionUsers[0]
          }
        }

        if (!currentSessionUser) {
          console.error('[TableBillWrapper] Current user not found in table session after fallback attempts')
          console.error('[TableBillWrapper] Session data:', { session, sessionUsers, tableSessionId })
          setError('Unable to identify your session. Please try scanning the QR code again.')
          toast.error('Unable to identify your session. Please try scanning the QR code again.')
          return
        }

        // Create table session object from API data
        const tableSession: MultiUserTableSession = {
          id: tableSessionData.tableSessionId,
          tableId: session.tableId,
          restaurantId: session.restaurantId,
          sessionCode: '', // Would come from table session details if needed
          status: 'ACTIVE',
          totalAmount: billResponse?.data?.totalAmount || 0,
          paidAmount: billResponse?.data?.paidAmount || 0,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          lastActivity: new Date().toISOString()
        }

        setTableSession(tableSession)
        setCurrentUser(currentSessionUser)
        setUsers(sessionUsers)

        // FIXED: Reset retry counter on success
        retryAttempts.current = 0
        setRetryCount(0)

      } catch (error: any) {
        console.error('[TableBillWrapper] Error loading session data:', error)

        // FIXED: Check for rate limiting specifically and stop retrying
        const isRateLimited = error?.message?.includes('Rate limit') ||
                             error?.message?.includes('Too Many Requests') ||
                             error?.status === 429

        if (isRateLimited) {
          console.error('[TableBillWrapper] Rate limited - stopping retries')
          const errorMessage = 'Too many requests. Please wait a moment and try again.'
          setError(errorMessage)
          toast.error(errorMessage)
          setIsLoading(false)
          return
        }

        // FIXED: Use ref for retry count to avoid infinite loop
        if (retryAttempts.current < 2) {
          const nextAttempt = retryAttempts.current + 1
          console.log(`[TableBillWrapper] Retrying... (attempt ${nextAttempt}/3)`)

          retryAttempts.current = nextAttempt
          setRetryCount(nextAttempt)

          // FIXED: Store timeout ref and use exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempts.current), 5000) // Max 5s
          retryTimeoutRef.current = setTimeout(() => {
            loadTableSessionData()
          }, backoffDelay)
          return
        }

        // After retries failed, show error
        console.error('[TableBillWrapper] Max retries exceeded')
        const errorMessage = error instanceof Error ? error.message : 'Failed to load table session data'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadTableSessionData()
  }, [api, router]) // FIXED: Removed retryCount from dependencies

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  const handleRetry = () => {
    setError(null)
    setRetryCount(0)
    retryAttempts.current = 0 // FIXED: Also reset the ref
    setIsLoading(true)
  }

  if (error || !tableSession || !currentUser) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold mb-2">Unable to Load Bill</h2>
        <p className="text-content-secondary mb-4">
          {error || 'Table session data not available'}
        </p>

        {/* Show helpful message for common issues */}
        {error?.includes('session') && (
          <div className="mb-4 p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
            <p className="text-sm text-status-warning">
              This usually happens when you're not properly connected to the table session.
              Try scanning the QR code again or refresh the page.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg mr-2"
            disabled={isLoading}
          >
            {isLoading ? 'Retrying...' : 'Try Again'}
          </button>
          <button
            onClick={() => router.push('/table')}
            className="px-4 py-2 bg-surface-secondary text-content-primary rounded-lg"
          >
            Back to Table
          </button>
        </div>

        {retryCount > 0 && (
          <p className="text-xs text-content-tertiary mt-2">
            Retry attempt: {retryCount}/3
          </p>
        )}
      </div>
    )
  }

  return (
    <TableSessionBill
      tableSession={tableSession}
      currentUser={currentUser}
      users={users}
      api={api}
      onPaymentInitiated={() => {
        toast.success('Payment initiated successfully')
        // Could navigate to payment page or stay on bill page
      }}
    />
  )
}