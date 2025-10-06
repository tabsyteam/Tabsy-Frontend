/**
 * Centralized Error Messages
 *
 * Provides consistent, user-friendly error messages across the application.
 * This ensures a uniform UX and makes it easy to update messaging globally.
 *
 * @module errorMessages
 */

/**
 * Error messages organized by feature/domain
 */
export const ERROR_MESSAGES = {
  // Session & Authentication
  SESSION_EXPIRED: 'Your session has expired. Please scan the QR code again to continue.',
  SESSION_RECOVERY_FAILED: 'Unable to recover your session. Please scan the QR code again.',
  SESSION_NOT_FOUND: 'No active session found. Please scan the table QR code to start ordering.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',

  // Payment
  PAYMENT_FAILED: 'Payment failed. Please try again or use a different payment method.',
  PAYMENT_CANCELLED: 'Payment was cancelled. Your items are still in the cart.',
  PAYMENT_NOT_FOUND: 'Payment details could not be found.',
  PAYMENT_ALREADY_PROCESSED: 'This payment has already been processed.',
  INSUFFICIENT_FUNDS: 'Insufficient funds. Please try a different payment method.',
  INVALID_CARD: 'Invalid card information. Please check your details and try again.',
  CARD_DECLINED: 'Your card was declined. Please try a different card or payment method.',
  PAYMENT_INTENT_CREATION_FAILED: 'Unable to initiate payment. Please try again.',
  STRIPE_NOT_LOADED: 'Payment system is loading. Please wait a moment and try again.',

  // Network & Connection
  NETWORK_ERROR: 'Network connection lost. Please check your internet connection and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again in a moment.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  CONNECTION_FAILED: 'Unable to connect to the server. Please check your connection.',

  // Data Loading
  LOAD_FAILED: 'Failed to load data. Please refresh the page.',
  LOAD_MENU_FAILED: 'Failed to load menu. Please refresh the page.',
  LOAD_ORDER_FAILED: 'Failed to load order details. Please try again.',
  LOAD_BILL_FAILED: 'Failed to load bill details. Please refresh the page.',
  LOAD_PAYMENT_HISTORY_FAILED: 'Failed to load payment history. Please try again.',

  // Cart & Checkout
  CART_EMPTY: 'Your cart is empty. Please add items before checking out.',
  CHECKOUT_FAILED: 'Checkout failed. Please try again.',
  ORDER_PLACEMENT_FAILED: 'Failed to place order. Please try again.',
  ITEM_OUT_OF_STOCK: 'This item is currently out of stock.',
  ITEM_UNAVAILABLE: 'This item is no longer available.',

  // Validation
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_NAME: 'Please enter a valid name.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_INPUT: 'Invalid input. Please check your entry.',
  INVALID_AMOUNT: 'Please enter a valid amount.',
  AMOUNT_TOO_HIGH: 'Amount exceeds the maximum allowed.',
  AMOUNT_TOO_LOW: 'Amount is below the minimum required.',

  // Split Bill
  SPLIT_CALCULATION_FAILED: 'Failed to calculate split amounts. Please try again.',
  SPLIT_UPDATE_FAILED: 'Failed to update split calculation. Please try again.',
  SPLIT_PERCENTAGES_INVALID: 'Split percentages must add up to 100%.',
  SPLIT_AMOUNTS_INVALID: 'Split amounts must equal the total bill.',
  SPLIT_NO_USERS: 'No users found for split bill.',

  // Tip
  TIP_UPDATE_FAILED: 'Failed to update tip. Please try again.',
  INVALID_TIP_AMOUNT: 'Please enter a valid tip amount.',

  // Receipt
  RECEIPT_DOWNLOAD_FAILED: 'Failed to download receipt. Please try again later.',
  RECEIPT_NOT_AVAILABLE: 'Receipt is not yet available. Please try again in a moment.',

  // General
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  FEATURE_UNAVAILABLE: 'This feature is temporarily unavailable.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',

  // QR Code
  QR_SCAN_FAILED: 'Failed to scan QR code. Please try again.',
  INVALID_QR_CODE: 'Invalid QR code. Please scan a valid table QR code.',

  // Table Session
  TABLE_SESSION_NOT_FOUND: 'Table session not found. Please scan the QR code again.',
  TABLE_SESSION_ENDED: 'This table session has ended.',
  JOIN_SESSION_FAILED: 'Failed to join table session. Please scan the QR code again.',
} as const

/**
 * Success messages for positive user feedback
 */
export const SUCCESS_MESSAGES = {
  PAYMENT_SUCCESS: 'Payment successful! Thank you for your order.',
  ORDER_PLACED: 'Order placed successfully!',
  TIP_UPDATED: 'Tip updated successfully.',
  ADDED_TO_CART: 'Added to cart!',
  REMOVED_FROM_CART: 'Removed from cart.',
  SESSION_RECOVERED: 'Session recovered successfully.',
  RECEIPT_DOWNLOADED: 'Receipt downloaded successfully.',
} as const

/**
 * Info messages for user guidance
 */
export const INFO_MESSAGES = {
  PROCESSING_PAYMENT: 'Processing your payment...',
  LOADING: 'Loading...',
  SYNCING: 'Syncing...',
  PLACING_ORDER: 'Placing your order...',
  CALCULATING: 'Calculating...',
  EMPTY_CART: 'Your cart is empty. Start adding items to order!',
  NO_ORDERS: 'You haven\'t placed any orders yet.',
  NO_PAYMENTS: 'No payment history found.',
} as const

/**
 * Warning messages for important but non-critical situations
 */
export const WARNING_MESSAGES = {
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
  SLOW_CONNECTION: 'Your connection seems slow. Please be patient.',
  PAYMENT_PENDING: 'Payment is being processed. Please wait.',
  LOW_BATTERY: 'Your device battery is low. Consider charging soon.',
} as const

/**
 * Helper to get error message with custom context
 */
export function getErrorMessage(
  errorKey: keyof typeof ERROR_MESSAGES,
  customMessage?: string
): string {
  return customMessage || ERROR_MESSAGES[errorKey]
}

/**
 * Helper to parse API error responses into user-friendly messages
 */
export function parseApiError(error: any): string {
  // Handle specific error codes
  if (error?.response?.status === 401) {
    return ERROR_MESSAGES.SESSION_EXPIRED
  }

  if (error?.response?.status === 403) {
    return ERROR_MESSAGES.UNAUTHORIZED
  }

  if (error?.response?.status === 404) {
    return ERROR_MESSAGES.LOAD_FAILED
  }

  if (error?.response?.status === 429) {
    return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
  }

  if (error?.response?.status >= 500) {
    return ERROR_MESSAGES.SERVER_ERROR
  }

  // Check for network errors
  if (error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR') {
    return ERROR_MESSAGES.NETWORK_ERROR
  }

  // Check for timeout
  if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
    return ERROR_MESSAGES.TIMEOUT_ERROR
  }

  // Return custom message if available
  if (error?.message) {
    return error.message
  }

  // Fallback
  return ERROR_MESSAGES.SOMETHING_WENT_WRONG
}

/**
 * Type for error message keys (for TypeScript autocomplete)
 */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES
export type InfoMessageKey = keyof typeof INFO_MESSAGES
export type WarningMessageKey = keyof typeof WARNING_MESSAGES
