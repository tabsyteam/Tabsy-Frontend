/**
 * API utilities for HTTP requests and responses
 */
export const apiUtils = {
  /**
   * Build query string from parameters
   */
  buildQueryString: (params: Record<string, any>): string => {
    const filteredParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

    return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : ''
  },

  /**
   * Parse query string to object
   */
  parseQueryString: (queryString: string): Record<string, string> => {
    const params: Record<string, string> = {}
    const searchParams = new URLSearchParams(queryString.replace(/^\?/, ''))
    
    for (const [key, value] of searchParams) {
      params[key] = value
    }
    
    return params
  },

  /**
   * Create API endpoint URL
   */
  createEndpoint: (baseUrl: string, path: string, params?: Record<string, any>): string => {
    const cleanBase = baseUrl.replace(/\/$/, '')
    const cleanPath = path.replace(/^\//, '')
    const queryString = params ? apiUtils.buildQueryString(params) : ''
    
    return `${cleanBase}/${cleanPath}${queryString}`
  },

  /**
   * Check if HTTP status code indicates success
   */
  isSuccessStatus: (status: number): boolean => {
    return status >= 200 && status < 300
  },

  /**
   * Check if HTTP status code indicates client error
   */
  isClientError: (status: number): boolean => {
    return status >= 400 && status < 500
  },

  /**
   * Check if HTTP status code indicates server error
   */
  isServerError: (status: number): boolean => {
    return status >= 500 && status < 600
  },

  /**
   * Get error message from API response
   */
  getErrorMessage: (error: any, fallback: string = 'An unexpected error occurred'): string => {
    if (typeof error === 'string') return error
    if (error?.response?.data?.message) return error.response.data.message
    if (error?.response?.data?.error) return error.response.data.error
    if (error?.message) return error.message
    return fallback
  },

  /**
   * Create headers for API requests
   */
  createHeaders: (token?: string, contentType: string = 'application/json'): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  },

  /**
   * Retry function with exponential backoff
   */
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  },

  /**
   * Create abort controller for request cancellation
   */
  createAbortController: (timeoutMs?: number): AbortController => {
    const controller = new AbortController()
    
    if (timeoutMs) {
      setTimeout(() => controller.abort(), timeoutMs)
    }
    
    return controller
  },

  /**
   * Check if error is due to request cancellation
   */
  isAbortError: (error: any): boolean => {
    return error?.name === 'AbortError' || error?.code === 'ABORT_ERR'
  },
}

export default apiUtils
