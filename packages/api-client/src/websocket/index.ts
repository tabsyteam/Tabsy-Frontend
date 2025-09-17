// WebSocket client and hooks exports
export { TabsyWebSocketClient, websocketClient } from './client';
export type { TabsyWebSocketConfig, WebSocketEventHandlers } from './client';

export {
  useWebSocket,
  useWebSocketEvent,
  useOrderUpdates,
  useTableUpdates,
  usePaymentUpdates,
  useSessionUpdates,
  useKitchenUpdates,
  useStaffNotifications,
  useAnalyticsUpdates,
  useRestaurantDashboard,
} from './hooks';
export type { UseWebSocketOptions } from './hooks';

export type {
  BaseWebSocketEvent,
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
  OrderUpdatedEvent,
  OrderItemAddedEvent,
  OrderItemUpdatedEvent,
  OrderItemRemovedEvent,
  TableStatusUpdatedEvent,
  TableCheckInEvent,
  TableCheckOutEvent,
  PaymentCreatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentCancelledEvent,
  PaymentRefundedEvent,
  PaymentStatusUpdatedEvent,
  SessionUpdatedEvent,
  SessionExpiredEvent,
  KitchenNewOrderEvent,
  KitchenOrderReadyEvent,
  KitchenOrderCancelledEvent,
  StaffNotificationEvent,
  UrgentAlertEvent,
  AnalyticsUpdateEvent,
  MenuUpdatedEvent,
  NotificationCreatedEvent,
  TabsyWebSocketEvent,
  WebSocketEventMap,
  WebSocketEventListener,
} from './events';
