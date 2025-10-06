'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { TabsyWebSocketClient, WebSocketEventMap, WebSocketEventListener } from '@tabsy/api-client'
import { useWebSocketEventRegistry } from '../hooks/useWebSocketEventRegistry'

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
  url?: string
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
  url,
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

  // Container deployment optimization: Track reconnection attempts
  const reconnectAttemptsRef = useRef<number>(0)
  const maxReconnectAttempts = 10 // Stop trying after 10 attempts
  const maxReconnectDelay = 30000 // Cap delay at 30 seconds

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Reset reconnection attempts counter
  const resetReconnectAttempts = useCallback(() => {
    reconnectAttemptsRef.current = 0
  }, [])

  // Connect to WebSocket with proper error handling
  const connect = useCallback(() => {
    console.log('🔄 [WebSocket] Connect function called')

    // Validate required auth parameters based on namespace
    if (!authToken) {
      console.warn('⚠️ [WebSocket] Cannot connect without auth token')
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
        url,
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
        console.log('🔌 [WebSocket] Connected successfully')
        console.log('🔍 [WebSocket] Connection details:', {
          namespace,
          restaurantId,
          tableId,
          authToken: authToken ? `${authToken.substring(0, 8)}...` : 'none'
        })
        console.log('🔄 [WebSocket] Setting isConnected to true')
        setIsConnected(true)
        setError(null)
        clearReconnectTimeout()
        resetReconnectAttempts() // Reset counter on successful connection
      })


      client.on('disconnect', (reason: any) => {
        console.log('🔌❌ [WebSocket] Disconnected - Setting isConnected to false', { reason })
        setIsConnected(false)

        // Check disconnect reason
        if (reason === 'io server disconnect') {
          console.log('📊 [WebSocket] Server-initiated disconnect - likely session replacement')
          // Server forced disconnect, don't auto-reconnect
          setError(new Error('Session has been replaced or ended by the server'))
        } else if (reason === 'io client disconnect') {
          console.log('👤 [WebSocket] Client-initiated disconnect')
          // Client initiated, normal behavior
        } else {
          console.log('🌐 [WebSocket] Network or unknown disconnect:', reason)
          // Network issues or unknown, might want to reconnect
          if (autoConnect && !reconnectTimeoutRef.current) {
            // Container deployment optimization: Limit reconnection attempts
            if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
              console.log(`❌ [WebSocket] Max reconnection attempts (${maxReconnectAttempts}) reached. Stopping reconnection.`)
              setError(new Error('Maximum reconnection attempts reached'))
              return
            }

            reconnectAttemptsRef.current++
            // Exponential backoff with cap
            const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current - 1), maxReconnectDelay)
            console.log(`🔄 [WebSocket] Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} after ${delay}ms...`)

            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, delay)
          }
        }
      })

      client.on('error', (err: Error) => {
        console.error('🚨 [WebSocket] Connection error:', err)
        setError(err)
        console.log('🔄 [WebSocket] Setting isConnected to false due to error')
        setIsConnected(false)

        // Check if it's a session-related error
        const errorMessage = err?.message || ''
        const isSessionError = errorMessage.includes('Invalid session') ||
                              errorMessage.includes('Session expired') ||
                              errorMessage.includes('Session replaced')

        if (isSessionError) {
          console.log('🔒 [WebSocket] Session error detected, not auto-reconnecting')
          // Don't auto-reconnect for session errors
          return
        }

        // Auto-reconnect for other errors (with limits)
        if (autoConnect) {
          // Container deployment optimization: Limit reconnection attempts
          if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.log(`❌ [WebSocket] Max reconnection attempts (${maxReconnectAttempts}) reached. Stopping reconnection.`)
            setError(new Error('Maximum reconnection attempts reached'))
            return
          }

          clearReconnectTimeout()
          reconnectAttemptsRef.current++
          // Exponential backoff with cap
          const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current - 1), maxReconnectDelay)
          console.log(`🔄 [WebSocket] Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} after ${delay}ms (after error)...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      })

      client.connect()
      clientRef.current = client

    } catch (err) {
      const error = err instanceof Error ? err : new Error('WebSocket connection failed')
      console.error('WebSocket: Failed to create connection', error)
      setError(error)
    }
  }, [url, authToken, restaurantId, tableId, namespace, autoConnect, clearReconnectTimeout, resetReconnectAttempts, maxReconnectAttempts, maxReconnectDelay])

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

  // Reconnect when auth token, restaurant, table, or URL changes
  useEffect(() => {
    if (isConnected && clientRef.current) {
      disconnect()
      if (autoConnect) {
        setTimeout(connect, 100) // Small delay to ensure cleanup
      }
    }
  }, [url, authToken, restaurantId, tableId])

  // Connect when session data becomes available (fixes initial connection timing)
  useEffect(() => {
    console.log('🔍 [WebSocket] Session data check:', {
      isConnected,
      autoConnect,
      hasAuthToken: !!authToken,
      restaurantId,
      tableId,
      namespace
    })

    if (!isConnected && autoConnect && authToken &&
        (namespace === 'restaurant' || (namespace === 'customer' && restaurantId && tableId))) {
      console.log('🚀 [WebSocket] Session data now available, attempting connection...')
      connect()
    } else {
      console.log('⏸️ [WebSocket] Connection conditions not met')
    }
  }, [isConnected, autoConnect, authToken, restaurantId, tableId, namespace, connect])

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

  // Use the imported registry hook

  // Get component name from stack trace if not provided
  const finalComponentName = componentName || (() => {
    const stack = new Error().stack || ''
    const match = stack.split('\n')[3]?.match(/at (\w+)/)
    return match?.[1] || 'UnknownComponent'
  })()

  console.log(`🎯 [useWebSocketEvent] Setting up event listener for ${event} in ${finalComponentName}`, {
    hasClient: !!client,
    clientConnected: client?.isConnected?.() || false,
    event,
    componentName: finalComponentName
  })

  const { registrationId, isRegistered } = useWebSocketEventRegistry(
    client,
    event,
    listener,
    finalComponentName,
    deps
  )

  return { registrationId, isRegistered }
}