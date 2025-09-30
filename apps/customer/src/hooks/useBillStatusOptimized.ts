'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApi } from '@/components/providers/api-provider'
import { useWebSocketEvent } from '@tabsy/ui-components'
import { SessionManager } from '@/lib/session'
import type { TableSessionBill, OrderStatus } from '@tabsy/shared-types'

interface BillStatus {
  hasBill: boolean
  billAmount: number
  remainingBalance: number
  isPaid: boolean
  isLoading: boolean
  error: string | null
  bill: TableSessionBill | null
  hasDeliveredOrders: boolean // NEW: Track if any orders are delivered locally
}

interface LocalOrderState {
  orderId: string
  status: OrderStatus
  total: number
}

/**
 * OPTIMIZED: Hook to manage bill status with smart WebSocket-based detection
 * Shows "Pay Bill" button based on order status WITHOUT needing full bill API call
 * Only fetches bill details when actually needed (user wants to pay)
 */
export function useBillStatusOptimized() {
  const [billStatus, setBillStatus] = useState<BillStatus>({
    hasBill: false,
    billAmount: 0,
    remainingBalance: 0,
    isPaid: true,
    isLoading: true,
    error: null,
    bill: null,
    hasDeliveredOrders: false
  })

  // Track local order state from WebSocket events
  const [localOrders, setLocalOrders] = useState<Map<string, LocalOrderState>>(new Map())

  const { api } = useApi()
  const session = SessionManager.getDiningSession()
  const tableSessionId = session?.tableSessionId

  console.log('[useBillStatusOptimized] Hook initialized:', {
    hasSession: !!session,
    tableSessionId,
    localOrdersCount: localOrders.size
  })

  // Calculate if we have delivered orders locally (FAST, no API call)
  const hasDeliveredOrders = useMemo(() => {
    const orders = Array.from(localOrders.values())
    return orders.some(order =>
      order.status === 'DELIVERED' ||
      order.status === 'COMPLETED' ||
      order.status === 'READY'
    )
  }, [localOrders])

  // Calculate estimated bill amount from local orders
  const estimatedBillAmount = useMemo(() => {
    const orders = Array.from(localOrders.values())
    return orders.reduce((sum, order) => sum + order.total, 0)
  }, [localOrders])

  // Fetch full bill status from API (only when needed)
  const fetchBillStatus = useCallback(async () => {
    console.log('[useBillStatusOptimized] fetchBillStatus called:', {
      tableSessionId,
      hasTableSessionId: !!tableSessionId
    })

    if (!tableSessionId) {
      console.log('[useBillStatusOptimized] No tableSessionId, skipping fetch')
      setBillStatus(prev => ({
        ...prev,
        hasBill: false,
        billAmount: 0,
        remainingBalance: 0,
        isPaid: true,
        isLoading: false,
        error: null,
        bill: null,
        hasDeliveredOrders
      }))
      return
    }

    console.log('[useBillStatusOptimized] Fetching bill for tableSessionId:', tableSessionId)
    setBillStatus(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await api.tableSession.getBill(tableSessionId)
      console.log('[useBillStatusOptimized] Bill API response:', response)

      if (!response.success || !response.data) {
        const errorMsg = response.error?.message || 'Failed to fetch bill'
        console.error('[useBillStatusOptimized] Bill fetch failed:', errorMsg)

        // Even if API fails, use local order state to show button
        setBillStatus(prev => ({
          ...prev,
          hasBill: hasDeliveredOrders,
          billAmount: estimatedBillAmount,
          remainingBalance: estimatedBillAmount,
          isPaid: false,
          isLoading: false,
          error: errorMsg,
          bill: null,
          hasDeliveredOrders
        }))
        return
      }

      const bill = response.data
      const remainingBalance = bill.summary.remainingBalance || 0
      const totalAmount = bill.summary.grandTotal || 0
      const isPaid = remainingBalance <= 0

      console.log('[useBillStatusOptimized] Bill data processed:', {
        totalAmount,
        remainingBalance,
        isPaid,
        hasBill: totalAmount > 0 || hasDeliveredOrders
      })

      setBillStatus({
        hasBill: totalAmount > 0 || hasDeliveredOrders,
        billAmount: totalAmount,
        remainingBalance,
        isPaid,
        isLoading: false,
        error: null,
        bill,
        hasDeliveredOrders
      })
    } catch (error) {
      console.error('[useBillStatusOptimized] Error fetching bill:', error)

      // Fallback to local state even on error
      setBillStatus(prev => ({
        ...prev,
        hasBill: hasDeliveredOrders,
        billAmount: estimatedBillAmount,
        remainingBalance: estimatedBillAmount,
        isPaid: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bill',
        isLoading: false,
        hasDeliveredOrders
      }))
    }
  }, [tableSessionId, api, hasDeliveredOrders, estimatedBillAmount])

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

  // Update local order state on order:created
  useWebSocketEvent(
    'order:created',
    (data: any) => {
      const order = data.order || data
      if (order.tableSessionId === tableSessionId || data.tableId === session?.tableId) {
        console.log('[useBillStatusOptimized] New order created, updating local state')
        setLocalOrders(prev => {
          const updated = new Map(prev)
          updated.set(order.id, {
            orderId: order.id,
            status: order.status,
            total: order.total || 0
          })
          return updated
        })
      }
    },
    [tableSessionId, session?.tableId],
    'useBillStatusOptimized-order-created'
  )

  // INSTANT DETECTION: Update local order state on status change
  useWebSocketEvent(
    'order:status_updated',
    (data: any) => {
      console.log('[useBillStatusOptimized] Order status updated:', data)
      const order = data.order || data
      const orderId = order.id || data.orderId
      const newStatus = order.status || data.newStatus

      const belongsToOurSession =
        order.tableSessionId === tableSessionId ||
        data.tableId === session?.tableId

      if (belongsToOurSession && orderId) {
        console.log('[useBillStatusOptimized] 🎯 Updating local order status:', {
          orderId,
          newStatus,
          isPayableStatus: newStatus === 'DELIVERED' || newStatus === 'COMPLETED'
        })

        // Update local order state INSTANTLY
        setLocalOrders(prev => {
          const updated = new Map(prev)
          const existing = updated.get(orderId)
          if (existing) {
            updated.set(orderId, { ...existing, status: newStatus })
          } else {
            // New order we didn't know about
            updated.set(orderId, {
              orderId,
              status: newStatus,
              total: order.total || 0
            })
          }
          return updated
        })

        // Also fetch accurate bill when order becomes payable
        if (newStatus === 'DELIVERED' || newStatus === 'COMPLETED') {
          console.log('[useBillStatusOptimized] 💰 Order ready for payment! Fetching accurate bill...')
          fetchBillStatus()
        }
      }
    },
    [tableSessionId, session?.tableId, fetchBillStatus],
    'useBillStatusOptimized-order-status'
  )

  // Listen for payment events to update bill status
  useWebSocketEvent(
    'payment:completed',
    (data: any) => {
      if (data.tableSessionId === tableSessionId) {
        console.log('[useBillStatusOptimized] Payment completed, refreshing bill status')
        fetchBillStatus()
      }
    },
    [tableSessionId, fetchBillStatus],
    'useBillStatusOptimized-payment-completed'
  )

  useWebSocketEvent(
    'payment:status_updated',
    (data: any) => {
      if (data.tableSessionId === tableSessionId) {
        console.log('[useBillStatusOptimized] Payment status updated, refreshing bill status')
        fetchBillStatus()
      }
    },
    [tableSessionId, fetchBillStatus],
    'useBillStatusOptimized-payment-status'
  )

  // Update billStatus when local orders change
  useEffect(() => {
    if (!billStatus.isLoading && !billStatus.bill) {
      // If we haven't fetched the bill yet, use local order state
      const shouldShow = hasDeliveredOrders && estimatedBillAmount > 0
      console.log('[useBillStatusOptimized] Updating status from local orders:', {
        hasDeliveredOrders,
        estimatedBillAmount,
        shouldShow
      })

      setBillStatus(prev => ({
        ...prev,
        hasBill: shouldShow,
        billAmount: estimatedBillAmount,
        remainingBalance: estimatedBillAmount,
        isPaid: !shouldShow,
        hasDeliveredOrders
      }))
    }
  }, [hasDeliveredOrders, estimatedBillAmount, billStatus.isLoading, billStatus.bill])

  return {
    ...billStatus,
    refreshBillStatus
  }
}