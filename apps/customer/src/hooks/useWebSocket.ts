import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useWebSocket as useTabsyWebSocket, useOrderUpdates } from '@tabsy/api-client'
import { SessionManager } from '../lib/session'

interface WebSocketOptions {
  onMessage?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface UseWebSocketReturn {
  socket: WebSocket | null
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error'
  send: (data: any) => void
  close: () => void
  reconnect: () => void
}

export function useWebSocket(url: string, options: WebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options

  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionState('connecting')

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setConnectionState('connected')
        reconnectAttempts.current = 0
        setSocket(ws)
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          onMessage?.(event.data)
        }
      }

      ws.onclose = () => {
        setConnectionState('disconnected')
        setSocket(null)
        onDisconnect?.()

        // Auto-reconnect if enabled and not manually closed
        if (autoReconnect && shouldReconnectRef.current && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          console.log(`WebSocket disconnected. Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Maximum reconnection attempts reached')
          toast.error('Connection lost. Please refresh the page.')
        }
      }

      ws.onerror = (error) => {
        setConnectionState('error')
        console.error('WebSocket error:', error)
        onError?.(error)
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionState('error')
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval, maxReconnectAttempts])

  const send = useCallback((data: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      socket.send(message)
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', data)
    }
  }, [socket])

  const close = useCallback(() => {
    shouldReconnectRef.current = false

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socket) {
      socket.close()
      setSocket(null)
    }

    setConnectionState('disconnected')
  }, [socket])

  const reconnect = useCallback(() => {
    close()
    shouldReconnectRef.current = true
    reconnectAttempts.current = 0
    setTimeout(connect, 100)
  }, [close, connect])

  useEffect(() => {
    connect()

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      socket?.close()
    }
  }, [connect])

  return {
    socket,
    connectionState,
    send,
    close,
    reconnect
  }
}

/**
 * Hook for tracking order updates via WebSocket
 * Uses the real @tabsy/api-client WebSocket client
 */
export function useOrderWebSocket(orderId: string, restaurantId?: string, onOrderUpdate?: (orderData: any) => void) {
  const [isConnected, setIsConnected] = useState(false)

  // Get session info from SessionManager for WebSocket auth
  const diningSession = SessionManager.getDiningSession()
  const sessionId = diningSession?.sessionId || null
  const tableId = diningSession?.tableId || null

  const wsOptions = {
    url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5001',
    auth: {
      namespace: 'customer' as const,
      tableId: tableId || undefined, // Use actual tableId from session
      restaurantId: restaurantId,
      sessionId: sessionId || undefined // Use actual sessionId from session, not orderId
    },
    onConnect: () => {
      console.log(`[useOrderWebSocket] Connected to WebSocket for order ${orderId}`)
      setIsConnected(true)
    },
    onDisconnect: (reason: string) => {
      console.log(`[useOrderWebSocket] Disconnected from WebSocket:`, reason)
      setIsConnected(false)
    },
    onError: (error: Error) => {
      console.error('[useOrderWebSocket] WebSocket error:', error)
      setIsConnected(false)
    }
  }

  // Use the real WebSocket hook from @tabsy/api-client
  const { disconnect } = useTabsyWebSocket(wsOptions)

  // Set up order-specific event listeners
  useEffect(() => {
    if (onOrderUpdate && orderId) {
      // This is a simplified approach - in reality we'd need to listen for specific events
      console.log(`[useOrderWebSocket] Setting up order tracking for ${orderId}`)
    }
  }, [orderId, onOrderUpdate])

  return {
    isConnected,
    disconnect
  }
}

/**
 * Hook for tracking table session updates via WebSocket
 * Handles multi-user table session events
 */
export function useTableSessionWebSocket(
  tableSessionId: string,
  restaurantId: string,
  tableId: string,
  guestSessionId: string,
  onTableSessionUpdate?: (data: any) => void
) {
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    if (!tableSessionId || !restaurantId || !tableId) return

    // Use native WebSocket for now, can be upgraded to socket.io later
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5001'}/customer?tableId=${tableId}&restaurantId=${restaurantId}&sessionId=${guestSessionId}&tableSessionId=${tableSessionId}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log(`[useTableSessionWebSocket] Connected for table session ${tableSessionId}`)
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log(`[useTableSessionWebSocket] Received:`, data)

        // Handle different table session events
        if (data.type && data.type.startsWith('table:')) {
          onTableSessionUpdate?.(data)
        }
      } catch (error) {
        console.error('[useTableSessionWebSocket] Failed to parse message:', error)
      }
    }

    ws.onclose = () => {
      console.log(`[useTableSessionWebSocket] Disconnected from table session ${tableSessionId}`)
      setIsConnected(false)
    }

    ws.onerror = (error) => {
      console.error('[useTableSessionWebSocket] WebSocket error:', error)
      setIsConnected(false)
    }

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [tableSessionId, restaurantId, tableId, guestSessionId, onTableSessionUpdate])

  return {
    isConnected,
    disconnect: () => {
      if (socket) {
        socket.close()
        setIsConnected(false)
      }
    }
  }
}
