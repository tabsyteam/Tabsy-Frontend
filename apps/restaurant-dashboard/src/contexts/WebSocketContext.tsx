'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { TabsyWebSocketClient, WebSocketEventMap, WebSocketEventListener } from '@tabsy/api-client'
import { useAuth } from '@tabsy/ui-components'

interface WebSocketContextValue {
  client: TabsyWebSocketClient | null
  isConnected: boolean
  error: Error | null
  connect: () => void
  disconnect: () => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
  emit: (event: string, data: any) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface WebSocketProviderProps {
  children: React.ReactNode
  restaurantId?: string
  namespace?: 'restaurant' | 'customer'
}

// Singleton instance
let socketInstance: TabsyWebSocketClient | null = null

export function WebSocketProvider({ children, restaurantId, namespace = 'restaurant' }: WebSocketProviderProps) {
  const { session, user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const clientRef = useRef<TabsyWebSocketClient | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!session?.token || !restaurantId) {
      console.warn('WebSocket: Cannot connect without token and restaurantId')
      return
    }

    // Use existing singleton instance if available
    if (socketInstance?.isConnected()) {
      console.log('WebSocket: Using existing connection')
      clientRef.current = socketInstance
      setIsConnected(true)
      return
    }

    // Create new singleton instance
    if (!socketInstance) {
      console.log('WebSocket: Creating new singleton connection')
      socketInstance = new TabsyWebSocketClient({
        url: process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5001',
        autoConnect: false,
        reconnectAttempts: 5,
        reconnectDelay: 2000,
        auth: {
          token: session.token,
          restaurantId,
          namespace
        }
      })

      // Set up event handlers
      socketInstance.setEventHandlers({
        onConnect: () => {
          console.log('WebSocket: Connected successfully')
          setIsConnected(true)
          setError(null)

          // Clear any pending reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
        },
        onDisconnect: (reason) => {
          console.log('WebSocket: Disconnected:', reason)
          setIsConnected(false)

          // Attempt to reconnect after delay
          if (!reconnectTimeoutRef.current && session?.token) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('WebSocket: Attempting to reconnect...')
              connect()
            }, 5000)
          }
        },
        onError: (err) => {
          console.error('WebSocket: Error:', err)
          setError(err)
        },
        onReconnect: (attemptNumber) => {
          console.log(`WebSocket: Reconnected after ${attemptNumber} attempts`)
          setIsConnected(true)
          setError(null)
        }
      })
    }

    // Update auth and connect
    socketInstance.setAuth({
      token: session.token,
      restaurantId,
      namespace
    })

    socketInstance.connect()
    clientRef.current = socketInstance
  }, [session?.token, restaurantId, namespace])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socketInstance) {
      console.log('WebSocket: Disconnecting...')
      socketInstance.disconnect()
      socketInstance = null
      clientRef.current = null
      setIsConnected(false)
    }
  }, [])

  // Join a room
  const joinRoom = useCallback((roomId: string) => {
    if (socketInstance?.isConnected()) {
      socketInstance.joinRoom(roomId)
    }
  }, [])

  // Leave a room
  const leaveRoom = useCallback((roomId: string) => {
    if (socketInstance?.isConnected()) {
      socketInstance.leaveRoom(roomId)
    }
  }, [])

  // Emit an event
  const emit = useCallback((event: string, data: any) => {
    if (socketInstance?.isConnected()) {
      socketInstance.emit(event, data)
    }
  }, [])

  // Connect when component mounts and auth is available
  useEffect(() => {
    if (session?.token && restaurantId && !isConnected) {
      connect()
    }

    return () => {
      // Don't disconnect on unmount to preserve singleton
      // Only clear the reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [session?.token, restaurantId, connect, isConnected])

  // Update auth when session changes
  useEffect(() => {
    if (socketInstance && session?.token && restaurantId) {
      socketInstance.setAuth({
        token: session.token,
        restaurantId,
        namespace
      })
    }
  }, [session?.token, restaurantId, namespace])

  const contextValue: WebSocketContextValue = {
    client: clientRef.current,
    isConnected,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    emit
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

// Hook to use WebSocket context
export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}

// Hook to subscribe to WebSocket events
export function useWebSocketEvent<T extends keyof WebSocketEventMap>(
  event: T,
  listener: WebSocketEventListener<T>,
  dependencies: React.DependencyList = []
) {
  const { client } = useWebSocketContext()

  useEffect(() => {
    if (!client) return

    const wrappedListener = (data: WebSocketEventMap[T]) => {
      listener(data)
    }

    client.on(event, wrappedListener)

    return () => {
      client.off(event, wrappedListener)
    }
  }, [client, event, ...dependencies])
}

// Hook to emit WebSocket events
export function useWebSocketEmit() {
  const { emit } = useWebSocketContext()
  return emit
}

// Hook to get connection status
export function useWebSocketStatus() {
  const { isConnected, error } = useWebSocketContext()
  return { isConnected, error }
}