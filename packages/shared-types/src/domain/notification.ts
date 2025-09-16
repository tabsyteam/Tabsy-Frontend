export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  orderUpdates: boolean;
  paymentUpdates: boolean;
  promotions: boolean;
}

export interface Notification {
  id: string;
  recipientId?: string;
  type: 'ORDER_STATUS' | 'PAYMENT_STATUS' | 'ASSISTANCE_REQUIRED' | 'SYSTEM' | 'MARKETING';
  content: string;
  metadata: {
    restaurantId?: string;
    tableId?: string;
    orderId?: string;
    paymentId?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// Legacy interface for backward compatibility
export interface NotificationLegacy {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}