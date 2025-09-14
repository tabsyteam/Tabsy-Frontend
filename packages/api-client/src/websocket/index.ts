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
  OrderStatusChangedEvent,
  OrderUpdatedEvent,
  TableUpdatedEvent,
  TableOccupiedEvent,
  TableAvailableEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  SessionUpdatedEvent,
  SessionExpiredEvent,
  KitchenNewOrderEvent,
  KitchenOrderReadyEvent,
  KitchenOrderCancelledEvent,
  StaffNotificationEvent,
  UrgentAlertEvent,
  AnalyticsUpdateEvent,
  MenuItemUpdatedEvent,
  TabsyWebSocketEvent,
  WebSocketEventMap,
  WebSocketEventListener,
} from './events';
