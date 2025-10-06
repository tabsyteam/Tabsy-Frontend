'use client'

/**
 * Error Boundary Component for Admin Portal
 * Gracefully handles runtime errors and provides user-friendly error UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@tabsy/ui-components'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the errors, and displays a fallback UI instead of crashing the page.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    window.location.href = '/dashboard'
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full">
            <div className="bg-surface border border-border-tertiary rounded-lg shadow-lg p-8 text-center">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-status-error" />
                </div>
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-semibold text-content-primary mb-3">
                Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-content-secondary mb-6">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-content-tertiary hover:text-content-secondary mb-2">
                    View error details
                  </summary>
                  <div className="bg-surface-secondary border border-border-tertiary rounded p-4 max-h-48 overflow-auto">
                    <pre className="text-xs text-status-error whitespace-pre-wrap break-words">
                      {this.state.error?.stack}
                    </pre>
                    <pre className="text-xs text-content-tertiary mt-4 whitespace-pre-wrap break-words">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="secondary"
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="default"
                  className="flex items-center justify-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Support Text */}
              <p className="text-sm text-content-tertiary mt-6">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Compact Error Fallback Component
 * For use in smaller contexts like modals or cards
 */
export function CompactErrorFallback({
  error,
  onReset,
}: {
  error?: Error
  onReset?: () => void
}): JSX.Element {
  return (
    <div className="p-6 text-center">
      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-status-error" />
      <h3 className="text-lg font-semibold text-content-primary mb-2">
        Error Loading Content
      </h3>
      <p className="text-content-secondary mb-4 text-sm">
        {error?.message || 'An unexpected error occurred'}
      </p>
      {onReset && (
        <Button onClick={onReset} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return ComponentWithErrorBoundary
}

export default ErrorBoundary
