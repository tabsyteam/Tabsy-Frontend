import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'

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

// Hook specifically for order updates
export function useOrderWebSocket(orderId: string, onOrderUpdate?: (orderData: any) => void) {
  // In a real implementation, this would connect to your WebSocket server
  // For now, we'll simulate the WebSocket behavior
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!orderId) return

    // Simulate WebSocket connection
    console.log(`Connecting to order updates for order: ${orderId}`)
    setIsConnected(true)

    // Simulate periodic updates (in real app, this would be actual WebSocket events)
    const simulateUpdates = () => {
      // This would be replaced with real WebSocket messages
      const mockUpdates = [
        { type: 'status_update', orderId, status: 'preparing', estimatedTime: 15 },
        { type: 'status_update', orderId, status: 'ready', estimatedTime: 0 },
        { type: 'status_update', orderId, status: 'delivered', estimatedTime: 0 }
      ]

      // Simulate random status updates (for demo purposes)
      const randomUpdate = mockUpdates[Math.floor(Math.random() * mockUpdates.length)]

      // In a real app, you would only call onOrderUpdate when you receive actual WebSocket messages
      // onOrderUpdate?.(randomUpdate)
    }

    // Set up cleanup
    const cleanup = () => {
      console.log(`Disconnecting from order updates for order: ${orderId}`)
      setIsConnected(false)
    }

    return cleanup
  }, [orderId, onOrderUpdate])

  return {
    isConnected,
    disconnect: () => setIsConnected(false)
  }
}