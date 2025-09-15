'use client'

import React, { Component, ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void
  showErrorDetails?: boolean
  level?: 'page' | 'component' | 'critical'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props
    const { errorId } = this.state

    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    console.error('Error Boundary caught an error:', {
      error,
      errorInfo,
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    })

    // Call external error handler
    if (onError) {
      onError(error, errorInfo, errorId)
    }

    // In production, send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo, tags: { errorId } })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state
    
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    }

    // Copy error details to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
        .then(() => alert('Error details copied to clipboard'))
        .catch(() => console.log('Could not copy error details'))
    }
  }

  render() {
    const { hasError, error, errorInfo, errorId } = this.state
    const { children, fallback, showErrorDetails = false, level = 'component' } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Render error UI based on error level
      return (
        <div className={`
          ${level === 'critical' ? 'min-h-screen' : 'min-h-[400px]'}
          flex items-center justify-center p-6 bg-background
        `}>
          <div className="max-w-md w-full bg-surface rounded-lg shadow-lg p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-status-error-light mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            
            <h3 className="text-lg font-medium text-content-primary mb-2">
              {level === 'critical' ? 'Application Error' : 'Something went wrong'}
            </h3>
            
            <p className="text-sm text-content-tertiary mb-6">
              {level === 'critical' 
                ? 'A critical error occurred that prevented the application from working properly.'
                : 'We encountered an unexpected error. Please try again.'
              }
            </p>

            {showErrorDetails && error && (
              <div className="mb-6 p-3 bg-surface-secondary rounded text-left">
                <p className="text-xs font-mono text-content-secondary break-all">
                  <strong>Error ID:</strong> {errorId}
                </p>
                <p className="text-xs font-mono text-content-secondary mt-1">
                  <strong>Message:</strong> {error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-status-info-foreground bg-status-info hover:bg-status-info-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-status-info"
              >
                <span className="mr-2">🔄</span>
                Try Again
              </button>
              
              {level === 'critical' && (
                <button
                  onClick={() => typeof window !== 'undefined' && (window.location.href = '/')}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-md text-content-secondary bg-surface hover:bg-interactive-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <span className="mr-2">🏠</span>
                  Go Home
                </button>
              )}
              
              <button
                onClick={this.handleReportError}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="mr-2">🐛</span>
                Report
              </button>
            </div>

            {errorInfo && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-content-primary">
                  Debug Information
                </summary>
                <pre className="mt-2 text-xs bg-surface-secondary p-2 rounded overflow-auto max-h-32">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return children
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for handling errors in functional components
export function useComponentErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.error('Manual error handling:', {
      error,
      errorInfo,
      errorId,
      timestamp: new Date().toISOString()
    })

    // In production, send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo, tags: { errorId } })

    return errorId
  }, [])

  return handleError
}