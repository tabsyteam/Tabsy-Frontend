'use client';

import { useEffect, useRef, useState, useCallback, DependencyList } from 'react';
import { TabsyWebSocketClient, WebSocketEventHandlers } from './client';
import { WebSocketEventMap, WebSocketEventListener } from './events';

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  auth?: {
    token?: string;
    restaurantId?: string;
    namespace?: 'restaurant' | 'customer';
  };
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for managing WebSocket connection
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const clientRef = useRef<TabsyWebSocketClient | null>(null);

  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (clientRef.current) {
      clientRef.current.emit(event, data);
    }
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    if (clientRef.current) {
      clientRef.current.joinRoom(roomId);
    }
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    if (clientRef.current) {
      clientRef.current.leaveRoom(roomId);
    }
  }, []);

  useEffect(() => {
    const eventHandlers: WebSocketEventHandlers = {
      onConnect: () => {
        setIsConnected(true);
        setError(null);
        setReconnectAttempt(0);
        options.onConnect?.();
      },
      onDisconnect: (reason) => {
        setIsConnected(false);
        options.onDisconnect?.(reason);
      },
      onError: (error) => {
        setError(error);
        options.onError?.(error);
      },
      onReconnect: (attemptNumber) => {
        setReconnectAttempt(attemptNumber);
        setError(null);
      },
      onReconnectError: (error) => {
        setError(error);
      },
    };

    clientRef.current = new TabsyWebSocketClient({
      url: options.url,
      autoConnect: options.autoConnect,
      reconnectAttempts: options.reconnectAttempts,
      reconnectDelay: options.reconnectDelay,
      auth: options.auth,
    });

    clientRef.current.setEventHandlers(eventHandlers);

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [options.url, options.autoConnect, options.reconnectAttempts, options.reconnectDelay, options.auth]);

  return {
    isConnected,
    error,
    reconnectAttempt,
    connect,
    disconnect,
    emit,
    joinRoom,
    leaveRoom,
    client: clientRef.current,
  };
}

/**
 * React hook for subscribing to WebSocket events with automatic cleanup
 */
export function useWebSocketEvent<T extends keyof WebSocketEventMap>(
  client: TabsyWebSocketClient | null,
  event: T,
  listener: WebSocketEventListener<T>,
  dependencies: DependencyList = []
) {
  useEffect(() => {
    if (!client) return;

    const wrappedListener = (data: WebSocketEventMap[T]) => {
      listener(data);
    };

    client.on(event, wrappedListener);

    return () => {
      client.off(event, wrappedListener);
    };
  }, [client, event, ...dependencies]);
}

/**
 * React hook for restaurant order updates
 */
export function useOrderUpdates(
  client: TabsyWebSocketClient | null,
  restaurantId: string,
  onOrderUpdate: (data: any) => void
) {
  useEffect(() => {
    if (!client || !restaurantId) return;

    client.subscribeToOrderUpdates(restaurantId, onOrderUpdate);

    return () => {
      client.leaveRoom(`restaurant:${restaurantId}`);
    };
  }, [client, restaurantId, onOrderUpdate]);
}

/**
 * React hook for table status updates
 */
export function useTableUpdates(
  client: TabsyWebSocketClient | null,
  restaurantId: string,
  onTableUpdate: (data: any) => void
) {
  useEffect(() => {
    if (!client || !restaurantId) return;

    client.subscribeToTableUpdates(restaurantId, onTableUpdate);

    return () => {
      client.leaveRoom(`restaurant:${restaurantId}`);
    };
  }, [client, restaurantId, onTableUpdate]);
}

/**
 * React hook for payment updates
 */
export function usePaymentUpdates(
  client: TabsyWebSocketClient | null,
  restaurantId: string,
  onPaymentUpdate: (data: any) => void
) {
  useEffect(() => {
    if (!client || !restaurantId) return;

    client.subscribeToPaymentUpdates(restaurantId, onPaymentUpdate);

    return () => {
      client.leaveRoom(`restaurant:${restaurantId}`);
    };
  }, [client, restaurantId, onPaymentUpdate]);
}

/**
 * React hook for customer session updates (QR code sessions)
 */
export function useSessionUpdates(
  client: TabsyWebSocketClient | null,
  sessionId: string,
  onSessionUpdate: (data: any) => void
) {
  useEffect(() => {
    if (!client || !sessionId) return;

    client.subscribeToSessionUpdates(sessionId, onSessionUpdate);

    return () => {
      client.leaveRoom(`session:${sessionId}`);
    };
  }, [client, sessionId, onSessionUpdate]);
}

/**
 * React hook for kitchen display updates
 */
export function useKitchenUpdates(
  client: TabsyWebSocketClient | null,
  restaurantId: string,
  onKitchenUpdate: (data: any) => void
) {
  useEffect(() => {
    if (!client || !restaurantId) return;

    client.subscribeToKitchenUpdates(restaurantId, onKitchenUpdate);

    return () => {
      client.leaveRoom(`kitchen:${restaurantId}`);
    };
  }, [client, restaurantId, onKitchenUpdate]);
}

/**
 * React hook for staff notifications
 */
export function useStaffNotifications(
  client: TabsyWebSocketClient | null,
  restaurantId: string,
  onNotification: (data: any) => void
) {
  useEffect(() => {
    if (!client || !restaurantId) return;

    client.subscribeToStaffNotifications(restaurantId, onNotification);

    return () => {
      client.leaveRoom(`staff:${restaurantId}`);
    };
  }, [client, restaurantId, onNotification]);
}

/**
 * React hook for real-time analytics updates
 */
export function useAnalyticsUpdates(
  client: TabsyWebSocketClient | null,
  restaurantId: string,
  onAnalyticsUpdate: (data: any) => void
) {
  useWebSocketEvent(
    client,
    'analytics:update',
    useCallback((data: WebSocketEventMap['analytics:update']) => {
      if ((data as any).restaurantId === restaurantId) {
        onAnalyticsUpdate(data);
      }
    }, [restaurantId, onAnalyticsUpdate]),
    [restaurantId, onAnalyticsUpdate]
  );
}

/**
 * React hook for comprehensive restaurant dashboard updates
 */
export function useRestaurantDashboard(
  client: TabsyWebSocketClient | null,
  restaurantId: string,
  callbacks: {
    onOrderUpdate?: (data: any) => void;
    onTableUpdate?: (data: any) => void;
    onPaymentUpdate?: (data: any) => void;
    onKitchenUpdate?: (data: any) => void;
    onStaffNotification?: (data: any) => void;
    onAnalyticsUpdate?: (data: any) => void;
  }
) {
  useOrderUpdates(client, restaurantId, callbacks.onOrderUpdate || (() => {}));
  useTableUpdates(client, restaurantId, callbacks.onTableUpdate || (() => {}));
  usePaymentUpdates(client, restaurantId, callbacks.onPaymentUpdate || (() => {}));
  useKitchenUpdates(client, restaurantId, callbacks.onKitchenUpdate || (() => {}));
  useStaffNotifications(client, restaurantId, callbacks.onStaffNotification || (() => {}));
  useAnalyticsUpdates(client, restaurantId, callbacks.onAnalyticsUpdate || (() => {}));
}
