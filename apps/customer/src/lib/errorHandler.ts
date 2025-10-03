/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across the application with:
 * - Standardized error logging
 * - User-friendly error messages
 * - Error monitoring integration (ready for Sentry/LogRocket)
 * - Silent error mode for non-critical errors
 *
 * @version 1.0.0
 */

import { toast } from 'sonner'
import { logger } from './logger'

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Informational - no user action needed */
  INFO = 'info',
  /** Warning - user should be aware but can continue */
  WARNING = 'warning',
  /** Error - something went wrong but recoverable */
  ERROR = 'error',
  /** Critical - application may not function correctly */
  CRITICAL = 'critical'
}

/**
 * Error categories for better organization and monitoring
 */
export enum ErrorCategory {
  /** Network/API related errors */
  NETWORK = 'network',
  /** Authentication/Authorization errors */
  AUTH = 'auth',
  /** Data validation errors */
  VALIDATION = 'validation',
  /** State management errors */
  STATE = 'state',
  /** UI/Component errors */
  UI = 'ui',
  /** Storage errors (localStorage, sessionStorage) */
  STORAGE = 'storage',
  /** WebSocket errors */
  WEBSOCKET = 'websocket',
  /** Unknown/uncategorized errors */
  UNKNOWN = 'unknown'
}

/**
 * Custom Application Error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public category: ErrorCategory = ErrorCategory.UNKNOWN,
    public severity: ErrorSeverity = ErrorSeverity.ERROR,
    public context?: Record<string, any>,
    public silent?: boolean,
    public userMessage?: string
  ) {
    super(message)
    this.name = 'AppError'

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * Error handler options
 */
interface ErrorHandlerOptions {
  /** Component/module name where error occurred */
  component?: string
  /** Additional context for debugging */
  context?: Record<string, any>
  /** Whether to show toast notification to user */
  showToast?: boolean
  /** Custom user-friendly message */
  userMessage?: string
  /** Error severity (auto-detected if not provided) */
  severity?: ErrorSeverity
  /** Error category (auto-detected if not provided) */
  category?: ErrorCategory
  /** Function to call after handling error */
  onError?: (error: AppError) => void
}

/**
 * Main error handler function
 *
 * @param error - The error to handle
 * @param options - Error handling options
 * @returns Normalized AppError instance
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): AppError {
  const {
    component = 'Unknown',
    context = {},
    showToast = true,
    userMessage,
    severity,
    category,
    onError
  } = options

  // Normalize error to AppError
  const appError = normalizeError(error, {
    component,
    context,
    userMessage,
    severity,
    category
  })

  // Log error based on severity
  logError(appError, component)

  // Send to monitoring service (Sentry, LogRocket, etc.)
  sendToMonitoring(appError)

  // Show user notification if not silent
  if (showToast && !appError.silent) {
    showErrorToast(appError)
  }

  // Call custom error callback if provided
  if (onError) {
    try {
      onError(appError)
    } catch (callbackError) {
      logger.error('ErrorHandler', 'Error in onError callback', callbackError)
    }
  }

  return appError
}

/**
 * Normalize any error to AppError
 */
function normalizeError(
  error: unknown,
  options: {
    component: string
    context: Record<string, any>
    userMessage?: string
    severity?: ErrorSeverity
    category?: ErrorCategory
  }
): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error
  }

  // Standard Error
  if (error instanceof Error) {
    const detectedCategory = detectErrorCategory(error)
    const detectedSeverity = detectErrorSeverity(error, detectedCategory)

    return new AppError(
      error.message,
      error.name,
      options.category || detectedCategory,
      options.severity || detectedSeverity,
      { ...options.context, originalError: error },
      false,
      options.userMessage || createUserMessage(error, detectedCategory)
    )
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(
      error,
      'STRING_ERROR',
      options.category || ErrorCategory.UNKNOWN,
      options.severity || ErrorSeverity.ERROR,
      options.context,
      false,
      options.userMessage || error
    )
  }

  // Unknown error type
  return new AppError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    options.category || ErrorCategory.UNKNOWN,
    options.severity || ErrorSeverity.ERROR,
    { ...options.context, originalError: error },
    false,
    options.userMessage || 'Something went wrong. Please try again.'
  )
}

/**
 * Detect error category from error object
 */
function detectErrorCategory(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Network errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    name.includes('networkerror')
  ) {
    return ErrorCategory.NETWORK
  }

  // Auth errors
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('token') ||
    name.includes('autherror')
  ) {
    return ErrorCategory.AUTH
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    name.includes('validationerror')
  ) {
    return ErrorCategory.VALIDATION
  }

  // Storage errors
  if (
    message.includes('storage') ||
    message.includes('quota') ||
    name.includes('quotaexceedederror')
  ) {
    return ErrorCategory.STORAGE
  }

  // WebSocket errors
  if (
    message.includes('websocket') ||
    message.includes('socket') ||
    message.includes('connection')
  ) {
    return ErrorCategory.WEBSOCKET
  }

  return ErrorCategory.UNKNOWN
}

/**
 * Detect error severity from error
 */
function detectErrorSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
  const message = error.message.toLowerCase()

  // Critical errors
  if (
    category === ErrorCategory.AUTH ||
    message.includes('critical') ||
    message.includes('fatal')
  ) {
    return ErrorSeverity.CRITICAL
  }

  // Warnings
  if (
    message.includes('warning') ||
    message.includes('deprecated') ||
    category === ErrorCategory.VALIDATION
  ) {
    return ErrorSeverity.WARNING
  }

  // Default to error
  return ErrorSeverity.ERROR
}

/**
 * Create user-friendly error message
 */
function createUserMessage(error: Error, category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Network error. Please check your connection and try again.'
    case ErrorCategory.AUTH:
      return 'Authentication error. Please sign in again.'
    case ErrorCategory.VALIDATION:
      return 'Invalid data provided. Please check your input.'
    case ErrorCategory.STORAGE:
      return 'Storage error. Your device may be out of space.'
    case ErrorCategory.WEBSOCKET:
      return 'Connection error. Trying to reconnect...'
    default:
      return 'Something went wrong. Please try again.'
  }
}

/**
 * Log error based on severity
 */
function logError(error: AppError, component: string): void {
  const logData = {
    code: error.code,
    category: error.category,
    severity: error.severity,
    context: error.context,
    stack: error.stack
  }

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      logger.error(component, error.message, logData)
      break
    case ErrorSeverity.ERROR:
      logger.error(component, error.message, logData)
      break
    case ErrorSeverity.WARNING:
      logger.warn(component, error.message, logData)
      break
    case ErrorSeverity.INFO:
      logger.info(component, error.message, logData)
      break
  }
}

/**
 * Send error to monitoring service
 *
 * TODO: Integrate with Sentry, LogRocket, or other monitoring service
 */
function sendToMonitoring(error: AppError): void {
  // Only send errors in production
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  try {
    // TODO: Implement Sentry or other monitoring integration
    // Example:
    // Sentry.captureException(error, {
    //   level: error.severity,
    //   tags: {
    //     category: error.category,
    //     code: error.code
    //   },
    //   extra: error.context
    // })

    // For now, just log that we would send to monitoring
    logger.debug('ErrorHandler', 'Would send to monitoring in production', {
      message: error.message,
      severity: error.severity,
      category: error.category
    })
  } catch (monitoringError) {
    // Don't let monitoring errors break the app
    logger.error('ErrorHandler', 'Failed to send error to monitoring', monitoringError)
  }
}

/**
 * Show error toast to user
 */
function showErrorToast(error: AppError): void {
  const message = error.userMessage || error.message

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.ERROR:
      toast.error(message, {
        duration: 5000,
        position: 'top-center'
      })
      break
    case ErrorSeverity.WARNING:
      toast.warning(message, {
        duration: 4000
      })
      break
    case ErrorSeverity.INFO:
      toast.info(message, {
        duration: 3000
      })
      break
  }
}

/**
 * Helper function to create specific error types
 */
export const createError = {
  network: (message: string, context?: Record<string, any>) =>
    new AppError(
      message,
      'NETWORK_ERROR',
      ErrorCategory.NETWORK,
      ErrorSeverity.ERROR,
      context,
      false,
      'Network error. Please check your connection and try again.'
    ),

  auth: (message: string, context?: Record<string, any>) =>
    new AppError(
      message,
      'AUTH_ERROR',
      ErrorCategory.AUTH,
      ErrorSeverity.CRITICAL,
      context,
      false,
      'Authentication error. Please sign in again.'
    ),

  validation: (message: string, context?: Record<string, any>) =>
    new AppError(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.WARNING,
      context,
      false,
      'Invalid data provided. Please check your input.'
    ),

  storage: (message: string, context?: Record<string, any>) =>
    new AppError(
      message,
      'STORAGE_ERROR',
      ErrorCategory.STORAGE,
      ErrorSeverity.ERROR,
      context,
      false,
      'Storage error. Your device may be out of space.'
    ),

  websocket: (message: string, context?: Record<string, any>) =>
    new AppError(
      message,
      'WEBSOCKET_ERROR',
      ErrorCategory.WEBSOCKET,
      ErrorSeverity.ERROR,
      context,
      false,
      'Connection error. Trying to reconnect...'
    )
}
