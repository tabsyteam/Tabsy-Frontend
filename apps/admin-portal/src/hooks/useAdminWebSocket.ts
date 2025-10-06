'use client'

import { useState, useEffect } from 'react'
import {
  useWebSocket,
  useAnalyticsUpdates,
  type UseWebSocketOptions
} from '@tabsy/api-client'

interface AdminWebSocketOptions {
  onAnalyticsUpdate?: (data: any) => void
  onRestaurantUpdate?: (data: any) => void
  onUserUpdate?: (data: any) => void
  onSystemAlert?: (data: any) => void
  onPaymentUpdate?: (data: any) => void
  onOrderUpdate?: (data: any) => void
}

/**
 * Hook for admin portal WebSocket connections
 * Handles system-wide administrative events and analytics
 */
export function useAdminWebSocket({
  onAnalyticsUpdate,
  onRestaurantUpdate,
  onUserUpdate,
  onSystemAlert,
  onPaymentUpdate,
  onOrderUpdate
}: AdminWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)

  const wsOptions: UseWebSocketOptions = {
    url: process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5001',
    auth: {
      namespace: 'restaurant', // Admin uses restaurant namespace with elevated permissions
      // token would come from auth context/localStorage with ADMIN role
    },
    onConnect: () => {
      console.log(`[useAdminWebSocket] Connected to admin WebSocket`)
      setIsConnected(true)
    },
    onDisconnect: (reason: string) => {
      console.log(`[useAdminWebSocket] Disconnected:`, reason)
      setIsConnected(false)
    },
    onError: (error: Error) => {
      console.error('[useAdminWebSocket] WebSocket error:', error)
      setIsConnected(false)
    }
  }

  // Use the main WebSocket connection
  const { disconnect, joinRoom, leaveRoom } = useWebSocket(wsOptions)

  // Set up analytics updates for admin dashboard
  useAnalyticsUpdates(null, 'system', (data) => {
    console.log('[useAdminWebSocket] Analytics update:', data)
    onAnalyticsUpdate?.(data)
  })

  // Join admin-specific rooms for system-wide events
  useEffect(() => {
    if (isConnected) {
      // Join system-wide admin rooms
      joinRoom('admin:system')
      joinRoom('admin:analytics')
      joinRoom('admin:restaurants')
      joinRoom('admin:users')
      joinRoom('admin:payments')

      return () => {
        leaveRoom('admin:system')
        leaveRoom('admin:analytics')
        leaveRoom('admin:restaurants')
        leaveRoom('admin:users')
        leaveRoom('admin:payments')
      }
    }
  }, [isConnected, joinRoom, leaveRoom])

  return {
    isConnected,
    disconnect
  }
}

/**
 * Hook for system-wide analytics updates (admin only)
 */
export function useAdminAnalyticsWebSocket(
  onAnalyticsUpdate?: (data: any) => void
) {
  const { isConnected } = useAdminWebSocket({
    onAnalyticsUpdate: (data) => {
      // Real-time analytics updates for admin dashboard
      console.log('[useAdminAnalyticsWebSocket] Analytics update:', data)
      onAnalyticsUpdate?.(data)
    }
  })

  return { isConnected }
}

/**
 * Hook for restaurant management updates (admin only)
 */
export function useAdminRestaurantWebSocket(
  onRestaurantUpdate?: (data: any) => void
) {
  const { isConnected } = useAdminWebSocket({
    onRestaurantUpdate: (data) => {
      // Restaurant status changes, new registrations, etc.
      console.log('[useAdminRestaurantWebSocket] Restaurant update:', data)
      onRestaurantUpdate?.(data)
    }
  })

  return { isConnected }
}

/**
 * Hook for user management updates (admin only)
 */
export function useAdminUserWebSocket(
  onUserUpdate?: (data: any) => void
) {
  const { isConnected } = useAdminWebSocket({
    onUserUpdate: (data) => {
      // User registration, role changes, etc.
      console.log('[useAdminUserWebSocket] User update:', data)
      onUserUpdate?.(data)
    }
  })

  return { isConnected }
}

/**
 * Hook for system alerts and critical notifications (admin only)
 */
export function useAdminSystemWebSocket(
  onSystemAlert?: (data: any) => void
) {
  const { isConnected } = useAdminWebSocket({
    onSystemAlert: (data) => {
      // Critical system alerts, security issues, etc.
      console.log('[useAdminSystemWebSocket] System alert:', data)
      onSystemAlert?.(data)
    }
  })

  return { isConnected }
}