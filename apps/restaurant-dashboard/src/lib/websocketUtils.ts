/**
 * WebSocket Event Utilities
 * Standardized handling for WebSocket event payloads
 */

import type { Order } from '@tabsy/shared-types'
import { logger } from './logger'

/**
 * WebSocket event payload types
 * Backend can send events in different formats
 */
interface WebSocketEventPayload {
  data?: unknown
  order?: unknown
  [key: string]: unknown
}

/**
 * Extract order data from WebSocket event payload
 * Handles multiple possible payload structures from backend
 *
 * @param data - WebSocket event data
 * @returns Extracted order object or null if invalid
 */
export function extractOrderFromEvent(data: unknown): Order | null {
  if (!data || typeof data !== 'object') {
    logger.warn('Invalid WebSocket event data: not an object', data)
    return null
  }

  const payload = data as WebSocketEventPayload

  // Try different possible order locations in the payload
  let orderData: unknown = null

  if (payload.data && typeof payload.data === 'object' && 'id' in payload.data) {
    // Format: { data: { id, ... } }
    orderData = payload.data
  } else if (payload.order && typeof payload.order === 'object' && 'id' in payload.order) {
    // Format: { order: { id, ... } }
    orderData = payload.order
  } else if ('id' in payload) {
    // Format: { id, ... } (direct order object)
    orderData = payload
  }

  if (!orderData || typeof orderData !== 'object' || !('id' in orderData)) {
    logger.warn('Could not extract valid order from WebSocket event', data)
    return null
  }

  return orderData as Order
}

/**
 * Normalize order item field names
 * Backend sends 'customizations' but UI expects 'options'
 *
 * @param order - Order object to normalize
 * @returns Order with normalized field names
 */
export function normalizeOrderFields(order: Order): Order {
  if (!order.items || !Array.isArray(order.items)) {
    return order
  }

  return {
    ...order,
    items: order.items.map((item: any) => {
      // Map customizations to options if needed
      if (item.customizations && !item.options) {
        return { ...item, options: item.customizations }
      }
      return item
    })
  }
}

/**
 * Extract and normalize order from WebSocket event
 * Combines extraction and normalization in one step
 *
 * @param data - WebSocket event data
 * @returns Normalized order or null if invalid
 */
export function processOrderEvent(data: unknown): Order | null {
  const order = extractOrderFromEvent(data)
  if (!order) {
    return null
  }
  return normalizeOrderFields(order)
}

/**
 * Type guard to check if event data contains an order ID
 *
 * @param data - Event data to check
 * @returns True if data contains an order ID
 */
export function hasOrderId(data: unknown): data is { orderId: string } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'orderId' in data &&
    typeof (data as { orderId: unknown }).orderId === 'string'
  )
}

/**
 * Type guard to check if event data contains a new status
 *
 * @param data - Event data to check
 * @returns True if data contains a new status
 */
export function hasNewStatus(data: unknown): data is { newStatus: string } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'newStatus' in data &&
    typeof (data as { newStatus: unknown }).newStatus === 'string'
  )
}
