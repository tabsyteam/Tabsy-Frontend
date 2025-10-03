/**
 * WebSocket Error Boundary
 *
 * Catches errors in WebSocket-dependent components and provides
 * graceful fallback UI with retry functionality.
 *
 * @version 1.0.0
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@tabsy/ui-components'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface WebSocketErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface WebSocketErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorCount: number
}

/**
 * Error Boundary specifically designed for WebSocket-dependent components
 *
 * Usage:
 * ```tsx
 * <WebSocketErrorBoundary>
 *   <ComponentUsingWebSockets />
 * </WebSocketErrorBoundary>
 * ```
 */
export class WebSocketErrorBoundary extends Component<
  WebSocketErrorBoundaryProps,
  WebSocketErrorBoundaryState
> {
  constructor(props: WebSocketErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<WebSocketErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('[WebSocketErrorBoundary] Caught error:', error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Update state
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Send error to monitoring service (if configured)
    this.logErrorToService(error, errorInfo)
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo })
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6">
            {/* Error Icon */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-error/10 mb-4">
                <WifiOff className="w-8 h-8 text-status-error" />
              </div>
              <h1 className="text-2xl font-bold text-content-primary mb-2">
                Connection Error
              </h1>
              <p className="text-content-secondary">
                We're having trouble maintaining a real-time connection.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-surface border border-status-error/20 rounded-lg p-4">
                <div className="flex items-start space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-status-error text-sm mb-1">
                      Error Details (Dev Mode)
                    </h3>
                    <p className="text-xs text-content-secondary font-mono break-all">
                      {this.state.error.message}
                    </p>
                  </div>
                </div>
                {this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="text-xs text-content-secondary cursor-pointer hover:text-content-primary">
                      Show stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-content-tertiary overflow-auto max-h-40 p-2 bg-surface-secondary rounded border border-default">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Troubleshooting Tips */}
            <div className="bg-surface-secondary border border-default rounded-lg p-4">
              <h3 className="font-semibold text-sm text-content-primary mb-3">
                Troubleshooting Tips
              </h3>
              <ul className="space-y-2 text-sm text-content-secondary">
                <li className="flex items-start space-x-2">
                  <Wifi className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Check your internet connection</span>
                </li>
                <li className="flex items-start space-x-2">
                  <RefreshCw className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Try refreshing the page</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>If the problem persists, contact support</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                size="lg"
                className="w-full"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>

              {this.state.errorCount > 2 && (
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Reload Page
                </Button>
              )}
            </div>

            {/* Error Count Indicator */}
            {this.state.errorCount > 1 && (
              <p className="text-center text-xs text-content-tertiary">
                Error occurred {this.state.errorCount} times
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook to use error boundary programmatically
 *
 * Usage:
 * ```tsx
 * const { resetErrorBoundary } = useWebSocketErrorBoundary()
 * ```
 */
export function useWebSocketErrorBoundary() {
  const [, setError] = React.useState()

  const resetErrorBoundary = React.useCallback(() => {
    setError(() => {
      throw new Error('Reset error boundary')
    })
  }, [])

  return { resetErrorBoundary }
}
