import { useErrorHandler, type ApiError } from '@tabsy/ui-components'
import { useToast } from '@tabsy/ui-components'

export interface ApiCallOptions {
  showErrorToast?: boolean
  errorContext?: string
  retryConfig?: {
    maxAttempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
  onError?: (error: ApiError) => void
  onSuccess?: (data: any) => void
}

export function useApiCall() {
  const { handleError, withRetry } = useErrorHandler({
    showToast: false, // We'll handle toasts manually
    logToConsole: true,
    reportToService: true
  })
  const { addToast } = useToast()

  const apiCall = async <T>(
    operation: () => Promise<T>,
    options: ApiCallOptions = {}
  ): Promise<T> => {
    const {
      showErrorToast = true,
      errorContext,
      retryConfig,
      onError,
      onSuccess
    } = options

    try {
      const result = retryConfig 
        ? await withRetry(operation, undefined, retryConfig)
        : await operation()

      onSuccess?.(result)
      return result
    } catch (error) {
      const apiError = handleError(error, errorContext)

      // Show error toast if enabled
      if (showErrorToast) {
        addToast({
          type: 'error',
          title: 'Error',
          message: getFriendlyErrorMessage(apiError),
          duration: 8000,
          action: isRetryableError(apiError) ? {
            label: 'Retry',
            onClick: () => apiCall(operation, options)
          } : undefined
        })
      }

      onError?.(apiError)
      throw error
    }
  }

  return { apiCall }
}

function getFriendlyErrorMessage(error: ApiError): string {
  // Network errors
  if (!error.status) {
    return 'Unable to connect to the server. Please check your internet connection.'
  }

  // Server errors
  if (error.status >= 500) {
    return 'Server error occurred. Please try again later.'
  }

  // Authentication errors
  if (error.status === 401) {
    return 'Please log in to continue.'
  }

  // Authorization errors
  if (error.status === 403) {
    return 'You don\'t have permission to perform this action.'
  }

  // Not found errors
  if (error.status === 404) {
    return 'The requested resource was not found.'
  }

  // Rate limiting
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment before trying again.'
  }

  // Validation errors
  if (error.status === 422 || error.status === 400) {
    return error.details?.message || 'Please check your input and try again.'
  }

  return error.message || 'An unexpected error occurred.'
}

function isRetryableError(error: ApiError): boolean {
  const retryableStatuses = [500, 502, 503, 504, 408, 429]
  return error.status ? retryableStatuses.includes(error.status) : true
}