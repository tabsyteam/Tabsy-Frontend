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

export interface OrderStatusUpdatedEvent extends BaseWebSocketEvent {
  type: 'order:status_updated';
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
export interface TableStatusUpdatedEvent extends BaseWebSocketEvent {
  type: 'table:status_updated';
  data: {
    tableId: string;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    capacity: number;
    currentOccupancy?: number;
    sessionId?: string;
    reservationId?: string;
  };
}

export interface TableCheckInEvent extends BaseWebSocketEvent {
  type: 'table:check_in';
  data: {
    tableId: string;
    sessionId: string;
    customersCount?: number;
    qrCodeScannedAt: Date;
  };
}

export interface TableCheckOutEvent extends BaseWebSocketEvent {
  type: 'table:check_out';
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
export interface MenuUpdatedEvent extends BaseWebSocketEvent {
  type: 'menu:updated';
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

// Additional events from backend
export interface OrderItemAddedEvent extends BaseWebSocketEvent {
  type: 'order:item_added';
  data: {
    orderId: string;
    itemId: string;
    quantity: number;
    addedBy: string;
  };
}

export interface OrderItemUpdatedEvent extends BaseWebSocketEvent {
  type: 'order:item_updated';
  data: {
    orderId: string;
    itemId: string;
    changes: Record<string, any>;
    updatedBy: string;
  };
}

export interface OrderItemRemovedEvent extends BaseWebSocketEvent {
  type: 'order:item_removed';
  data: {
    orderId: string;
    itemId: string;
    removedBy: string;
  };
}

export interface PaymentCreatedEvent extends BaseWebSocketEvent {
  type: 'payment:created';
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    method: string;
    createdAt: Date;
  };
}

export interface PaymentCancelledEvent extends BaseWebSocketEvent {
  type: 'payment:cancelled';
  data: {
    paymentId: string;
    orderId: string;
    cancelledAt: Date;
    reason: string;
  };
}

export interface PaymentStatusUpdatedEvent extends BaseWebSocketEvent {
  type: 'payment:status_updated';
  data: {
    paymentId: string;
    orderId: string;
    status: string;
    updatedAt: Date;
  };
}

export interface NotificationCreatedEvent extends BaseWebSocketEvent {
  type: 'notification:created';
  data: {
    notificationId: string;
    title: string;
    message: string;
    category: string;
    priority: string;
    createdAt: Date;
  };
}

// Union type for all possible WebSocket events
export type TabsyWebSocketEvent =
  | OrderCreatedEvent
  | OrderStatusUpdatedEvent
  | OrderUpdatedEvent
  | OrderItemAddedEvent
  | OrderItemUpdatedEvent
  | OrderItemRemovedEvent
  | TableStatusUpdatedEvent
  | TableCheckInEvent
  | TableCheckOutEvent
  | PaymentCreatedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentCancelledEvent
  | PaymentRefundedEvent
  | PaymentStatusUpdatedEvent
  | SessionUpdatedEvent
  | SessionExpiredEvent
  | KitchenNewOrderEvent
  | KitchenOrderReadyEvent
  | KitchenOrderCancelledEvent
  | StaffNotificationEvent
  | UrgentAlertEvent
  | AnalyticsUpdateEvent
  | MenuUpdatedEvent
  | NotificationCreatedEvent;

// Event type mapping for type safety
export type WebSocketEventMap = {
  'order:created': OrderCreatedEvent['data'];
  'order:status_updated': OrderStatusUpdatedEvent['data'];
  'order:updated': OrderUpdatedEvent['data'];
  'order:item_added': OrderItemAddedEvent['data'];
  'order:item_updated': OrderItemUpdatedEvent['data'];
  'order:item_removed': OrderItemRemovedEvent['data'];
  'table:status_updated': TableStatusUpdatedEvent['data'];
  'table:check_in': TableCheckInEvent['data'];
  'table:check_out': TableCheckOutEvent['data'];
  'payment:created': PaymentCreatedEvent['data'];
  'payment:completed': PaymentCompletedEvent['data'];
  'payment:failed': PaymentFailedEvent['data'];
  'payment:cancelled': PaymentCancelledEvent['data'];
  'payment:refunded': PaymentRefundedEvent['data'];
  'payment:status_updated': PaymentStatusUpdatedEvent['data'];
  'session:updated': SessionUpdatedEvent['data'];
  'session:expired': SessionExpiredEvent['data'];
  'kitchen:new-order': KitchenNewOrderEvent['data'];
  'kitchen:order-ready': KitchenOrderReadyEvent['data'];
  'kitchen:order-cancelled': KitchenOrderCancelledEvent['data'];
  'notification:created': NotificationCreatedEvent['data'];
  'notification:staff': StaffNotificationEvent['data'];
  'alert:urgent': UrgentAlertEvent['data'];
  'analytics:update': AnalyticsUpdateEvent['data'];
  'menu:updated': MenuUpdatedEvent['data'];
};

// Type-safe event listener
export type WebSocketEventListener<T extends keyof WebSocketEventMap> = (
  data: WebSocketEventMap[T]
) => void;
