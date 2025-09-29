'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@tabsy/ui-components'
import { WifiOff, RefreshCw, Home, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

interface WebSocketErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

interface WebSocketErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorType: 'websocket' | 'session' | 'network' | 'unknown'
  retryCount: number
}

export class WebSocketErrorBoundary extends Component<
  WebSocketErrorBoundaryProps,
  WebSocketErrorBoundaryState
> {
  constructor(props: WebSocketErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<WebSocketErrorBoundaryState> {
    // Determine error type based on error message
    let errorType: WebSocketErrorBoundaryState['errorType'] = 'unknown'

    if (error.message?.includes('WebSocket') || error.message?.includes('socket')) {
      errorType = 'websocket'
    } else if (error.message?.includes('session') || error.message?.includes('Session')) {
      errorType = 'session'
    } else if (error.message?.includes('network') || error.message?.includes('Network')) {
      errorType = 'network'
    }

    return {
      hasError: true,
      error,
      errorType
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('WebSocketErrorBoundary caught error:', error, errorInfo)

    // Report to error tracking service
    this.props.onError?.(error, errorInfo)

    // Log error details
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      errorType: this.state.errorType
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'unknown',
      retryCount: this.state.retryCount + 1
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      const { errorType, error, retryCount } = this.state

      const errorContent = {
        websocket: {
          icon: <WifiOff className="w-16 h-16 text-status-error" />,
          title: 'Connection Lost',
          message: 'We lost connection to our servers. This usually happens when there\'s a network issue.',
          suggestion: 'Please check your internet connection and try again.',
          primaryAction: {
            label: 'Retry Connection',
            onClick: this.handleReset,
            icon: <RefreshCw className="w-4 h-4" />
          }
        },
        session: {
          icon: <AlertTriangle className="w-16 h-16 text-status-warning" />,
          title: 'Session Error',
          message: 'Your dining session has ended or is invalid.',
          suggestion: 'Please scan the QR code at your table to start a new session.',
          primaryAction: {
            label: 'Scan QR Code',
            onClick: this.handleGoHome,
            icon: <Home className="w-4 h-4" />
          }
        },
        network: {
          icon: <WifiOff className="w-16 h-16 text-status-error" />,
          title: 'Network Error',
          message: 'Unable to connect to our services.',
          suggestion: 'Please check your internet connection.',
          primaryAction: {
            label: 'Refresh Page',
            onClick: this.handleRefresh,
            icon: <RefreshCw className="w-4 h-4" />
          }
        },
        unknown: {
          icon: <AlertTriangle className="w-16 h-16 text-status-error" />,
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred.',
          suggestion: 'Please try refreshing the page or contact support if the issue persists.',
          primaryAction: {
            label: 'Refresh Page',
            onClick: this.handleRefresh,
            icon: <RefreshCw className="w-4 h-4" />
          }
        }
      }[errorType]

      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-background/95 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="bg-surface rounded-2xl shadow-2xl border border-default/50 p-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-status-error/20 to-status-error/10 rounded-full blur-xl" />
                  <div className="relative">
                    {errorContent.icon}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-content-primary">
                  {errorContent.title}
                </h1>

                <p className="text-content-secondary">
                  {errorContent.message}
                </p>

                <p className="text-sm text-content-tertiary">
                  {errorContent.suggestion}
                </p>

                {/* Error details in development */}
                {process.env.NODE_ENV === 'development' && error && (
                  <details className="text-left mt-4 p-3 bg-surface-secondary rounded-lg">
                    <summary className="text-xs text-content-tertiary cursor-pointer">
                      Error Details (Development Only)
                    </summary>
                    <pre className="text-xs mt-2 overflow-auto text-content-tertiary">
                      {error.message}
                      {'\n'}
                      {error.stack}
                    </pre>
                  </details>
                )}

                {/* Retry count indicator */}
                {retryCount > 0 && (
                  <p className="text-xs text-content-tertiary">
                    Retry attempts: {retryCount}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-8 space-y-3">
                <Button
                  onClick={errorContent.primaryAction.onClick}
                  size="lg"
                  className="w-full"
                >
                  {errorContent.primaryAction.icon}
                  <span className="ml-2">{errorContent.primaryAction.label}</span>
                </Button>

                {errorType !== 'session' && (
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Home
                  </Button>
                )}
              </div>
            </div>

            {/* Help text */}
            <p className="text-center text-xs text-content-tertiary mt-6">
              If you continue to experience issues, please contact our staff for assistance.
            </p>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}