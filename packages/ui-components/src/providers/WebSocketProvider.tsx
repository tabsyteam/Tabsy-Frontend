'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { TabsyWebSocketClient, WebSocketEventMap, WebSocketEventListener } from '@tabsy/api-client'

interface WebSocketContextValue {
  client: TabsyWebSocketClient | null
  isConnected: boolean
  error: Error | null
  connect: () => void
  disconnect: () => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
  emit: (event: string, data: any) => void
  on: <K extends keyof WebSocketEventMap>(event: K, listener: WebSocketEventListener<K>) => () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface WebSocketProviderProps {
  children: React.ReactNode
  authToken?: string
  restaurantId?: string
  tableId?: string
  namespace?: 'restaurant' | 'customer'
  autoConnect?: boolean
}

/**
 * Shared WebSocket management for Tabsy apps
 * Provides: proper connection lifecycle, event cleanup, reconnection
 * Used by: Customer and Restaurant apps
 */
export function WebSocketProvider({
  children,
  authToken,
  restaurantId,
  tableId,
  namespace = 'restaurant',
  autoConnect = true
}: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const clientRef = useRef<TabsyWebSocketClient | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const eventListenersRef = useRef<Map<string, Set<Function>>>(new Map())

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Connect to WebSocket with proper error handling
  const connect = useCallback(() => {
    // Validate required auth parameters based on namespace
    if (!authToken) {
      console.warn('WebSocket: Cannot connect without auth token')
      return
    }

    if (namespace === 'restaurant' && !restaurantId) {
      console.warn('WebSocket: Restaurant namespace requires restaurantId')
      return
    }

    if (namespace === 'customer' && (!tableId || !restaurantId)) {
      console.warn('WebSocket: Customer namespace requires both tableId and restaurantId')
      return
    }

    // Clean up existing connection
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }

    try {
      console.log(`WebSocket: Connecting to ${namespace} namespace...`)

      const client = new TabsyWebSocketClient({
        auth: {
          token: authToken,
          namespace,
          restaurantId,
          tableId: namespace === 'customer' ? tableId : undefined,
          sessionId: namespace === 'customer' ? authToken : undefined
        }
      })

      // Set up connection event listeners
      client.on('connect', () => {
        console.log('WebSocket: Connected successfully')
        setIsConnected(true)
        setError(null)
        clearReconnectTimeout()
      })

      client.on('disconnect', () => {
        console.log('WebSocket: Disconnected')
        setIsConnected(false)
      })

      client.on('error', (err: Error) => {
        console.error('WebSocket: Connection error', err)
        setError(err)
        setIsConnected(false)

        // Auto-reconnect after 5 seconds
        if (autoConnect) {
          clearReconnectTimeout()
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('WebSocket: Attempting to reconnect...')
            connect()
          }, 5000)
        }
      })

      client.connect()
      clientRef.current = client

    } catch (err) {
      const error = err instanceof Error ? err : new Error('WebSocket connection failed')
      console.error('WebSocket: Failed to create connection', error)
      setError(error)
    }
  }, [authToken, restaurantId, namespace, autoConnect, clearReconnectTimeout])

  // Disconnect
  const disconnect = useCallback(() => {
    clearReconnectTimeout()
    if (clientRef.current) {
      console.log('WebSocket: Disconnecting...')
      clientRef.current.disconnect()
      clientRef.current = null
    }
    setIsConnected(false)
    setError(null)
  }, [clearReconnectTimeout])

  // Room management
  const joinRoom = useCallback((roomId: string) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.joinRoom(roomId)
    }
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.leaveRoom(roomId)
    }
  }, [])

  // Emit events
  const emit = useCallback((event: string, data: any) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.emit(event, data)
    }
  }, [])

  // Enhanced event listener management with proper cleanup
  const on = useCallback(<K extends keyof WebSocketEventMap>(
    event: K,
    listener: WebSocketEventListener<K>
  ): (() => void) => {
    if (!clientRef.current) {
      console.warn('WebSocket: Cannot add listener, client not connected')
      return () => {}
    }

    // Track listeners for cleanup
    const eventKey = event as string
    if (!eventListenersRef.current.has(eventKey)) {
      eventListenersRef.current.set(eventKey, new Set())
    }
    eventListenersRef.current.get(eventKey)!.add(listener)

    // Add listener to client
    clientRef.current.on(event, listener)

    // Return cleanup function
    return () => {
      if (clientRef.current) {
        clientRef.current.off(event, listener)
      }

      // Remove from tracking
      const listeners = eventListenersRef.current.get(eventKey)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          eventListenersRef.current.delete(eventKey)
        }
      }
    }
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && authToken) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      clearReconnectTimeout()
      if (clientRef.current) {
        // Clean up all tracked listeners
        eventListenersRef.current.forEach((listeners, event) => {
          listeners.forEach(listener => {
            clientRef.current?.off(event as any, listener as any)
          })
        })
        eventListenersRef.current.clear()

        clientRef.current.disconnect()
        clientRef.current = null
      }
    }
  }, [autoConnect, authToken, connect, clearReconnectTimeout])

  // Reconnect when auth token or restaurant changes
  useEffect(() => {
    if (isConnected && clientRef.current) {
      disconnect()
      if (autoConnect) {
        setTimeout(connect, 100) // Small delay to ensure cleanup
      }
    }
  }, [authToken, restaurantId])

  const value: WebSocketContextValue = {
    client: clientRef.current,
    isConnected,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    emit,
    on
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

// Convenience hook for event listeners with automatic cleanup and deduplication
export function useWebSocketEvent<K extends keyof WebSocketEventMap>(
  event: K,
  listener: WebSocketEventListener<K>,
  deps: React.DependencyList = [],
  componentName?: string
) {
  const { client } = useWebSocket()

  // Import the registry hook dynamically to avoid circular imports
  const { useWebSocketEventRegistry } = require('../hooks/useWebSocketEventRegistry')

  // Get component name from stack trace if not provided
  const finalComponentName = componentName || (() => {
    const stack = new Error().stack || ''
    const match = stack.split('\n')[3]?.match(/at (\w+)/)
    return match?.[1] || 'UnknownComponent'
  })()

  const { registrationId, isRegistered } = useWebSocketEventRegistry(
    client,
    event,
    listener,
    finalComponentName,
    deps
  )

  return { registrationId, isRegistered }
}