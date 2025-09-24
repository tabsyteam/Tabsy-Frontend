import { useEffect, useState, useCallback } from 'react'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { SessionManager } from '../lib/session'

/**
 * Hook for tracking order updates via WebSocket
 * Uses the standardized @tabsy/ui-components WebSocket client
 */
export function useOrderWebSocket(orderId: string, restaurantId?: string, onOrderUpdate?: (orderData: any) => void) {
  const [isConnected, setIsConnected] = useState(false)

  // Use the standardized WebSocket from ui-components
  const { isConnected: wsConnected, client } = useWebSocket()

  // Update connection state when WebSocket state changes
  useEffect(() => {
    setIsConnected(wsConnected)
  }, [wsConnected])

  // Set up order-specific event listeners
  const handleOrderStatusUpdate = useCallback((data: any) => {
    if (data.orderId === orderId) {
      console.log(`[useOrderWebSocket] Order ${orderId} status updated:`, data)
      onOrderUpdate?.(data)
    }
  }, [orderId, onOrderUpdate])

  const handleOrderUpdate = useCallback((data: any) => {
    if (data.orderId === orderId) {
      console.log(`[useOrderWebSocket] Order ${orderId} updated:`, data)
      onOrderUpdate?.(data)
    }
  }, [orderId, onOrderUpdate])

  // Register event listeners
  useWebSocketEvent('order:status_updated', handleOrderStatusUpdate, [handleOrderStatusUpdate], 'useOrderWebSocket')
  useWebSocketEvent('order:updated', handleOrderUpdate, [handleOrderUpdate], 'useOrderWebSocket')

  return {
    isConnected,
    disconnect: () => {
      // Disconnect is handled by the main WebSocket client
      console.log(`[useOrderWebSocket] Disconnect requested for order ${orderId}`)
    }
  }
}

/**
 * Hook for tracking table session updates via WebSocket
 * Uses the standardized @tabsy/ui-components WebSocket client
 */
export function useTableSessionWebSocket(
  tableSessionId: string,
  restaurantId: string,
  tableId: string,
  guestSessionId: string,
  onTableSessionUpdate?: (data: any) => void
) {
  const [isConnected, setIsConnected] = useState(false)

  // Use the standardized WebSocket from ui-components
  const { isConnected: wsConnected, client } = useWebSocket()

  // Update connection state when WebSocket state changes
  useEffect(() => {
    setIsConnected(wsConnected)
  }, [wsConnected])

  // Set up table session event listeners
  const handleTableSessionCreated = useCallback((data: any) => {
    if (data.tableSessionId === tableSessionId) {
      console.log(`[useTableSessionWebSocket] Table session ${tableSessionId} created:`, data)
      onTableSessionUpdate?.(data)
    }
  }, [tableSessionId, onTableSessionUpdate])

  const handleTableUserJoined = useCallback((data: any) => {
    if (data.tableSessionId === tableSessionId) {
      console.log(`[useTableSessionWebSocket] User joined table session ${tableSessionId}:`, data)
      onTableSessionUpdate?.(data)
    }
  }, [tableSessionId, onTableSessionUpdate])

  const handleTableUserLeft = useCallback((data: any) => {
    if (data.tableSessionId === tableSessionId) {
      console.log(`[useTableSessionWebSocket] User left table session ${tableSessionId}:`, data)
      onTableSessionUpdate?.(data)
    }
  }, [tableSessionId, onTableSessionUpdate])

  const handleTableSessionClosed = useCallback((data: any) => {
    if (data.tableSessionId === tableSessionId) {
      console.log(`[useTableSessionWebSocket] Table session ${tableSessionId} closed:`, data)
      onTableSessionUpdate?.(data)
    }
  }, [tableSessionId, onTableSessionUpdate])

  const handleTableSessionUpdated = useCallback((data: any) => {
    if (data.tableSessionId === tableSessionId) {
      console.log(`[useTableSessionWebSocket] Table session ${tableSessionId} updated:`, data)
      onTableSessionUpdate?.(data)
    }
  }, [tableSessionId, onTableSessionUpdate])

  const handlePaymentStatusUpdate = useCallback((data: any) => {
    if (data.tableSessionId === tableSessionId) {
      console.log(`[useTableSessionWebSocket] Payment status updated for table session ${tableSessionId}:`, data)
      onTableSessionUpdate?.({ type: 'payment_status_update', ...data })
    }
  }, [tableSessionId, onTableSessionUpdate])

  const handlePaymentCompleted = useCallback((data: any) => {
    if (data.tableSessionId === tableSessionId) {
      console.log(`[useTableSessionWebSocket] Payment completed for table session ${tableSessionId}:`, data)
      onTableSessionUpdate?.({ type: 'payment_completed', ...data })
    }
  }, [tableSessionId, onTableSessionUpdate])

  // Register event listeners
  useWebSocketEvent('table:session_created', handleTableSessionCreated, [handleTableSessionCreated], 'useTableSessionWebSocket')
  useWebSocketEvent('table:user_joined', handleTableUserJoined, [handleTableUserJoined], 'useTableSessionWebSocket')
  useWebSocketEvent('table:user_left', handleTableUserLeft, [handleTableUserLeft], 'useTableSessionWebSocket')
  useWebSocketEvent('table:session_closed', handleTableSessionClosed, [handleTableSessionClosed], 'useTableSessionWebSocket')
  useWebSocketEvent('table:session_updated', handleTableSessionUpdated, [handleTableSessionUpdated], 'useTableSessionWebSocket')
  useWebSocketEvent('payment:status_updated', handlePaymentStatusUpdate, [handlePaymentStatusUpdate], 'useTableSessionWebSocket')
  useWebSocketEvent('payment:completed', handlePaymentCompleted, [handlePaymentCompleted], 'useTableSessionWebSocket')

  return {
    isConnected,
    disconnect: () => {
      // Disconnect is handled by the main WebSocket client
      console.log(`[useTableSessionWebSocket] Disconnect requested for table session ${tableSessionId}`)
    }
  }
}
