// Real-time event types for Tabsy platform
export interface BaseWebSocketEvent {
  id: string;
  timestamp: Date;
  restaurantId: string;
}

// Order Events
export interface OrderCreatedEvent extends BaseWebSocketEvent {
  type: 'order:created';
  data: {
    orderId: string;
    customerId?: string;
    tableId?: string;
    sessionId?: string;
    items: Array<{
      itemId: string;
      quantity: number;
      price: number;
      customizations?: Record<string, any>;
    }>;
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    specialInstructions?: string;
    estimatedTime?: number;
  };
}

export interface OrderStatusChangedEvent extends BaseWebSocketEvent {
  type: 'order:status-changed';
  data: {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    updatedBy: string;
    estimatedTime?: number;
    notes?: string;
  };
}

export interface OrderUpdatedEvent extends BaseWebSocketEvent {
  type: 'order:updated';
  data: {
    orderId: string;
    changes: Record<string, any>;
    updatedBy: string;
  };
}

// Table Events
export interface TableUpdatedEvent extends BaseWebSocketEvent {
  type: 'table:updated';
  data: {
    tableId: string;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    capacity: number;
    currentOccupancy?: number;
    sessionId?: string;
    reservationId?: string;
  };
}

export interface TableOccupiedEvent extends BaseWebSocketEvent {
  type: 'table:occupied';
  data: {
    tableId: string;
    sessionId: string;
    customersCount?: number;
    qrCodeScannedAt: Date;
  };
}

export interface TableAvailableEvent extends BaseWebSocketEvent {
  type: 'table:available';
  data: {
    tableId: string;
    previousSessionId?: string;
    cleanedAt?: Date;
  };
}

// Payment Events
export interface PaymentCompletedEvent extends BaseWebSocketEvent {
  type: 'payment:completed';
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    method: 'card' | 'cash' | 'digital_wallet' | 'split';
    transactionId: string;
    tip?: number;
    processedAt: Date;
  };
}

export interface PaymentFailedEvent extends BaseWebSocketEvent {
  type: 'payment:failed';
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    method: string;
    errorCode: string;
    errorMessage: string;
    attemptedAt: Date;
  };
}

export interface PaymentRefundedEvent extends BaseWebSocketEvent {
  type: 'payment:refunded';
  data: {
    originalPaymentId: string;
    refundId: string;
    orderId: string;
    amount: number;
    reason: string;
    processedAt: Date;
    processedBy: string;
  };
}

// Session Events (QR Code Sessions)
export interface SessionUpdatedEvent extends BaseWebSocketEvent {
  type: 'session:updated';
  data: {
    sessionId: string;
    tableId: string;
    status: 'active' | 'expired' | 'completed';
    customersCount?: number;
    activeOrders: string[];
    totalSpent: number;
    startedAt: Date;
    lastActivity: Date;
  };
}

export interface SessionExpiredEvent extends BaseWebSocketEvent {
  type: 'session:expired';
  data: {
    sessionId: string;
    tableId: string;
    reason: 'timeout' | 'manual' | 'payment_completed';
    duration: number;
    finalTotal: number;
  };
}

// Kitchen Events
export interface KitchenNewOrderEvent extends BaseWebSocketEvent {
  type: 'kitchen:new-order';
  data: {
    orderId: string;
    tableId?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    items: Array<{
      itemId: string;
      name: string;
      quantity: number;
      customizations?: Record<string, any>;
      specialInstructions?: string;
      allergyInfo?: string[];
    }>;
    estimatedPrepTime: number;
    orderType: 'dine_in' | 'takeaway' | 'delivery';
  };
}

export interface KitchenOrderReadyEvent extends BaseWebSocketEvent {
  type: 'kitchen:order-ready';
  data: {
    orderId: string;
    tableId?: string;
    preparedAt: Date;
    totalPrepTime: number;
    preparedBy: string;
    qualityNotes?: string;
  };
}

export interface KitchenOrderCancelledEvent extends BaseWebSocketEvent {
  type: 'kitchen:order-cancelled';
  data: {
    orderId: string;
    reason: string;
    cancelledBy: string;
    cancelledAt: Date;
    refundRequired: boolean;
  };
}

// Staff Notification Events
export interface StaffNotificationEvent extends BaseWebSocketEvent {
  type: 'notification:staff';
  data: {
    notificationId: string;
    title: string;
    message: string;
    category: 'order' | 'payment' | 'table' | 'system' | 'customer_service';
    priority: 'low' | 'normal' | 'high' | 'critical';
    targetRoles: string[];
    actionRequired?: boolean;
    actionUrl?: string;
    expiresAt?: Date;
  };
}

export interface UrgentAlertEvent extends BaseWebSocketEvent {
  type: 'alert:urgent';
  data: {
    alertId: string;
    title: string;
    message: string;
    alertType: 'security' | 'system_error' | 'payment_issue' | 'customer_complaint' | 'emergency';
    severity: 'warning' | 'error' | 'critical';
    requiresAcknowledgment: boolean;
    assignedTo?: string;
    metadata?: Record<string, any>;
  };
}

// Analytics Events (for real-time dashboard updates)
export interface AnalyticsUpdateEvent extends BaseWebSocketEvent {
  type: 'analytics:update';
  data: {
    metric: 'sales' | 'orders' | 'customers' | 'tables' | 'revenue';
    value: number;
    previousValue?: number;
    period: 'hour' | 'day' | 'week' | 'month';
    additionalData?: Record<string, any>;
  };
}

// Menu Events (for real-time menu updates)
export interface MenuItemUpdatedEvent extends BaseWebSocketEvent {
  type: 'menu:item-updated';
  data: {
    itemId: string;
    changes: {
      available?: boolean;
      price?: number;
      description?: string;
      ingredients?: string[];
      allergens?: string[];
    };
    updatedBy: string;
    reason?: string;
  };
}

// Union type for all possible WebSocket events
export type TabsyWebSocketEvent = 
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | OrderUpdatedEvent
  | TableUpdatedEvent
  | TableOccupiedEvent
  | TableAvailableEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
  | SessionUpdatedEvent
  | SessionExpiredEvent
  | KitchenNewOrderEvent
  | KitchenOrderReadyEvent
  | KitchenOrderCancelledEvent
  | StaffNotificationEvent
  | UrgentAlertEvent
  | AnalyticsUpdateEvent
  | MenuItemUpdatedEvent;

// Event type mapping for type safety
export type WebSocketEventMap = {
  'order:created': OrderCreatedEvent['data'];
  'order:status-changed': OrderStatusChangedEvent['data'];
  'order:updated': OrderUpdatedEvent['data'];
  'table:updated': TableUpdatedEvent['data'];
  'table:occupied': TableOccupiedEvent['data'];
  'table:available': TableAvailableEvent['data'];
  'payment:completed': PaymentCompletedEvent['data'];
  'payment:failed': PaymentFailedEvent['data'];
  'payment:refunded': PaymentRefundedEvent['data'];
  'session:updated': SessionUpdatedEvent['data'];
  'session:expired': SessionExpiredEvent['data'];
  'kitchen:new-order': KitchenNewOrderEvent['data'];
  'kitchen:order-ready': KitchenOrderReadyEvent['data'];
  'kitchen:order-cancelled': KitchenOrderCancelledEvent['data'];
  'notification:staff': StaffNotificationEvent['data'];
  'alert:urgent': UrgentAlertEvent['data'];
  'analytics:update': AnalyticsUpdateEvent['data'];
  'menu:item-updated': MenuItemUpdatedEvent['data'];
};

// Type-safe event listener
export type WebSocketEventListener<T extends keyof WebSocketEventMap> = (
  data: WebSocketEventMap[T]
) => void;
