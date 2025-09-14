import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  InternalAxiosRequestConfig 
} from 'axios'
import type { 
  ApiResponse, 
  ApiError as ApiErrorType 
} from '@tabsy/shared-types'

export interface ApiClientConfig {
  baseURL?: string
  timeout?: number
  retries?: number
  retryDelay?: number
}

export class ApiError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly details?: any
  public readonly timestamp: string

  constructor(
    message: string, 
    status: number, 
    code: string, 
    details?: any
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }

  static fromResponse(response: AxiosResponse<ApiErrorType>): ApiError {
    const errorData = response.data
    return new ApiError(
      errorData.message,
      response.status,
      errorData.code,
      errorData
    )
  }
}

export class TabsyApiClient {
  private axiosInstance: AxiosInstance
  private config: Required<ApiClientConfig>
  private authToken: string | null = null
  private guestSessionId: string | null = null

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || 'http://localhost:5001/api/v1',
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.authToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.authToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling and retries
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Check if response indicates success
        if (response.data && typeof response.data.success === 'boolean' && !response.data.success) {
          throw ApiError.fromResponse(response)
        }
        return response
      },
      async (error) => {
        const originalRequest = error.config

        // Handle different error types
        if (error.response) {
          const status = error.response.status
          
          // Handle 401 Unauthorized - attempt token refresh
          if (status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            
            try {
              await this.refreshToken()
              return this.axiosInstance(originalRequest)
            } catch (refreshError) {
              // Redirect to login or emit authentication error
              this.handleAuthenticationError()
              return Promise.reject(refreshError)
            }
          }

          // Handle rate limiting (429)
          if (status === 429) {
            const retryAfter = error.response.headers['retry-after']
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay
            
            await this.delay(delay)
            return this.axiosInstance(originalRequest)
          }

          // Handle server errors (5xx) with exponential backoff
          if (status >= 500 && originalRequest._retryCount < this.config.retries) {
            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
            const delay = this.config.retryDelay * Math.pow(2, originalRequest._retryCount - 1)
            
            await this.delay(delay)
            return this.axiosInstance(originalRequest)
          }

          // Convert response to ApiError
          if (error.response.data?.error) {
            throw ApiError.fromResponse(error.response)
          }
        }

        // Handle network errors
        if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
          throw new ApiError(
            'Network error occurred',
            0,
            'NETWORK_ERROR',
            { originalError: error.message }
          )
        }

        // Handle timeout
        if (error.code === 'ECONNABORTED') {
          throw new ApiError(
            'Request timeout',
            408,
            'TIMEOUT',
            { timeout: this.config.timeout }
          )
        }

        return Promise.reject(error)
      }
    )
  }

  private async refreshToken(): Promise<void> {
    // Implementation would depend on the auth strategy
    // For now, we'll throw an error to trigger re-authentication
    throw new ApiError('Authentication required', 401, 'TOKEN_EXPIRED')
  }

  private handleAuthenticationError(): void {
    // Clear stored auth token
    this.authToken = null
    
    // Emit event or callback to handle re-authentication
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tabsy:auth-required'))
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Authentication methods
  setAuthToken(token: string): void {
    this.authToken = token
  }

  clearAuthToken(): void {
    this.authToken = null
  }

  getAuthToken(): string | null {
    return this.authToken
  }

  // Guest session methods
  setGuestSession(sessionId: string): void {
    this.guestSessionId = sessionId
  }

  clearGuestSession(): void {
    this.guestSessionId = null
  }

  getGuestSessionId(): string | null {
    return this.guestSessionId
  }

  // Generic request methods
  async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get<ApiResponse<T>>(url, config)
    return response.data
  }

  async post<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async put<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async patch<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async delete<T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config)
    return response.data
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health')
      return true
    } catch (error) {
      return false
    }
  }
}
