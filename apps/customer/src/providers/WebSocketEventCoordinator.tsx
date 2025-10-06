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

import React, { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketEvent } from '@tabsy/ui-components'
import { SessionManager } from '@/lib/session'
import { queryKeys } from '@/hooks/useQueryConfig'

/**
 * PERFORMANCE OPTIMIZATION: Debounce utility for query invalidations
 * Prevents multiple rapid WebSocket events from flooding the network with API calls
 */
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  return useCallback(
    ((...args: any[]) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

export function WebSocketEventCoordinator({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  // PERFORMANCE: Debounce bill invalidations (1 second delay)
  // If multiple events arrive within 1 second, only refetch once
  const invalidateBillQuery = useCallback(() => {
    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      console.log('[WebSocketCoordinator] Invalidating bill query')
      queryClient.invalidateQueries({
        queryKey: queryKeys.bill(session.tableSessionId),
        refetchType: 'active'
      })
    }
  }, [queryClient])

  const debouncedInvalidateBill = useDebounce(invalidateBillQuery, 1000)

  // PERFORMANCE: Debounce table session invalidations
  const invalidateTableSessionQuery = useCallback(() => {
    const session = SessionManager.getDiningSession()
    if (session?.tableSessionId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tableSession(session.tableSessionId),
        refetchType: 'active'
      })
    }
  }, [queryClient])

  const debouncedInvalidateTableSession = useDebounce(invalidateTableSessionQuery, 1000)

  // ============================================================================
  // ORDER EVENTS - Single listeners for all order-related events
  // ============================================================================

  /**
   * Handle order status updates (PREPARING → READY → DELIVERED → COMPLETED)
   * Invalidates: bill query (to update price badge) - DEBOUNCED
   */
  const handleOrderStatusUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] order:status_updated', {
      orderId: data.orderId,
      status: data.status,
      previousStatus: data.previousStatus
    })

    // PERFORMANCE: Use debounced invalidation
    // Multiple rapid status updates will only trigger ONE refetch
    debouncedInvalidateBill()
  }, [debouncedInvalidateBill])

  /**
   * Handle general order updates
   * Invalidates: bill query (to update price badge) - DEBOUNCED
   */
  const handleOrderUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] order:updated', {
      orderId: data.orderId,
      status: data.status
    })

    // PERFORMANCE: Use debounced invalidation
    debouncedInvalidateBill()
  }, [debouncedInvalidateBill])

  /**
   * Handle new order creation
   * Invalidates: bill query (to show new orders) - DEBOUNCED
   */
  const handleOrderCreated = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] order:created', {
      orderId: data.orderId
    })

    // PERFORMANCE: Use debounced invalidation
    debouncedInvalidateBill()
  }, [debouncedInvalidateBill])

  // ============================================================================
  // PAYMENT EVENTS - Single listeners for all payment-related events
  // ============================================================================

  /**
   * Handle payment status updates
   * Invalidates: bill query (to update remaining balance) - DEBOUNCED
   */
  const handlePaymentStatusUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] payment:status_updated', {
      paymentId: data.paymentId,
      status: data.status
    })

    // PERFORMANCE: Use debounced invalidation
    debouncedInvalidateBill()
  }, [debouncedInvalidateBill])

  /**
   * Handle payment completion
   * Invalidates: bill query (to update paid status) - DEBOUNCED
   */
  const handlePaymentCompleted = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] payment:completed', {
      paymentId: data.paymentId,
      amount: data.amount
    })

    // PERFORMANCE: Use debounced invalidation
    debouncedInvalidateBill()
  }, [debouncedInvalidateBill])

  // ============================================================================
  // TABLE SESSION EVENTS - Single listeners for session-related events
  // ============================================================================

  /**
   * Handle table session updates
   * Invalidates: table session query - DEBOUNCED
   */
  const handleTableSessionUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] table:session_updated', {
      tableSessionId: data.tableSessionId,
      status: data.status
    })

    // PERFORMANCE: Use debounced invalidation
    debouncedInvalidateTableSession()
  }, [debouncedInvalidateTableSession])

  /**
   * Handle split calculation updates
   * Invalidates: bill query - DEBOUNCED
   */
  const handleSplitCalculationUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] split:calculation_updated', {
      tableSessionId: data.tableSessionId
    })

    // PERFORMANCE: Use debounced invalidation
    debouncedInvalidateBill()
  }, [debouncedInvalidateBill])

  // ============================================================================
  // RESTAURANT/TABLE EVENTS - Real-time updates for restaurant data changes
  // ============================================================================

  /**
   * Handle restaurant updates (e.g., currency change, settings update)
   * Invalidates: restaurant query to refetch fresh data from API
   */
  const handleRestaurantUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] restaurant:updated', {
      restaurantId: data.restaurantId
    })

    // Invalidate restaurant query - will refetch from API
    queryClient.invalidateQueries({
      queryKey: ['restaurant', data.restaurantId],
      refetchType: 'active'
    })
  }, [queryClient])

  /**
   * Handle table updates (e.g., status change, QR regeneration)
   * Invalidates: table query to refetch fresh data from API
   */
  const handleTableUpdate = useCallback((data: any) => {
    console.log('[WebSocketCoordinator] table:updated', {
      tableId: data.tableId
    })

    // Invalidate table query - will refetch from API
    queryClient.invalidateQueries({
      queryKey: ['table', data.tableId],
      refetchType: 'active'
    })
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

  // Restaurant/Table events
  useWebSocketEvent('restaurant:updated', handleRestaurantUpdate, [handleRestaurantUpdate], 'WebSocketCoordinator')
  useWebSocketEvent('table:updated', handleTableUpdate, [handleTableUpdate], 'WebSocketCoordinator')

  // Log coordinator activation
  useEffect(() => {
    console.log('🎯 [WebSocketCoordinator] Centralized event coordinator active')
    console.log('   - Listening to: order:*, payment:*, table:*, split:*, restaurant:*')
    console.log('   - This is the ONLY place these events are handled')
    console.log('   - All components read from React Query cache')

    return () => {
      console.log('🎯 [WebSocketCoordinator] Coordinator deactivated')
    }
  }, [])

  return <>{children}</>
}
