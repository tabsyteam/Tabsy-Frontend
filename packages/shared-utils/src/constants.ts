/**
 * Application constants
 */
export const CONSTANTS = {
  // API
  API_TIMEOUT: 10000,
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_DELAY: 1000,

  // Authentication
  TOKEN_STORAGE_KEY: 'tabsy_auth_token',
  REFRESH_TOKEN_STORAGE_KEY: 'tabsy_refresh_token',
  USER_STORAGE_KEY: 'tabsy_user_data',
  SESSION_STORAGE_KEY: 'tabsy_session_data',
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes

  // QR Code
  QR_CODE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  SESSION_EXPIRY: 2 * 60 * 60 * 1000, // 2 hours
  SESSION_PING_INTERVAL: 30 * 1000, // 30 seconds

  // UI
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 5000,
  MODAL_CLOSE_DELAY: 150,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // File upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGES_PER_UPLOAD: 5,

  // Payment
  MIN_TIP_PERCENTAGE: 0,
  MAX_TIP_PERCENTAGE: 50,
  DEFAULT_TIP_SUGGESTIONS: [15, 18, 20, 25],
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_AMOUNT: 9999.99,

  // Menu
  MAX_MENU_ITEM_NAME_LENGTH: 100,
  MAX_MENU_ITEM_DESCRIPTION_LENGTH: 500,
  MAX_SPECIAL_INSTRUCTIONS_LENGTH: 500,
  MIN_PREPARATION_TIME: 1, // minutes
  MAX_PREPARATION_TIME: 120, // minutes

  // Restaurant
  MAX_RESTAURANT_NAME_LENGTH: 100,
  MAX_RESTAURANT_DESCRIPTION_LENGTH: 1000,
  MAX_TABLE_COUNT: 500,
  MAX_STAFF_COUNT: 100,

  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,

  // WebSocket
  WS_RECONNECT_INTERVAL: 5000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  WS_PING_INTERVAL: 30000,

  // Cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100,

  // Geolocation
  GEOLOCATION_TIMEOUT: 10000,
  GEOLOCATION_MAX_AGE: 10 * 60 * 1000, // 10 minutes

  // Performance
  LAZY_LOADING_THRESHOLD: 100,
  IMAGE_OPTIMIZATION_QUALITY: 0.8,
  BUNDLE_SIZE_WARNING_THRESHOLD: 500 * 1024, // 500KB
}

/**
 * @deprecated DO NOT USE - Use environment variables instead
 *
 * Environment-specific constants (DEPRECATED)
 *
 * These hardcoded values should NOT be used in production.
 * Always use environment variables:
 * - NEXT_PUBLIC_API_BASE_URL
 * - NEXT_PUBLIC_WS_BASE_URL
 *
 * This constant is kept only for reference and will be removed in future versions.
 */
export const ENV_CONSTANTS = {
  development: {
    API_BASE_URL: 'http://localhost:5001',
    WS_BASE_URL: 'http://localhost:5001',
    DEBUG: true,
    LOG_LEVEL: 'debug',
  },
  staging: {
    API_BASE_URL: 'https://api-staging.tabsy.app',
    WS_BASE_URL: 'https://api-staging.tabsy.app',
    DEBUG: true,
    LOG_LEVEL: 'info',
  },
  production: {
    API_BASE_URL: 'https://api.tabsy.app',
    WS_BASE_URL: 'https://api.tabsy.app',
    DEBUG: false,
    LOG_LEVEL: 'error',
  },
}

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  QR_CODE_INVALID: 'Invalid or expired QR code.',
  PAYMENT_FAILED: 'Payment processing failed. Please try again.',
  ORDER_NOT_FOUND: 'Order not found.',
  RESTAURANT_CLOSED: 'Restaurant is currently closed.',
  MENU_ITEM_UNAVAILABLE: 'Selected menu item is not available.',
}

// Success messages
export const SUCCESS_MESSAGES = {
  ORDER_PLACED: 'Your order has been placed successfully!',
  PAYMENT_COMPLETED: 'Payment completed successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  RESTAURANT_CREATED: 'Restaurant created successfully!',
  MENU_UPDATED: 'Menu updated successfully!',
  FEEDBACK_SUBMITTED: 'Thank you for your feedback!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  EMAIL_VERIFIED: 'Email verified successfully!',
}

// Status colors for UI
export const STATUS_COLORS = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  pending: '#6B7280',
  active: '#10B981',
  inactive: '#6B7280',
}

// Order statuses with display information
export const ORDER_STATUS_INFO = {
  PENDING: { label: 'Pending', color: STATUS_COLORS.pending, icon: 'clock' },
  CONFIRMED: { label: 'Confirmed', color: STATUS_COLORS.info, icon: 'check-circle' },
  PREPARING: { label: 'Preparing', color: STATUS_COLORS.warning, icon: 'cooking' },
  READY: { label: 'Ready', color: STATUS_COLORS.success, icon: 'bell' },
  SERVED: { label: 'Served', color: STATUS_COLORS.success, icon: 'utensils' },
  COMPLETED: { label: 'Completed', color: STATUS_COLORS.success, icon: 'check' },
  CANCELLED: { label: 'Cancelled', color: STATUS_COLORS.error, icon: 'x-circle' },
}

// Payment statuses with display information
export const PAYMENT_STATUS_INFO = {
  PENDING: { label: 'Pending', color: STATUS_COLORS.pending, icon: 'clock' },
  PROCESSING: { label: 'Processing', color: STATUS_COLORS.warning, icon: 'loader' },
  COMPLETED: { label: 'Completed', color: STATUS_COLORS.success, icon: 'check-circle' },
  FAILED: { label: 'Failed', color: STATUS_COLORS.error, icon: 'x-circle' },
  CANCELLED: { label: 'Cancelled', color: STATUS_COLORS.error, icon: 'x-circle' },
  REFUNDED: { label: 'Refunded', color: STATUS_COLORS.info, icon: 'refresh-ccw' },
}

// Table statuses with display information
export const TABLE_STATUS_INFO = {
  AVAILABLE: { label: 'Available', color: STATUS_COLORS.success, icon: 'check-circle' },
  OCCUPIED: { label: 'Occupied', color: STATUS_COLORS.warning, icon: 'users' },
  RESERVED: { label: 'Reserved', color: STATUS_COLORS.info, icon: 'calendar' },
  CLEANING: { label: 'Cleaning', color: STATUS_COLORS.warning, icon: 'cleaning' },
  OUT_OF_SERVICE: { label: 'Out of Service', color: STATUS_COLORS.error, icon: 'x-circle' },
}

export default CONSTANTS
