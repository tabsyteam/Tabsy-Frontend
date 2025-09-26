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
    orderId?: string;        // Optional for table session payments
    tableSessionId?: string; // Support for table session payments
    amount: number;
    method: 'card' | 'cash' | 'digital_wallet' | 'split';
    transactionId: string;
    tip?: number;
    processedAt: Date;
    paymentType?: 'order' | 'table_session' | 'split';  // Clarify payment type
  };
}

export interface PaymentFailedEvent extends BaseWebSocketEvent {
  type: 'payment:failed';
  data: {
    paymentId: string;
    orderId?: string;        // Optional for table session payments
    tableSessionId?: string; // Support for table session payments
    amount: number;
    method: string;
    errorCode: string;
    errorMessage: string;
    attemptedAt: Date;
    paymentType?: 'order' | 'table_session' | 'split';  // Clarify payment type
  };
}

export interface PaymentRefundedEvent extends BaseWebSocketEvent {
  type: 'payment:refunded';
  data: {
    originalPaymentId: string;
    refundId: string;
    orderId?: string;        // Optional for table session payments
    tableSessionId?: string; // Support for table session payments
    amount: number;
    reason: string;
    processedAt: Date;
    processedBy: string;
    paymentType?: 'order' | 'table_session' | 'split';  // Clarify payment type
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

// Assistance Request Events
export interface AssistanceRequestedEvent extends BaseWebSocketEvent {
  type: 'assistance:requested';
  data: {
    notificationId: string;
    tableId: string;
    orderId?: string;
    customerName: string;
    urgency: 'low' | 'normal' | 'high';
    message?: string;
    requestTime: string;
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
      options?: Array<{
        id: string;
        name: string;
        type: string;
        values: Array<{
          id: string;
          name: string;
          priceModifier: number;
        }>;
      }>;
    };
    updatedBy: string;
    reason?: string;
  };
}

export interface MenuCustomizationUpdatedEvent extends BaseWebSocketEvent {
  type: 'menu:customization_updated';
  data: {
    itemId: string;
    optionId: string;
    optionName: string;
    changes: {
      name?: string;
      type?: string;
      isRequired?: boolean;
      minSelections?: number;
      maxSelections?: number;
      values?: Array<{
        id: string;
        name: string;
        priceModifier: number;
        isDefault: boolean;
      }>;
    };
    updatedBy: string;
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
    orderId?: string;        // Optional for table session payments
    tableSessionId?: string; // Support for table session payments
    amount: number;
    method: string;
    createdAt: Date;
    paymentType?: 'order' | 'table_session' | 'split';  // Clarify payment type
  };
}

export interface PaymentCancelledEvent extends BaseWebSocketEvent {
  type: 'payment:cancelled';
  data: {
    paymentId: string;
    orderId?: string;        // Optional for table session payments
    tableSessionId?: string; // Support for table session payments
    cancelledAt: Date;
    reason: string;
    paymentType?: 'order' | 'table_session' | 'split';  // Clarify payment type
  };
}

export interface PaymentStatusUpdatedEvent extends BaseWebSocketEvent {
  type: 'payment:status_updated';
  data: {
    paymentId: string;
    orderId?: string;        // Optional for table session payments
    tableSessionId?: string; // Support for table session payments
    status: string;
    updatedAt: Date;
    paymentType?: 'order' | 'table_session' | 'split';  // Clarify payment type
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

// Multi-user Table Session Events
export interface TableSessionCreatedEvent extends BaseWebSocketEvent {
  type: 'table:session_created';
  data: {
    tableSessionId: string;
    sessionCode: string;
    tableId: string;
    hostUser: {
      guestSessionId: string;
      userName: string;
    };
    expiresAt: string;
  };
}

export interface TableSessionUserJoinedEvent extends BaseWebSocketEvent {
  type: 'table:user_joined';
  data: {
    tableSessionId: string;
    sessionCode: string;
    tableId: string;
    user: {
      guestSessionId: string;
      userName: string;
      isHost: boolean;
    };
    totalUsers: number;
  };
}

export interface TableSessionUserLeftEvent extends BaseWebSocketEvent {
  type: 'table:user_left';
  data: {
    tableSessionId: string;
    tableId: string;
    user: {
      guestSessionId: string;
      userName: string;
    };
    totalUsers: number;
  };
}

export interface TableSessionCartUpdatedEvent extends BaseWebSocketEvent {
  type: 'table:cart_updated';
  data: {
    tableSessionId: string;
    tableId: string;
    updatedBy: {
      guestSessionId: string;
      userName: string;
    };
    cartItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
      options?: any[];
    }>;
    cartTotal: number;
  };
}

export interface TableSessionOrderLockedEvent extends BaseWebSocketEvent {
  type: 'table:order_locked';
  data: {
    tableSessionId: string;
    tableId: string;
    orderId: string;
    roundNumber: number;
    lockedBy: {
      guestSessionId: string;
      userName: string;
    };
    orderTotal: number;
  };
}

export interface TableSessionNewRoundEvent extends BaseWebSocketEvent {
  type: 'table:new_round';
  data: {
    tableSessionId: string;
    tableId: string;
    roundNumber: number;
    previousRoundTotal: number;
    sessionTotal: number;
  };
}

export interface TableSessionBillRequestedEvent extends BaseWebSocketEvent {
  type: 'table:bill_requested';
  data: {
    tableSessionId: string;
    tableId: string;
    requestedBy: {
      guestSessionId: string;
      userName: string;
    };
    totalAmount: number;
    paidAmount: number;
    remainingBalance: number;
  };
}

export interface TableSessionClosedEvent extends BaseWebSocketEvent {
  type: 'table:session_closed';
  data: {
    tableSessionId: string;
    tableId: string;
    closedBy?: {
      userId?: string;
      role?: string;
    };
    reason: string;
    finalTotal: number;
    totalOrders: number;
  };
}

export interface TableSessionUpdatedEvent extends BaseWebSocketEvent {
  type: 'table:session_updated';
  data: {
    tableSessionId: string;
    tableId: string;
    status: string; // TableSessionStatus
    totalAmount: number;
    paidAmount: number;
    activeUsers: number;
  };
}

// Split Payment Events
export interface SplitPaymentCreatedEvent extends BaseWebSocketEvent {
  type: 'payment:split_created';
  data: {
    groupId: string;
    orderId: string;
    tableSessionId?: string;
    totalAmount: number;
    totalParticipants: number;
    splitType: 'EQUAL' | 'BY_ITEMS' | 'BY_PERCENTAGE' | 'BY_AMOUNT';
    createdBy: {
      participantId: string;
      participantName: string;
    };
    participants: Array<{
      participantId: string;
      participantName: string;
      amount: number;
      tipAmount?: number;
    }>;
  };
}

export interface SplitPaymentParticipantUpdatedEvent extends BaseWebSocketEvent {
  type: 'payment:split_participant_updated';
  data: {
    groupId: string;
    participantId: string;
    participantName: string;
    amount: number;
    tipAmount?: number;
    hasPaid: boolean;
    paymentId?: string;
    updatedAt: Date;
  };
}

export interface SplitPaymentProgressEvent extends BaseWebSocketEvent {
  type: 'payment:split_progress';
  data: {
    groupId: string;
    orderId: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    completedParticipants: number;
    totalParticipants: number;
    progressPercentage: number;
    recentActivity: {
      participantName: string;
      amount: number;
      action: 'paid' | 'updated' | 'cancelled';
      timestamp: Date;
    };
  };
}

export interface SplitPaymentCompletedEvent extends BaseWebSocketEvent {
  type: 'payment:split_completed';
  data: {
    groupId: string;
    orderId: string;
    totalAmount: number;
    completedAt: Date;
    participants: Array<{
      participantId: string;
      participantName: string;
      amount: number;
      tipAmount?: number;
      paymentId: string;
    }>;
    summary: {
      subtotal: number;
      tips: number;
      total: number;
      paymentMethods: Record<string, number>;
    };
  };
}

export interface SplitPaymentCancelledEvent extends BaseWebSocketEvent {
  type: 'payment:split_cancelled';
  data: {
    groupId: string;
    orderId: string;
    cancelledBy: {
      participantId?: string;
      participantName?: string;
      role?: string;
    };
    reason: string;
    cancelledAt: Date;
    refundsProcessed: number;
    affectedParticipants: string[];
  };
}

export interface SplitPaymentReminderSentEvent extends BaseWebSocketEvent {
  type: 'payment:split_reminder_sent';
  data: {
    groupId: string;
    participantId: string;
    participantName: string;
    amount: number;
    reminderType: 'automated' | 'manual';
    sentAt: Date;
  };
}

// Real-time Split Calculation Events
export interface SplitCalculationUpdatedEvent extends BaseWebSocketEvent {
  type: 'split:calculation_updated';
  data: {
    tableSessionId: string;
    updatedBy: string;
    updatedUser?: string;
    splitCalculation: {
      splitType: 'EQUAL' | 'BY_ITEMS' | 'BY_PERCENTAGE' | 'BY_AMOUNT';
      participants: string[];
      splitAmounts: { [userId: string]: number };
      totalAmount: number;
      percentages?: { [userId: string]: number };
      amounts?: { [userId: string]: number };
      itemAssignments?: { [itemId: string]: string };
      valid: boolean;
      timestamp: Date;
    };
    timestamp: Date;
  };
}

export interface SplitCalculationConflictEvent extends BaseWebSocketEvent {
  type: 'split:conflict_detected';
  data: {
    tableSessionId: string;
    conflictType: 'percentage_overflow' | 'amount_overflow' | 'concurrent_update';
    conflictingUsers: string[];
    conflictDetails: {
      expected: any;
      actual: any;
      conflictAt: Date;
    };
    resolutionSuggestion?: string;
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
  | AssistanceRequestedEvent
  | UrgentAlertEvent
  | AnalyticsUpdateEvent
  | MenuUpdatedEvent
  | MenuCustomizationUpdatedEvent
  | NotificationCreatedEvent
  | TableSessionCreatedEvent
  | TableSessionUserJoinedEvent
  | TableSessionUserLeftEvent
  | TableSessionCartUpdatedEvent
  | TableSessionOrderLockedEvent
  | TableSessionNewRoundEvent
  | TableSessionBillRequestedEvent
  | TableSessionClosedEvent
  | TableSessionUpdatedEvent
  | SplitPaymentCreatedEvent
  | SplitPaymentParticipantUpdatedEvent
  | SplitPaymentProgressEvent
  | SplitPaymentCompletedEvent
  | SplitPaymentCancelledEvent
  | SplitPaymentReminderSentEvent
  | SplitCalculationUpdatedEvent
  | SplitCalculationConflictEvent;

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
  'assistance:requested': AssistanceRequestedEvent['data'];
  'alert:urgent': UrgentAlertEvent['data'];
  'analytics:update': AnalyticsUpdateEvent['data'];
  'menu:updated': MenuUpdatedEvent['data'];
  'menu:customization_updated': MenuCustomizationUpdatedEvent['data'];
  'table:session_created': TableSessionCreatedEvent['data'];
  'table:user_joined': TableSessionUserJoinedEvent['data'];
  'table:user_left': TableSessionUserLeftEvent['data'];
  'table:cart_updated': TableSessionCartUpdatedEvent['data'];
  'table:order_locked': TableSessionOrderLockedEvent['data'];
  'table:new_round': TableSessionNewRoundEvent['data'];
  'table:bill_requested': TableSessionBillRequestedEvent['data'];
  'table:session_closed': TableSessionClosedEvent['data'];
  'table:session_updated': TableSessionUpdatedEvent['data'];
  'payment:split_created': SplitPaymentCreatedEvent['data'];
  'payment:split_participant_updated': SplitPaymentParticipantUpdatedEvent['data'];
  'payment:split_progress': SplitPaymentProgressEvent['data'];
  'payment:split_completed': SplitPaymentCompletedEvent['data'];
  'payment:split_cancelled': SplitPaymentCancelledEvent['data'];
  'payment:split_reminder_sent': SplitPaymentReminderSentEvent['data'];
  'split:calculation_updated': SplitCalculationUpdatedEvent['data'];
  'split:conflict_detected': SplitCalculationConflictEvent['data'];
};

// Type-safe event listener
export type WebSocketEventListener<T extends keyof WebSocketEventMap> = (
  data: WebSocketEventMap[T]
) => void;
