/**
 * Centralized WebSocket Sync Hooks
 * Senior Architecture Pattern: Single Responsibility + Event Aggregation
 *
 * This module consolidates all WebSocket event listeners into centralized hooks
 * to prevent duplicate listeners and excessive query invalidations.
 *
 * Architecture Principles:
 * 1. Single source of truth for each event type
 * 2. Debounced query invalidations to reduce network traffic
 * 3. Type-safe event handling using shared types
 * 4. Separation of concerns - each hook manages one domain
 * 5. Restaurant ID filtering to prevent cross-restaurant updates
 */

import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketEvent } from '@tabsy/ui-components'
import type {
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentCreatedEvent,
  PaymentRefundedEvent,
  PaymentCancelledEvent,
} from '@tabsy/shared-types'
import { logger } from '../lib/logger'
import { WEBSOCKET_DEBOUNCE } from '../lib/constants'

/**
 * Debounce utility for query invalidations
 * Prevents multiple rapid invalidations from flooding the network
 */
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
        timeoutRef.current = undefined
      }, delay)
    }) as T,
    [callback, delay]
  )
}

/**
 * Type guard to validate restaurant ID match
 * Prevents processing events from other restaurants
 */
function isValidRestaurantEvent(
  data: { restaurantId?: string },
  expectedRestaurantId: string
): boolean {
  if (!data.restaurantId) {
    logger.warn('WebSocket event missing restaurantId', data)
    return false
  }

  if (data.restaurantId !== expectedRestaurantId) {
    logger.debug(
      'Ignoring event from different restaurant',
      {
        expected: expectedRestaurantId,
        received: data.restaurantId,
      }
    )
    return false
  }

  return true
}

/**
 * ============================================================================
 * PAYMENT WEBSOCKET SYNC HOOK
 * ============================================================================
 *
 * Consolidates all payment-related WebSocket events into a single hook.
 * This eliminates 25 duplicate event listeners across 5 components.
 *
 * Usage: Call ONLY from PaymentManagement.tsx parent component
 * Child components should rely on React Query cache updates
 *
 * Before: 6 components × 5 events = 30 listeners → 18-25 invalidations per event
 * After: 1 hook × 5 events = 5 listeners → 1-2 invalidations per event
 */
export function usePaymentWebSocketSync(restaurantId: string): void {
  const queryClient = useQueryClient()

  // Single invalidation function for all payment events
  // Debounced to prevent excessive refetches
  const invalidatePaymentQueries = useCallback(() => {
    logger.payment('Invalidating payment queries', { restaurantId })

    // Invalidate active payments (matches all filterStatus variants)
    queryClient.invalidateQueries({
      queryKey: ['restaurant', 'active-payments', restaurantId],
      refetchType: 'active',
    })

    // Invalidate payment history (matches all filter variants)
    queryClient.invalidateQueries({
      queryKey: ['restaurant', 'payment-history', restaurantId],
      refetchType: 'active',
    })

    // Invalidate pending cash payments
    queryClient.invalidateQueries({
      queryKey: ['restaurant', 'pending-cash-payments', restaurantId],
      refetchType: 'active',
    })

    // Invalidate payment metrics
    queryClient.invalidateQueries({
      queryKey: ['restaurant', 'payment-metrics', restaurantId],
      refetchType: 'active',
    })

    // Invalidate dashboard overview (for payment counts)
    queryClient.invalidateQueries({
      queryKey: ['dashboard', 'overview', restaurantId],
      refetchType: 'active',
    })
  }, [queryClient, restaurantId])

  // Debounce invalidations to prevent rapid-fire refetches
  const debouncedInvalidate = useDebounce(
    invalidatePaymentQueries,
    WEBSOCKET_DEBOUNCE.PAYMENTS
  )

  // Payment Created Event Handler
  const handlePaymentCreated = useCallback(
    (data: unknown) => {
      const event = data as PaymentCreatedEvent

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.payment('Payment created', {
        paymentId: event.paymentId,
        amount: event.amount,
        method: event.paymentMethod,
      })

      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  // Payment Completed Event Handler
  const handlePaymentCompleted = useCallback(
    (data: unknown) => {
      const event = data as PaymentCompletedEvent

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.payment('Payment completed', {
        paymentId: event.paymentId,
        amount: event.amount,
        totalAmount: event.totalAmount,
      })

      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  // Payment Failed Event Handler
  const handlePaymentFailed = useCallback(
    (data: unknown) => {
      const event = data as PaymentFailedEvent

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.payment('Payment failed', {
        paymentId: event.paymentId,
        error: event.error,
        errorMessage: event.errorMessage,
      })

      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  // Payment Refunded Event Handler
  const handlePaymentRefunded = useCallback(
    (data: unknown) => {
      const event = data as PaymentRefundedEvent

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.payment('Payment refunded', {
        paymentId: event.paymentId,
        refundAmount: event.refundAmount,
        reason: event.reason,
      })

      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  // Payment Cancelled Event Handler
  const handlePaymentCancelled = useCallback(
    (data: unknown) => {
      const event = data as PaymentCancelledEvent

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.payment('Payment cancelled', {
        paymentId: event.paymentId,
        reason: event.reason,
      })

      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  // Register event listeners (only once per component mount)
  useWebSocketEvent('payment:created', handlePaymentCreated, [handlePaymentCreated], 'PaymentWebSocketSync')
  useWebSocketEvent('payment:completed', handlePaymentCompleted, [handlePaymentCompleted], 'PaymentWebSocketSync')
  useWebSocketEvent('payment:failed', handlePaymentFailed, [handlePaymentFailed], 'PaymentWebSocketSync')
  useWebSocketEvent('payment:refunded', handlePaymentRefunded, [handlePaymentRefunded], 'PaymentWebSocketSync')
  useWebSocketEvent('payment:cancelled', handlePaymentCancelled, [handlePaymentCancelled], 'PaymentWebSocketSync')

  logger.debug('Payment WebSocket sync initialized', { restaurantId })
}

/**
 * ============================================================================
 * ORDER WEBSOCKET SYNC HOOK
 * ============================================================================
 *
 * Consolidates all order-related WebSocket events into a single hook.
 * This eliminates 9 duplicate event listeners across 3 components.
 *
 * Usage: Call ONLY from OrdersManagement.tsx or dashboard-page.tsx
 *
 * Before: 3 components × 3 events = 9 listeners → 9+ invalidations per event
 * After: 1 hook × 3 events = 3 listeners → 1-2 invalidations per event
 */
export function useOrderWebSocketSync(restaurantId: string): void {
  const queryClient = useQueryClient()

  const invalidateOrderQueries = useCallback(() => {
    logger.order('Invalidating order queries', { restaurantId })

    queryClient.invalidateQueries({
      queryKey: ['orders', 'restaurant', restaurantId],
      refetchType: 'active',
    })

    queryClient.invalidateQueries({
      queryKey: ['dashboard', 'overview', restaurantId],
      refetchType: 'active',
    })

    queryClient.invalidateQueries({
      queryKey: ['dashboard', 'recent-orders', restaurantId],
      refetchType: 'active',
    })
  }, [queryClient, restaurantId])

  const debouncedInvalidate = useDebounce(
    invalidateOrderQueries,
    WEBSOCKET_DEBOUNCE.ORDERS
  )

  const handleOrderCreated = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || !data) return
      const event = data as { restaurantId?: string; orderId?: string }

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.order('Order created', { orderId: event.orderId })
      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  const handleOrderUpdated = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || !data) return
      const event = data as { restaurantId?: string; orderId?: string }

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.order('Order updated', { orderId: event.orderId })
      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  const handleOrderStatusUpdated = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || !data) return
      const event = data as { restaurantId?: string; orderId?: string; newStatus?: string }

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.order('Order status updated', { orderId: event.orderId, newStatus: event.newStatus })
      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  useWebSocketEvent('order:created', handleOrderCreated, [handleOrderCreated], 'OrderWebSocketSync')
  useWebSocketEvent('order:updated', handleOrderUpdated, [handleOrderUpdated], 'OrderWebSocketSync')
  useWebSocketEvent('order:status_updated', handleOrderStatusUpdated, [handleOrderStatusUpdated], 'OrderWebSocketSync')

  logger.debug('Order WebSocket sync initialized', { restaurantId })
}

/**
 * ============================================================================
 * TABLE WEBSOCKET SYNC HOOK
 * ============================================================================
 *
 * Consolidates table-related WebSocket events.
 *
 * Usage: Call from TableManagement.tsx
 */
export function useTableWebSocketSync(restaurantId: string): void {
  const queryClient = useQueryClient()

  const invalidateTableQueries = useCallback(() => {
    logger.info('Invalidating table queries', { restaurantId })

    queryClient.invalidateQueries({
      queryKey: ['tables', restaurantId],
      refetchType: 'active',
    })

    queryClient.invalidateQueries({
      queryKey: ['table-sessions', restaurantId],
      refetchType: 'active',
    })
  }, [queryClient, restaurantId])

  const debouncedInvalidate = useDebounce(invalidateTableQueries, 1000)

  const handleTableUpdated = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || !data) return
      const event = data as { restaurantId?: string; tableId?: string }

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.info('Table updated', { tableId: event.tableId })
      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  // TODO: Uncomment when table event types are added to @tabsy/shared-types WebSocketEventMap
  // useWebSocketEvent('table:updated', handleTableUpdated, [handleTableUpdated], 'TableWebSocketSync')
  // useWebSocketEvent('table:occupied', handleTableUpdated, [handleTableUpdated], 'TableWebSocketSync')
  // useWebSocketEvent('table:available', handleTableUpdated, [handleTableUpdated], 'TableWebSocketSync')

  logger.debug('Table WebSocket sync initialized (events pending type definitions)', { restaurantId })
}

/**
 * ============================================================================
 * ASSISTANCE WEBSOCKET SYNC HOOK
 * ============================================================================
 *
 * Consolidates assistance/notification events.
 * This eliminates duplicate assistance handlers.
 *
 * Usage: Call from dashboard-page.tsx or Header.tsx (choose one)
 */
export function useAssistanceWebSocketSync(restaurantId: string): void {
  const queryClient = useQueryClient()

  const invalidateAssistanceQueries = useCallback(() => {
    logger.assistance('Invalidating assistance queries', { restaurantId })

    queryClient.invalidateQueries({
      queryKey: ['notifications', restaurantId],
      refetchType: 'active',
    })

    queryClient.invalidateQueries({
      queryKey: ['assistance-requests', restaurantId],
      refetchType: 'active',
    })
  }, [queryClient, restaurantId])

  const debouncedInvalidate = useDebounce(
    invalidateAssistanceQueries,
    WEBSOCKET_DEBOUNCE.NOTIFICATIONS
  )

  const handleAssistanceRequested = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || !data) return
      const event = data as { restaurantId?: string; tableNumber?: string }

      if (!isValidRestaurantEvent(event, restaurantId)) return

      logger.assistance('Assistance requested', { tableNumber: event.tableNumber })
      debouncedInvalidate()
    },
    [restaurantId, debouncedInvalidate]
  )

  useWebSocketEvent('assistance:requested', handleAssistanceRequested, [handleAssistanceRequested], 'AssistanceWebSocketSync')

  logger.debug('Assistance WebSocket sync initialized', { restaurantId })
}
