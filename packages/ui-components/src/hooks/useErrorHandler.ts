'use client'

import { useState, useCallback, useRef } from 'react'

export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
  timestamp: string
  requestId?: string
}

export interface RetryConfig {
  maxAttempts: number
  delay: number
  backoff: 'linear' | 'exponential'
  retryableStatuses?: number[]
}

export interface ErrorHandlerConfig {
  showToast?: boolean
  logToConsole?: boolean
  reportToService?: boolean
  retryConfig?: RetryConfig
}

export function useErrorHandler(config: ErrorHandlerConfig = {}) {
  const [errors, setErrors] = useState<ApiError[]>([])
  const [isRetrying, setIsRetrying] = useState(false)
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const {
    showToast = true,
    logToConsole = true,
    reportToService = false,
    retryConfig = {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential',
      retryableStatuses: [500, 502, 503, 504, 408, 429]
    }
  } = config

  const createError = useCallback((error: any, context?: string): ApiError => {
    const apiError: ApiError = {
      message: error.message || 'An unexpected error occurred',
      status: error.status || error.response?.status,
      code: error.code || error.response?.data?.code,
      details: error.response?.data || error.details,
      timestamp: new Date().toISOString(),
      requestId: error.response?.headers?.['x-request-id']
    }

    if (context) {
      apiError.message = `${context}: ${apiError.message}`
    }

    return apiError
  }, [])

  const handleError = useCallback((error: any, context?: string): ApiError => {
    const apiError = createError(error, context)

    // Add to errors list
    setErrors(prev => [apiError, ...prev.slice(0, 9)]) // Keep last 10 errors

    // Log to console in development
    if (logToConsole) {
      console.error('Error handled:', apiError)
    }

    // Show toast notification
    if (showToast && typeof window !== 'undefined') {
      // This would integrate with your toast system (e.g., sonner, react-hot-toast)
      console.log('Would show toast:', apiError.message)
    }

    // Report to error tracking service
    if (reportToService) {
      // This would integrate with Sentry, LogRocket, etc.
      console.log('Would report to service:', apiError)
    }

    return apiError
  }, [createError, logToConsole, showToast, reportToService])

  const isRetryableError = useCallback((error: ApiError): boolean => {
    if (!retryConfig.retryableStatuses) return false
    return error.status ? retryConfig.retryableStatuses.includes(error.status) : false
  }, [retryConfig.retryableStatuses])

  const withRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationId?: string,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> => {
    const config = { ...retryConfig, ...customRetryConfig }
    let lastError: any
    let attempt = 0

    while (attempt < config.maxAttempts) {
      try {
        setIsRetrying(attempt > 0)
        const result = await operation()
        setIsRetrying(false)
        return result
      } catch (error) {
        lastError = error
        attempt++

        const apiError = createError(error)
        
        if (attempt >= config.maxAttempts || !isRetryableError(apiError)) {
          setIsRetrying(false)
          throw error
        }

        // Calculate delay
        let delay = config.delay
        if (config.backoff === 'exponential') {
          delay *= Math.pow(2, attempt - 1)
        } else {
          delay *= attempt
        }

        // Add jitter to prevent thundering herd
        delay += Math.random() * 1000

        console.log(`Retrying operation (attempt ${attempt}/${config.maxAttempts}) in ${delay}ms`)

        // Wait before retry
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, delay)
          if (operationId) {
            retryTimeouts.current.set(operationId, timeoutId)
          }
        })
      }
    }

    setIsRetrying(false)
    throw lastError
  }, [retryConfig, createError, isRetryableError])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const removeError = useCallback((timestamp: string) => {
    setErrors(prev => prev.filter(error => error.timestamp !== timestamp))
  }, [])

  const cancelRetry = useCallback((operationId: string) => {
    const timeoutId = retryTimeouts.current.get(operationId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      retryTimeouts.current.delete(operationId)
      setIsRetrying(false)
    }
  }, [])

  return {
    errors,
    isRetrying,
    handleError,
    withRetry,
    clearErrors,
    removeError,
    cancelRetry,
    createError
  }
}

// Utility function for wrapping API calls with error handling
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler: (error: any) => void,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      errorHandler(error)
      throw error
    }
  }
}

// React Query error handler
export function createReactQueryErrorHandler(errorHandler: (error: any) => void) {
  return (error: any) => {
    errorHandler(error)
  }
}

// Network error detector
export function isNetworkError(error: any): boolean {
  return (
    !error.response ||
    error.code === 'NETWORK_ERROR' ||
    error.message === 'Network Error' ||
    error.message?.includes('fetch')
  )
}

// Timeout error detector
export function isTimeoutError(error: any): boolean {
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'TIMEOUT' ||
    error.message?.includes('timeout')
  )
}

// Server error detector
export function isServerError(error: any): boolean {
  const status = error.status || error.response?.status
  return status >= 500 && status < 600
}

// Client error detector
export function isClientError(error: any): boolean {
  const status = error.status || error.response?.status
  return status >= 400 && status < 500
}

// Get user-friendly error message
export function getFriendlyErrorMessage(error: ApiError): string {
  // Network errors
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }

  // Timeout errors
  if (isTimeoutError(error)) {
    return 'The request is taking longer than expected. Please try again.'
  }

  // Server errors
  if (isServerError(error)) {
    return 'Our servers are experiencing issues. Please try again in a few moments.'
  }

  // Authentication errors
  if (error.status === 401) {
    return 'You need to log in to continue.'
  }

  // Authorization errors
  if (error.status === 403) {
    return 'You don\'t have permission to perform this action.'
  }

  // Not found errors
  if (error.status === 404) {
    return 'The requested resource could not be found.'
  }

  // Rate limiting
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment before trying again.'
  }

  // Validation errors
  if (error.status === 422 || error.status === 400) {
    return error.details?.message || 'Please check your input and try again.'
  }

  // Default to original message or generic fallback
  return error.message || 'An unexpected error occurred. Please try again.'
}

// Error recovery suggestions
export function getErrorRecoveryAction(error: ApiError): string {
  if (isNetworkError(error)) {
    return 'Check your internet connection'
  }

  if (isTimeoutError(error)) {
    return 'Try again'
  }

  if (error.status === 401) {
    return 'Log in again'
  }

  if (error.status === 403) {
    return 'Contact support'
  }

  if (error.status === 404) {
    return 'Go back'
  }

  if (error.status === 429) {
    return 'Wait and try again'
  }

  if (isServerError(error)) {
    return 'Try again later'
  }

  return 'Try again'
}