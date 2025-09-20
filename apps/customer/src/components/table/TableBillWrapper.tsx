'use client'

import { useState, useEffect } from 'react'
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
  const { api } = useApi()
  const router = useRouter()

  useEffect(() => {
    const loadTableSessionData = async () => {
      try {
        // Check if user has an active session
        const session = SessionManager.getDiningSession()
        if (!session) {
          router.push('/table')
          return
        }

        // Get table session from URL parameters or session storage
        const urlParams = new URLSearchParams(window.location.search)
        const tableSessionId = urlParams.get('tableSessionId') || session.tableSessionId

        if (!tableSessionId) {
          console.error('[TableBillWrapper] No table session ID found')
          setError('No table session found')
          toast.error('No table session found')
          return
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
        const sessionUsers = tableSessionData.users || []

        // Find current user in the session
        const currentSessionUser = sessionUsers.find(u => u.guestSessionId === session.sessionId)

        if (!currentSessionUser) {
          console.error('[TableBillWrapper] Current user not found in table session')
          setError('You are not part of this table session')
          toast.error('You are not part of this table session')
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

      } catch (error) {
        console.error('[TableBillWrapper] Error loading session data:', error)
        setError('Failed to load table session data')
        toast.error('Failed to load table session data')
      } finally {
        setIsLoading(false)
      }
    }

    loadTableSessionData()
  }, [api, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !tableSession || !currentUser) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold mb-2">Unable to Load Bill</h2>
        <p className="text-content-secondary mb-4">
          {error || 'Table session data not available'}
        </p>
        <button
          onClick={() => router.push('/table')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Back to Table
        </button>
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