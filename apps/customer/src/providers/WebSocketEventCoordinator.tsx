'use client'

/**
 * Centralized WebSocket Event Coordinator
 *
 * ARCHITECTURE PATTERN: Single Source of Truth
 *
 * This component serves as the ONLY place where global WebSocket events are listened to.
 * Instead of having multiple components listen to the same events (causing duplicate
 * API calls), this coordinator:
 *
 * 1. Listens to WebSocket events ONCE at the app level
 * 2. Invalidates React Query caches based on events
 * 3. All components read from React Query cache (single source of truth)
 * 4. Zero duplicate API calls, zero race conditions
 *
 * Benefits:
 * - Single event listener per event type (not 6+)
 * - Centralized cache invalidation logic
 * - Easier debugging and maintenance
 * - Better performance
 * - No duplicate API calls
 *
 * Usage: Wrap your app with this provider in providers.tsx
 */

import React, { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketEvent } from '@tabsy/ui-components'
import { SessionManager } from '@/lib/session'
import { queryKeys } from '@/hooks/useQueryConfig'

export function WebSocketEventCoordinator({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  // ============================================================================
  // ORDER EVENTS - Single listeners for all order-related events
  // ============================================================================

  /**
   * Handle order status updates (PREPARING → READY → DELIVERED → COMPLETED)
   * Invalidates: bill query (to update price badge)
   */
  const handleOrderStatusUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] order:status_updated', {
      orderId: data.orderId,
      status: data.status,
      previousStatus: data.previousStatus
    })

    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      // Add delay to ensure backend transaction commits
      setTimeout(() => {
        console.log('[WebSocketCoordinator] Invalidating bill query')
        queryClient.invalidateQueries({
          queryKey: queryKeys.bill(session.tableSessionId),
          refetchType: 'active'
        })
      }, 500)
    }
  }, [queryClient])

  /**
   * Handle general order updates
   * Invalidates: bill query (to update price badge)
   */
  const handleOrderUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] order:updated', {
      orderId: data.orderId,
      status: data.status
    })

    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      // Add delay to ensure backend transaction commits
      setTimeout(() => {
        console.log('[WebSocketCoordinator] Invalidating bill query')
        queryClient.invalidateQueries({
          queryKey: queryKeys.bill(session.tableSessionId),
          refetchType: 'active'
        })
      }, 500)
    }
  }, [queryClient])

  /**
   * Handle new order creation
   * Invalidates: bill query (to show new orders)
   */
  const handleOrderCreated = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] order:created', {
      orderId: data.orderId
    })

    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      setTimeout(() => {
        console.log('[WebSocketCoordinator] Invalidating bill query')
        queryClient.invalidateQueries({
          queryKey: queryKeys.bill(session.tableSessionId),
          refetchType: 'active'
        })
      }, 500)
    }
  }, [queryClient])

  // ============================================================================
  // PAYMENT EVENTS - Single listeners for all payment-related events
  // ============================================================================

  /**
   * Handle payment status updates
   * Invalidates: bill query (to update remaining balance)
   */
  const handlePaymentStatusUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] payment:status_updated', {
      paymentId: data.paymentId,
      status: data.status
    })

    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      setTimeout(() => {
        console.log('[WebSocketCoordinator] Invalidating bill query')
        queryClient.invalidateQueries({
          queryKey: queryKeys.bill(session.tableSessionId),
          refetchType: 'active'
        })
      }, 500)
    }
  }, [queryClient])

  /**
   * Handle payment completion
   * Invalidates: bill query (to update paid status)
   */
  const handlePaymentCompleted = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] payment:completed', {
      paymentId: data.paymentId,
      amount: data.amount
    })

    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      setTimeout(() => {
        console.log('[WebSocketCoordinator] Invalidating bill query')
        queryClient.invalidateQueries({
          queryKey: queryKeys.bill(session.tableSessionId),
          refetchType: 'active'
        })
      }, 500)
    }
  }, [queryClient])

  // ============================================================================
  // TABLE SESSION EVENTS - Single listeners for session-related events
  // ============================================================================

  /**
   * Handle table session updates
   * Invalidates: table session query
   */
  const handleTableSessionUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] table:session_updated', {
      tableSessionId: data.tableSessionId,
      status: data.status
    })

    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tableSession(session.tableSessionId),
        refetchType: 'active'
      })
    }
  }, [queryClient])

  /**
   * Handle split calculation updates
   * Invalidates: bill query
   */
  const handleSplitCalculationUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] split:calculation_updated', {
      tableSessionId: data.tableSessionId
    })

    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bill(session.tableSessionId),
        refetchType: 'active'
      })
    }
  }, [queryClient])

  // ============================================================================
  // REGISTER EVENT LISTENERS - This is the ONLY place these events are heard
  // ============================================================================

  // Order events
  useWebSocketEvent('order:status_updated', handleOrderStatusUpdate, [handleOrderStatusUpdate], 'WebSocketCoordinator')
  useWebSocketEvent('order:updated', handleOrderUpdate, [handleOrderUpdate], 'WebSocketCoordinator')
  useWebSocketEvent('order:created', handleOrderCreated, [handleOrderCreated], 'WebSocketCoordinator')

  // Payment events
  useWebSocketEvent('payment:status_updated', handlePaymentStatusUpdate, [handlePaymentStatusUpdate], 'WebSocketCoordinator')
  useWebSocketEvent('payment:completed', handlePaymentCompleted, [handlePaymentCompleted], 'WebSocketCoordinator')

  // Table session events
  useWebSocketEvent('table:session_updated', handleTableSessionUpdate, [handleTableSessionUpdate], 'WebSocketCoordinator')
  useWebSocketEvent('split:calculation_updated', handleSplitCalculationUpdate, [handleSplitCalculationUpdate], 'WebSocketCoordinator')

  // Log coordinator activation
  useEffect(() => {
    console.log('🎯 [WebSocketCoordinator] Centralized event coordinator active')
    console.log('   - Listening to: order:*, payment:*, table:*, split:*')
    console.log('   - This is the ONLY place these events are handled')
    console.log('   - All components read from React Query cache')

    return () => {
      console.log('🎯 [WebSocketCoordinator] Coordinator deactivated')
    }
  }, [])

  return <>{children}</>
}
