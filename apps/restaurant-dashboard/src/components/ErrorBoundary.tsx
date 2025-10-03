/**
 * Error Boundary System
 * Senior Architecture Pattern: Graceful Degradation + Error Isolation
 *
 * Provides error boundaries for different feature domains to prevent
 * WebSocket or component errors from crashing the entire application.
 *
 * Architecture Principles:
 * 1. Error isolation per feature domain
 * 2. User-friendly error messages
 * 3. Automatic error logging
 * 4. Graceful recovery mechanisms
 * 5. Development vs production error display
 */

'use client'

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { logger } from '../lib/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: unknown[] // Reset boundary when these values change
  domain?: 'payment' | 'order' | 'table' | 'menu' | 'dashboard' | 'general'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

/**
 * Generic Error Boundary
 * Can be customized per feature domain
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static override getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { domain = 'general', onError } = this.props

    // Log error
    logger.error(`Error in ${domain} component`, error)
    logger.error('Component stack', errorInfo.componentStack)

    // Call custom error handler if provided
    onError?.(error, errorInfo)

    // Update state with error details
    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }))

    // TODO: Send to error tracking service (Sentry, DataDog, etc.)
    // this.reportToErrorTracking(error, errorInfo, domain)
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys = [] } = this.props
    const { hasError } = this.state

    // Reset error boundary if resetKeys change
    if (
      hasError &&
      resetKeys.length > 0 &&
      resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index])
    ) {
      this.reset()
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  override render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, domain = 'general' } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback && errorInfo) {
        return fallback(error, errorInfo, this.reset)
      }

      // Use default fallback
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          domain={domain}
          onReset={this.reset}
        />
      )
    }

    return children
  }
}

/**
 * Default Error Fallback UI
 */
interface DefaultErrorFallbackProps {
  error: Error
  errorInfo: ErrorInfo | null
  domain: string
  onReset: () => void
}

function DefaultErrorFallback({
  error,
  errorInfo,
  domain,
  onReset,
}: DefaultErrorFallbackProps): JSX.Element {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const domainMessages: Record<string, { title: string; description: string }> = {
    payment: {
      title: 'Payment System Error',
      description: 'There was an issue loading payment data. You can retry or return to the dashboard.',
    },
    order: {
      title: 'Order System Error',
      description: 'There was an issue loading order data. You can retry or return to the dashboard.',
    },
    table: {
      title: 'Table Management Error',
      description: 'There was an issue loading table data. You can retry or return to the dashboard.',
    },
    menu: {
      title: 'Menu Management Error',
      description: 'There was an issue loading menu data. You can retry or return to the dashboard.',
    },
    dashboard: {
      title: 'Dashboard Error',
      description: 'There was an issue loading dashboard data. Please try refreshing the page.',
    },
    general: {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. You can retry or return to the dashboard.',
    },
  }

  const message = domainMessages[domain] ?? domainMessages.general

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-surface border border-error rounded-lg p-6 shadow-lg">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-error/10 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-error" />
            </div>
          </div>

          {/* Error Message */}
          <h2 className="text-xl font-semibold text-content-primary text-center mb-2">
            {message.title}
          </h2>
          <p className="text-content-secondary text-center mb-6">
            {message.description}
          </p>

          {/* Development Error Details */}
          {isDevelopment && (
            <details className="mb-6 bg-surface-secondary rounded p-4 text-sm">
              <summary className="cursor-pointer font-medium text-content-primary mb-2">
                Technical Details (Development)
              </summary>
              <div className="space-y-2 text-content-secondary font-mono text-xs">
                <div>
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div className="overflow-auto max-h-40">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div className="overflow-auto max-h-40">
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReset}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-md font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 bg-surface-secondary text-content-primary hover:bg-surface-tertiary px-4 py-2 rounded-md font-medium transition-colors border border-default"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Specialized Error Boundaries for Different Domains
 */

export function PaymentErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      domain="payment"
      onError={(error, errorInfo) => {
        logger.error('Payment component error', error)
        logger.error('Payment error component stack', errorInfo.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export function OrderErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      domain="order"
      onError={(error, errorInfo) => {
        logger.error('Order component error', error)
        logger.error('Order error component stack', errorInfo.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export function TableErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      domain="table"
      onError={(error, errorInfo) => {
        logger.error('Table component error', error)
        logger.error('Table error component stack', errorInfo.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export function MenuErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      domain="menu"
      onError={(error, errorInfo) => {
        logger.error('Menu component error', error)
        logger.error('Menu error component stack', errorInfo.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export function DashboardErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      domain="dashboard"
      onError={(error, errorInfo) => {
        logger.error('Dashboard component error', error)
        logger.error('Dashboard error component stack', errorInfo.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
