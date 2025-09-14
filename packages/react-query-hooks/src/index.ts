// Authentication hooks
export * from './auth-hooks'

// Restaurant hooks  
export * from './restaurant-hooks'

// Dashboard hooks
export * from './dashboard-hooks'
export type { DashboardMetrics } from './dashboard-hooks'

// Menu hooks
export * from './menu-hooks'

// Order hooks
export * from './order-hooks'

// Table hooks
export * from './table-hooks'

// Payment hooks
export * from './payment-hooks'

// Notification hooks
export * from './notification-hooks'

// User hooks
export * from './user-hooks'

// Session and QR Access hooks
export * from './session-hooks'

// Utility hooks
export * from './useClientSafeQuery'

// ===========================
// FACTORY FUNCTIONS FOR MONOREPO DEPENDENCY INJECTION
// These are the enterprise-grade patterns for shared hooks
// ===========================
export { createOrderHooks } from './order-hooks'
export { createDashboardHooks } from './dashboard-hooks'
export { createNotificationHooks } from './notification-hooks'
export { createRestaurantHooks } from './restaurant-hooks'
export { createMenuHooks } from './menu-hooks'
export { createTableHooks } from './table-hooks'
export { createPaymentHooks } from './payment-hooks'
export { createUserHooks } from './user-hooks'
