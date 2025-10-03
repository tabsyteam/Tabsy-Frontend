/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// ============================================================================
// QUERY CONFIGURATION
// ============================================================================

/**
 * React Query stale time configurations (in milliseconds)
 */
export const QUERY_STALE_TIME = {
  /** Very short-lived data (10 seconds) */
  SHORT: 10_000,
  /** Medium-lived data (5 minutes) */
  MEDIUM: 300_000,
  /** Long-lived data (10 minutes) */
  LONG: 600_000,
} as const

/**
 * React Query refetch intervals (in milliseconds)
 * Used for polling when WebSocket is not available
 */
export const QUERY_REFETCH_INTERVAL = {
  /** Fast polling (30 seconds) */
  FAST: 30_000,
  /** Normal polling (1 minute) */
  NORMAL: 60_000,
  /** Slow polling (5 minutes) */
  SLOW: 300_000,
} as const

// ============================================================================
// WEBSOCKET CONFIGURATION
// ============================================================================

/**
 * WebSocket event debounce delays (in milliseconds)
 */
export const WEBSOCKET_DEBOUNCE = {
  /** Order events debounce */
  ORDERS: 1000,
  /** Notification events debounce */
  NOTIFICATIONS: 1000,
  /** Payment events debounce */
  PAYMENTS: 2000,
} as const

// ============================================================================
// NOTIFICATION CONFIGURATION
// ============================================================================

/**
 * Notification mute duration (in milliseconds)
 */
export const NOTIFICATION_MUTE_DURATION = {
  /** 30 minutes */
  DEFAULT: 30 * 60 * 1000,
  /** 1 hour */
  LONG: 60 * 60 * 1000,
} as const

/**
 * Notification query limits
 */
export const NOTIFICATION_LIMITS = {
  /** Header notification dropdown */
  HEADER: 10,
  /** Dashboard page */
  DASHBOARD: 50,
  /** Full notification page */
  PAGE: 100,
} as const

/**
 * Notification toast durations (in milliseconds)
 */
export const NOTIFICATION_DURATIONS = {
  /** Success notifications */
  SUCCESS: 5000,
  /** Error notifications */
  ERROR: 8000,
  /** Warning notifications */
  WARNING: 6000,
  /** Info notifications */
  INFO: 3000,
} as const

// ============================================================================
// TIMEOUT CONFIGURATION
// ============================================================================

/**
 * Loading timeout values (in milliseconds)
 */
export const LOADING_TIMEOUT = {
  /** Auth verification timeout */
  AUTH: 5000,
  /** General loading timeout */
  DEFAULT: 10_000,
} as const

/**
 * Redirect delay (in milliseconds)
 */
export const REDIRECT_DELAY = {
  /** Show error message before redirect */
  ERROR: 3000,
  /** Quick redirect */
  QUICK: 1000,
} as const

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

/**
 * API retry configuration
 */
export const RETRY_CONFIG = {
  /** Maximum retry attempts */
  MAX_ATTEMPTS: 2,
  /** Base delay for exponential backoff (in milliseconds) */
  BASE_DELAY: 1000,
  /** Maximum delay cap (in milliseconds) */
  MAX_DELAY: 30_000,
} as const

// ============================================================================
// PAYMENT CONFIGURATION
// ============================================================================

/**
 * Payment invalidation delay (in milliseconds)
 */
export const PAYMENT_INVALIDATION_DELAY = 2000

/**
 * Maximum notifications to display
 */
export const MAX_NOTIFICATIONS = 5

/**
 * Payment query limit for pending cash payments
 */
export const PAYMENT_QUERY_LIMIT = 1000

// ============================================================================
// QUERY LIMITS
// ============================================================================

/**
 * Default query limits for different data types
 */
export const QUERY_LIMITS = {
  /** Orders per page */
  ORDERS: 50,
  /** Payments per page */
  PAYMENTS: 100,
  /** Tables per page */
  TABLES: 100,
  /** Menu items per page */
  MENU_ITEMS: 100,
  /** Notifications per page */
  NOTIFICATIONS: 50,
} as const

// ============================================================================
// ENVIRONMENT URLS
// ============================================================================

/**
 * Cross-application URLs
 * These should be overridden by environment variables
 */
export const APP_URLS = {
  CUSTOMER: process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'http://localhost:3001',
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_APP_URL || 'http://localhost:3002',
  RESTAURANT: process.env.NEXT_PUBLIC_RESTAURANT_APP_URL || 'http://localhost:3000',
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type QueryStaleTime = typeof QUERY_STALE_TIME[keyof typeof QUERY_STALE_TIME]
export type QueryRefetchInterval = typeof QUERY_REFETCH_INTERVAL[keyof typeof QUERY_REFETCH_INTERVAL]
export type WebSocketDebounce = typeof WEBSOCKET_DEBOUNCE[keyof typeof WEBSOCKET_DEBOUNCE]
export type NotificationMuteDuration = typeof NOTIFICATION_MUTE_DURATION[keyof typeof NOTIFICATION_MUTE_DURATION]
export type NotificationLimit = typeof NOTIFICATION_LIMITS[keyof typeof NOTIFICATION_LIMITS]
export type LoadingTimeout = typeof LOADING_TIMEOUT[keyof typeof LOADING_TIMEOUT]
export type RedirectDelay = typeof REDIRECT_DELAY[keyof typeof REDIRECT_DELAY]