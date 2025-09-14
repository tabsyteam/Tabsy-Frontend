import { io, Socket } from 'socket.io-client';

export interface TabsyWebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  auth?: {
    token?: string;
    restaurantId?: string;
    namespace?: 'restaurant' | 'customer';
  };
}

export interface WebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attemptNumber: number) => void;
  onReconnectError?: (error: Error) => void;
}

export class TabsyWebSocketClient {
  private socket: Socket | null = null;
  private config: Required<TabsyWebSocketConfig & { auth: NonNullable<TabsyWebSocketConfig['auth']> }>;
  private eventHandlers: WebSocketEventHandlers = {};

  constructor(config: TabsyWebSocketConfig = {}) {
    this.config = {
      url: config.url || 'ws://localhost:5001',
      autoConnect: config.autoConnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      auth: {
        token: config.auth?.token,
        restaurantId: config.auth?.restaurantId,
        namespace: config.auth?.namespace || 'restaurant',
      },
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Establish WebSocket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      console.warn('WebSocket is already connected');
      return;
    }

    // Determine the namespace URL
    const namespaceUrl = this.config.auth.namespace === 'restaurant' 
      ? `${this.config.url}/restaurant`
      : `${this.config.url}/customer`;

    // Prepare connection options
    const connectionOptions: any = {
      transports: ['websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: this.config.reconnectAttempts,
      reconnectionDelay: this.config.reconnectDelay,
      timeout: 10000,
    };

    // Add authentication for restaurant namespace
    if (this.config.auth.namespace === 'restaurant' && this.config.auth.token && this.config.auth.restaurantId) {
      connectionOptions.auth = {
        token: this.config.auth.token,
        restaurantId: this.config.auth.restaurantId,
      };
    }

    this.socket = io(namespaceUrl, connectionOptions);

    this.setupEventListeners();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Set event handlers for connection lifecycle
   */
  setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Update authentication configuration
   */
  setAuth(auth: { token?: string; restaurantId?: string; namespace?: 'restaurant' | 'customer' }): void {
    this.config.auth = { ...this.config.auth, ...auth };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Join a room (for restaurant-specific events)
   */
  joinRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', roomId);
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', roomId);
    }
  }

  /**
   * Subscribe to order updates for a restaurant
   */
  subscribeToOrderUpdates(restaurantId: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.joinRoom(`restaurant:${restaurantId}`);
      this.socket.on('order:created', callback);
      this.socket.on('order:updated', callback);
      this.socket.on('order:status-changed', callback);
    }
  }

  /**
   * Subscribe to table status updates
   */
  subscribeToTableUpdates(restaurantId: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.joinRoom(`restaurant:${restaurantId}`);
      this.socket.on('table:updated', callback);
      this.socket.on('table:occupied', callback);
      this.socket.on('table:available', callback);
    }
  }

  /**
   * Subscribe to payment updates
   */
  subscribeToPaymentUpdates(restaurantId: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.joinRoom(`restaurant:${restaurantId}`);
      this.socket.on('payment:completed', callback);
      this.socket.on('payment:failed', callback);
      this.socket.on('payment:refunded', callback);
    }
  }

  /**
   * Subscribe to customer session updates (for QR code sessions)
   */
  subscribeToSessionUpdates(sessionId: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.joinRoom(`session:${sessionId}`);
      this.socket.on('session:updated', callback);
      this.socket.on('session:expired', callback);
      this.socket.on('order:status-update', callback);
    }
  }

  /**
   * Subscribe to kitchen display updates
   */
  subscribeToKitchenUpdates(restaurantId: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.joinRoom(`kitchen:${restaurantId}`);
      this.socket.on('kitchen:new-order', callback);
      this.socket.on('kitchen:order-ready', callback);
      this.socket.on('kitchen:order-cancelled', callback);
    }
  }

  /**
   * Subscribe to staff notifications
   */
  subscribeToStaffNotifications(restaurantId: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.joinRoom(`staff:${restaurantId}`);
      this.socket.on('notification:staff', callback);
      this.socket.on('alert:urgent', callback);
    }
  }

  /**
   * Send custom event
   */
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Listen to custom event
   */
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.eventHandlers.onConnect?.();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this.eventHandlers.onDisconnect?.(reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.eventHandlers.onError?.(error);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.eventHandlers.onReconnect?.(attemptNumber);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('WebSocket reconnection error:', error);
      this.eventHandlers.onReconnectError?.(error);
    });
  }
}

// Default WebSocket client instance
export const websocketClient = new TabsyWebSocketClient();
