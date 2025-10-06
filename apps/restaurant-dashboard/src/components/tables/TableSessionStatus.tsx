'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, AlertTriangle, CheckCircle, Banknote, Eye } from 'lucide-react'
import { Badge } from '@tabsy/ui-components'
import type { Table, MultiUserTableSession, TableSessionUser } from '@tabsy/shared-types'
import { tabsyClient } from '@tabsy/api-client'
import { toast } from 'sonner'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'
import { formatPrice, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface TableSessionStatusProps {
  table: Table
  onSessionDetails?: (sessionId: string) => void
}

interface SessionInfo {
  tableSession: MultiUserTableSession | null
  users: TableSessionUser[]
  totalUsers: number
  isLoading: boolean
  needsAttention: boolean
}

const getSessionStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-status-success-light text-status-success-dark'
    case 'ORDERING_LOCKED':
      return 'bg-status-warning-light text-status-warning-dark'
    case 'PAYMENT_PENDING':
      return 'bg-interactive-hover text-status-info-dark'
    case 'CLOSED':
      return 'bg-surface-tertiary text-content-primary'
    default:
      return 'bg-surface-tertiary text-content-primary'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle className="w-3 h-3" />
    case 'ORDERING_LOCKED':
      return <Clock className="w-3 h-3" />
    case 'PAYMENT_PENDING':
      return <Banknote className="w-3 h-3" />
    case 'CLOSED':
      return <CheckCircle className="w-3 h-3" />
    default:
      return <AlertTriangle className="w-3 h-3" />
  }
}

export function TableSessionStatus({ table, onSessionDetails }: TableSessionStatusProps) {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    tableSession: null,
    users: [],
    totalUsers: 0,
    isLoading: true,
    needsAttention: false
  })

  // Get restaurant currency for proper multi-currency support
  const { restaurant } = useCurrentRestaurant()
  const currency = (restaurant?.currency as CurrencyCode) || 'USD'

  const api = tabsyClient

  // Load session info for the table
  useEffect(() => {
    const loadSessionInfo = async () => {
      try {
        setSessionInfo(prev => ({ ...prev, isLoading: true }))

        // Get detailed session data for this table using restaurant API
        const response = await api.restaurantTableSession.getAllSessions(
          { tableId: table.id },
          1,
          1
        )

        if (response.success && response.data?.sessions && response.data.sessions.length > 0) {
          // Show the most recent session with activity (active or recent)
          const session = response.data.sessions[0]! // Most recent session

          const currentSession: MultiUserTableSession = {
            id: session.id,
            tableId: session.tableId,
            restaurantId: session.restaurantId,
            sessionCode: session.sessionCode,
            status: session.status,
            totalAmount: session.totalAmount,
            paidAmount: session.paidAmount,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            lastActivity: session.lastActivity
          }

          setSessionInfo({
            tableSession: currentSession,
            users: [],
            totalUsers: 1,
            isLoading: false,
            needsAttention: session.needsAttention || false
          })
        } else {
          setSessionInfo({
            tableSession: null,
            users: [],
            totalUsers: 0,
            isLoading: false,
            needsAttention: false
          })
        }
      } catch (error) {
        console.error('[TableSessionStatus] Error loading session info:', error)
        setSessionInfo(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadSessionInfo()
  }, [table.id, table.restaurantId])

  // Close session
  const closeSession = async () => {
    if (!sessionInfo.tableSession) return

    try {
      // Close the session using restaurant API
      await api.restaurantTableSession.forceCloseSession(sessionInfo.tableSession.id, 'Manual close by staff')

      toast.success('Session closed successfully')

      // Refresh session info by reloading
      const response = await api.restaurantTableSession.getAllSessions(
        { tableId: table.id },
        1,
        1
      )

      setSessionInfo({
        tableSession: null,
        users: [],
        totalUsers: 0,
        isLoading: false,
        needsAttention: false
      })
    } catch (error) {
      console.error('[TableSessionStatus] Error closing session:', error)
      toast.error('Failed to close session')
    }
  }

  if (sessionInfo.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-content-secondary">
        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
        Loading...
      </div>
    )
  }

  // Show session activity if there's any session data
  if (!sessionInfo.tableSession) {
    return null
  }

  const { tableSession, needsAttention } = sessionInfo
  const totalAmount = tableSession.totalAmount || 0
  const paidAmount = tableSession.paidAmount || 0
  const remainingAmount = totalAmount - paidAmount
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  // Determine session badge variant and text based on status
  const getSessionBadge = () => {
    switch (tableSession.status) {
      case 'ACTIVE':
        return { variant: 'info' as const, text: 'Active Session' }
      case 'PAYMENT_PENDING':
        return { variant: 'warning' as const, text: 'Payment Pending' }
      case 'CLOSED':
        return { variant: 'neutral' as const, text: 'Recent Session' }
      default:
        return { variant: 'neutral' as const, text: 'Session' }
    }
  }

  const sessionBadge = getSessionBadge()

  return (
    <div className="space-y-2">
      {/* Session Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={sessionBadge.variant} className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {sessionBadge.text}
          </Badge>

          {needsAttention && (
            <Badge variant="destructive" className="inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Attention
            </Badge>
          )}
        </div>

        {totalAmount > 0 && (
          <div className="text-sm font-medium text-content-primary">
            {formatPrice(totalAmount, currency)}
          </div>
        )}
      </div>

      {/* Payment Progress - Show for any session with activity */}
      {totalAmount > 0 && (
        <div className="space-y-1">
          {/* Progress Bar */}
          <div className="w-full bg-surface-secondary rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                paymentProgress === 100 ? 'bg-success' : tableSession.status === 'ACTIVE' ? 'bg-warning' : 'bg-surface-tertiary'
              }`}
              style={{ width: `${Math.max(paymentProgress, 8)}%` }}
            />
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-content-secondary">
              Paid: <span className="font-medium text-success">{formatPrice(Number(paidAmount || 0), currency)}</span>
            </span>
            {remainingAmount > 0 && tableSession.status !== 'CLOSED' && (
              <span className="text-content-secondary">
                Due: <span className="font-medium text-warning">{formatPrice(remainingAmount, currency)}</span>
              </span>
            )}
            {remainingAmount === 0 && (
              <span className="text-success font-medium">✓ Fully Paid</span>
            )}
            {tableSession.status === 'CLOSED' && remainingAmount > 0 && (
              <span className="text-content-tertiary font-medium">Session Closed</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}