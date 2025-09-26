'use client'

import { useState, useEffect } from 'react'
import {
  useWebSocket,
  useRestaurantDashboard,
  type UseWebSocketOptions
} from '@tabsy/api-client'
import { useAuth } from '@tabsy/ui-components'

interface RestaurantWebSocketOptions {
  restaurantId: string
  onOrderUpdate?: (data: any) => void
  onTableUpdate?: (data: any) => void
  onPaymentUpdate?: (data: any) => void
  onKitchenUpdate?: (data: any) => void
  onStaffNotification?: (data: any) => void
  onAnalyticsUpdate?: (data: any) => void
}

/**
 * Hook for restaurant dashboard WebSocket connections
 * Handles all restaurant-related real-time events
 */
export function useRestaurantWebSocket({
  restaurantId,
  onOrderUpdate,
  onTableUpdate,
  onPaymentUpdate,
  onKitchenUpdate,
  onStaffNotification,
  onAnalyticsUpdate
}: RestaurantWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const { session } = useAuth()

  const wsOptions: UseWebSocketOptions = {
    url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5001',
    auth: {
      namespace: 'restaurant',
      restaurantId: restaurantId,
      token: session?.token, // Now properly using token from auth context
    },
    onConnect: () => {
      console.log(`[useRestaurantWebSocket] Connected for restaurant ${restaurantId}`)
      setIsConnected(true)
    },
    onDisconnect: (reason: string) => {
      console.log(`[useRestaurantWebSocket] Disconnected:`, reason)
      setIsConnected(false)
    },
    onError: (error: Error) => {
      console.error('[useRestaurantWebSocket] WebSocket error:', error)
      setIsConnected(false)
    }
  }

  // Use the main WebSocket connection
  const { disconnect, joinRoom, leaveRoom } = useWebSocket(wsOptions)

  // Use the restaurant dashboard hook that sets up all the event listeners
  useRestaurantDashboard(null, restaurantId, {
    onOrderUpdate: (data) => {
      setLastMessage({ type: 'order', data })
      onOrderUpdate?.(data)
    },
    onTableUpdate: (data) => {
      setLastMessage({ type: 'table', data })
      onTableUpdate?.(data)
    },
    onPaymentUpdate: (data) => {
      setLastMessage({ type: 'payment', data })
      onPaymentUpdate?.(data)
    },
    onKitchenUpdate: (data) => {
      setLastMessage({ type: 'kitchen', data })
      onKitchenUpdate?.(data)
    },
    onStaffNotification: (data) => {
      setLastMessage({ type: 'notification', data })
      onStaffNotification?.(data)
    },
    onAnalyticsUpdate: (data) => {
      setLastMessage({ type: 'analytics', data })
      onAnalyticsUpdate?.(data)
    }
  })

  // Join restaurant-specific rooms
  useEffect(() => {
    if (isConnected && restaurantId) {
      joinRoom(`restaurant:${restaurantId}`)
      joinRoom(`kitchen:${restaurantId}`)
      joinRoom(`staff:${restaurantId}`)

      return () => {
        leaveRoom(`restaurant:${restaurantId}`)
        leaveRoom(`kitchen:${restaurantId}`)
        leaveRoom(`staff:${restaurantId}`)
      }
    }
  }, [isConnected, restaurantId, joinRoom, leaveRoom])

  return {
    isConnected,
    lastMessage,
    disconnect
  }
}

/**
 * Hook for order-specific WebSocket updates (restaurant side)
 */
export function useRestaurantOrderWebSocket(
  restaurantId: string,
  orderId?: string,
  onOrderUpdate?: (data: any) => void
) {
  const { isConnected } = useRestaurantWebSocket({
    restaurantId,
    onOrderUpdate: (data) => {
      // Filter to only the specific order if orderId is provided
      if (!orderId || data.orderId === orderId) {
        onOrderUpdate?.(data)
      }
    }
  })

  return { isConnected }
}

/**
 * Hook for table-specific WebSocket updates (restaurant side)
 */
export function useRestaurantTableWebSocket(
  restaurantId: string,
  tableId?: string,
  onTableUpdate?: (data: any) => void
) {
  const { isConnected } = useRestaurantWebSocket({
    restaurantId,
    onTableUpdate: (data) => {
      // Filter to only the specific table if tableId is provided
      if (!tableId || data.tableId === tableId) {
        onTableUpdate?.(data)
      }
    }
  })

  return { isConnected }
}