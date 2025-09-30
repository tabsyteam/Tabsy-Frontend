'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/components/providers/api-provider'
import { useWebSocketEvent } from '@tabsy/ui-components'
import { SessionManager } from '@/lib/session'
import type { TableSessionBill } from '@tabsy/shared-types'

interface BillStatus {
  hasBill: boolean
  billAmount: number
  remainingBalance: number
  isPaid: boolean
  isLoading: boolean
  error: string | null
  bill: TableSessionBill | null
}

/**
 * Hook to manage bill status for the current table session
 * Provides real-time updates via WebSocket and includes bill amount, payment status, etc.
 */
export function useBillStatus() {
  const [billStatus, setBillStatus] = useState<BillStatus>({
    hasBill: false,
    billAmount: 0,
    remainingBalance: 0,
    isPaid: true,
    isLoading: true,
    error: null,
    bill: null
  })

  const { api } = useApi()

  // CRITICAL: Session must be retrieved client-side only (after hydration)
  // On server (SSR), sessionStorage doesn't exist, so session will be null
  const [session, setSession] = useState<ReturnType<typeof SessionManager.getDiningSession>>(null)
  const [tableSessionId, setTableSessionId] = useState<string | undefined>(undefined)

  // Get session client-side after mount
  useEffect(() => {
    const clientSession = SessionManager.getDiningSession()
    setSession(clientSession)
    setTableSessionId(clientSession?.tableSessionId)

    console.log('[useBillStatus] Hook initialized (client-side):', {
      hasSession: !!clientSession,
      tableSessionId: clientSession?.tableSessionId,
      restaurantId: clientSession?.restaurantId,
      tableId: clientSession?.tableId
    })
  }, [])

  // Fetch bill status from API
  const fetchBillStatus = useCallback(async () => {
    console.log('[useBillStatus] fetchBillStatus called:', {
      tableSessionId,
      hasTableSessionId: !!tableSessionId
    })

    if (!tableSessionId) {
      console.log('[useBillStatus] No tableSessionId, skipping fetch')
      setBillStatus({
        hasBill: false,
        billAmount: 0,
        remainingBalance: 0,
        isPaid: true,
        isLoading: false,
        error: null,
        bill: null
      })
      return
    }

    console.log('[useBillStatus] Fetching bill for tableSessionId:', tableSessionId)
    setBillStatus(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await api.tableSession.getBill(tableSessionId)
      console.log('[useBillStatus] Bill API response:', response)

      if (!response.success || !response.data) {
        const errorMsg = response.error?.message || 'Failed to fetch bill'
        console.error('[useBillStatus] Bill fetch failed:', errorMsg)
        throw new Error(errorMsg)
      }

      const bill = response.data
      const remainingBalance = bill.summary.remainingBalance || 0
      const totalAmount = bill.summary.grandTotal || 0
      const isPaid = remainingBalance <= 0

      console.log('[useBillStatus] Bill data processed:', {
        totalAmount,
        remainingBalance,
        isPaid,
        hasBill: totalAmount > 0
      })

      setBillStatus({
        hasBill: totalAmount > 0,
        billAmount: totalAmount,
        remainingBalance,
        isPaid,
        isLoading: false,
        error: null,
        bill
      })
    } catch (error) {
      console.error('[useBillStatus] Error fetching bill:', error)
      // Set error but don't show the button - this might be expected if no orders yet
      setBillStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch bill',
        isLoading: false
      }))
    }
  }, [tableSessionId, api])

  // Refresh function for manual updates
  const refreshBillStatus = useCallback(() => {
    fetchBillStatus()
  }, [fetchBillStatus])

  // Initial fetch when hook mounts or tableSessionId changes
  useEffect(() => {
    if (tableSessionId) {
      fetchBillStatus()
    }
  }, [fetchBillStatus, tableSessionId])

  // Listen for WebSocket payment events to update bill status in real-time
  useWebSocketEvent(
    'payment:completed',
    (data: any) => {
      if (data.tableSessionId === tableSessionId) {
        console.log('[useBillStatus] Payment completed, refreshing bill status')
        fetchBillStatus()
      }
    },
    [tableSessionId, fetchBillStatus],
    'useBillStatus-payment-completed'
  )

  useWebSocketEvent(
    'payment:status_updated',
    (data: any) => {
      if (data.tableSessionId === tableSessionId) {
        console.log('[useBillStatus] Payment status updated, refreshing bill status')
        fetchBillStatus()
      }
    },
    [tableSessionId, fetchBillStatus],
    'useBillStatus-payment-status'
  )

  useWebSocketEvent(
    'table:session_updated',
    (data: any) => {
      if (data.tableSessionId === tableSessionId) {
        console.log('[useBillStatus] Table session updated, refreshing bill status')
        fetchBillStatus()
      }
    },
    [tableSessionId, fetchBillStatus],
    'useBillStatus-session-updated'
  )

  // Listen for new orders that might affect the bill
  useWebSocketEvent(
    'order:created',
    (data: any) => {
      const order = data.order || data
      if (order.tableSessionId === tableSessionId) {
        console.log('[useBillStatus] New order created, refreshing bill status')
        fetchBillStatus()
      }
    },
    [tableSessionId, fetchBillStatus],
    'useBillStatus-order-created'
  )

  // CRITICAL: Listen for order status updates - especially DELIVERED status
  // This allows us to show "Pay Bill" button INSTANTLY when food is ready
  useWebSocketEvent(
    'order:status_updated',
    (data: any) => {
      console.log('[useBillStatus] Order status updated:', data)
      const order = data.order || data
      const newStatus = order.status || data.newStatus

      // Check if this order belongs to our table session
      const belongsToOurSession =
        order.tableSessionId === tableSessionId ||
        data.tableId === session?.tableId

      if (belongsToOurSession) {
        console.log('[useBillStatus] Order status change affects our table:', {
          newStatus,
          shouldShowButton: newStatus === 'DELIVERED' || newStatus === 'COMPLETED'
        })

        // Refresh bill status when order is delivered or completed
        // This makes the "Pay Bill" button appear instantly
        if (newStatus === 'DELIVERED' || newStatus === 'COMPLETED') {
          console.log('[useBillStatus] 🎯 Order ready for payment! Refreshing bill...')
          fetchBillStatus()
        }
      }
    },
    [tableSessionId, session?.tableId, fetchBillStatus],
    'useBillStatus-order-status'
  )

  // Listen for order updates (any changes to order)
  useWebSocketEvent(
    'order:updated',
    (data: any) => {
      const order = data.order || data
      const belongsToOurSession =
        order.tableSessionId === tableSessionId ||
        data.tableId === session?.tableId

      if (belongsToOurSession) {
        console.log('[useBillStatus] Order updated for our table, refreshing bill')
        fetchBillStatus()
      }
    },
    [tableSessionId, session?.tableId, fetchBillStatus],
    'useBillStatus-order-updated-general'
  )

  return {
    ...billStatus,
    refreshBillStatus
  }
}