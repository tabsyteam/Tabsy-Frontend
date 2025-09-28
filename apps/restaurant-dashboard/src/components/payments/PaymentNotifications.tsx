'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Clock,
  X,
  Bell
} from 'lucide-react'
import type {
  PaymentMethod,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentCreatedEvent,
  PaymentRefundedEvent,
  PaymentCancelledEvent
} from '@tabsy/shared-types'

interface NotificationItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  duration: number
  paymentId?: string
  orderId?: string
}

interface PaymentNotificationsProps {
  restaurantId: string
  onNotification?: (notification: NotificationItem) => void
}

// Configuration constants
const NOTIFICATION_DURATIONS = {
  SUCCESS: 5000,
  ERROR: 8000,
  WARNING: 6000,
  INFO: 3000
} as const

const MAX_NOTIFICATIONS = 5

export function PaymentNotifications({ restaurantId, onNotification }: PaymentNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [timeoutIds, setTimeoutIds] = useState<Map<string, NodeJS.Timeout>>(new Map())
  const { isConnected } = useWebSocket()

  // Helper function to create notification
  const createNotification = (
    type: NotificationItem['type'],
    title: string,
    message: string,
    paymentId?: string,
    orderId?: string,
    duration = 5000
  ): NotificationItem => {
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      duration,
      paymentId,
      orderId
    }

    if (onNotification) {
      onNotification(notification)
    }

    return notification
  }

  // Add notification to state with memory leak prevention
  const addNotification = useCallback((notification: NotificationItem) => {
    setNotifications(prev => {
      const updated = [notification, ...prev]
      // Limit total notifications to prevent UI overflow
      return updated.slice(0, MAX_NOTIFICATIONS)
    })

    // Auto-remove after duration with cleanup tracking
    if (notification.duration > 0) {
      const timeoutId = setTimeout(() => {
        removeNotification(notification.id)
      }, notification.duration)

      setTimeoutIds(prev => new Map(prev).set(notification.id, timeoutId))
    }
  }, [])

  // Remove notification manually with timeout cleanup
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))

    // Clear associated timeout
    const timeoutId = timeoutIds.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutIds(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
    }
  }, [timeoutIds])

  // Memoized utility functions for data processing
  const formatCurrency = useMemo(() => (amount: unknown): string => {
    if (typeof amount === 'number' && !isNaN(amount)) {
      return amount.toFixed(2)
    }

    if (typeof amount === 'string') {
      const parsed = parseFloat(amount)
      return !isNaN(parsed) ? parsed.toFixed(2) : '0.00'
    }

    return '0.00'
  }, [])

  const formatPaymentMethod = useMemo(() => (method: unknown): string => {
    if (typeof method !== 'string' || !method.trim()) {
      return 'unknown method'
    }

    return method
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }, [])

  // WebSocket event handlers for payment notifications
  const handlePaymentCompleted = useCallback((data: PaymentCompletedEvent) => {
    const amount = formatCurrency(data.amount)
    const tip = data.tip ? formatCurrency(data.tip) : null

    const notification = createNotification(
      'success',
      'Payment Completed',
      `Payment of $${amount} completed successfully${tip ? ` (Tip: $${tip})` : ''}`,
      data.paymentId,
      data.orderId,
      NOTIFICATION_DURATIONS.SUCCESS
    )
    addNotification(notification)
  }, [addNotification, formatCurrency])

  const handlePaymentFailed = useCallback((data: PaymentFailedEvent) => {
    const amount = formatCurrency(data.amount)
    const errorMessage = data.errorMessage || data.error || 'Unknown error'

    const notification = createNotification(
      'error',
      'Payment Failed',
      `Payment of $${amount} failed: ${errorMessage}`,
      data.paymentId,
      data.orderId,
      NOTIFICATION_DURATIONS.ERROR
    )
    addNotification(notification)
  }, [addNotification, formatCurrency])

  const handlePaymentCreated = useCallback((data: PaymentCreatedEvent) => {
    const amount = data.amount ?? data.total ?? 0
    const method = data.method ?? data.paymentMethod ?? 'unknown'

    const formattedAmount = formatCurrency(amount)
    const formattedMethod = formatPaymentMethod(method)

    const notification = createNotification(
      'info',
      'New Payment Started',
      `Payment of $${formattedAmount} initiated via ${formattedMethod}`,
      data.paymentId,
      data.orderId,
      NOTIFICATION_DURATIONS.INFO
    )
    addNotification(notification)
  }, [addNotification, formatCurrency, formatPaymentMethod])

  const handlePaymentRefunded = useCallback((data: PaymentRefundedEvent) => {
    const amount = formatCurrency(data.amount)
    const reason = data.reason || ''

    const notification = createNotification(
      'warning',
      'Payment Refunded',
      `Refund of $${amount} processed${reason ? ` - ${reason}` : ''}`,
      data.refundId,
      data?.orderId,
      NOTIFICATION_DURATIONS.WARNING
    )
    addNotification(notification)
  }, [addNotification])

  const handlePaymentCancelled = useCallback((data: PaymentCancelledEvent) => {
    const reason = data.reason || ''

    const notification = createNotification(
      'warning',
      'Payment Cancelled',
      `Payment cancelled${reason ? ` - ${reason}` : ''}`,
      data.paymentId,
      data.orderId,
      NOTIFICATION_DURATIONS.WARNING
    )
    addNotification(notification)
  }, [addNotification])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutIds.forEach(timeoutId => clearTimeout(timeoutId))
    }
  }, [timeoutIds])

  // Register WebSocket event listeners with proper dependencies
  useWebSocketEvent('payment:completed', handlePaymentCompleted, [handlePaymentCompleted])
  useWebSocketEvent('payment:failed', handlePaymentFailed, [handlePaymentFailed])
  useWebSocketEvent('payment:created', handlePaymentCreated, [handlePaymentCreated])
  useWebSocketEvent('payment:refunded', handlePaymentRefunded, [handlePaymentRefunded])
  useWebSocketEvent('payment:cancelled', handlePaymentCancelled, [handlePaymentCancelled])

  // Get icon for notification type
  const getIcon = (type: NotificationItem['type']) => {
    const iconClass = "w-5 h-5"
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-status-success`} />
      case 'error':
        return <XCircle className={`${iconClass} text-status-error`} />
      case 'warning':
        return <AlertCircle className={`${iconClass} text-status-warning`} />
      case 'info':
        return <Clock className={`${iconClass} text-status-info`} />
      default:
        return <Bell className={`${iconClass} text-content-secondary`} />
    }
  }

  // Get color classes for notification type
  const getColorClasses = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return 'border-status-success/20 bg-status-success/5'
      case 'error':
        return 'border-status-error/20 bg-status-error/5'
      case 'warning':
        return 'border-status-warning/20 bg-status-warning/5'
      case 'info':
        return 'border-status-info/20 bg-status-info/5'
      default:
        return 'border-border-default bg-surface'
    }
  }

  // Connection status notification - DISABLED for better UX
  // These auto-popups are distracting and not actionable for users
  // WebSocket connection status can be shown in header or status bar instead
  /*
  useEffect(() => {
    if (isConnected) {
      const notification = createNotification(
        'success',
        'Connected',
        'Real-time payment monitoring is active',
        undefined,
        undefined,
        2000
      )
      addNotification(notification)
    } else {
      const notification = createNotification(
        'error',
        'Disconnected',
        'Real-time payment monitoring is offline',
        undefined,
        undefined,
        0 // Don't auto-remove connection errors
      )
      addNotification(notification)
    }
  }, [isConnected])
  */

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out ${getColorClasses(notification.type)}`}
        >
          <div className="flex-shrink-0">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-content-primary">
                  {notification.title}
                </h4>
                <p className="text-sm text-content-secondary mt-1">
                  {notification.message}
                </p>
                {(notification.paymentId || notification.orderId) && (
                  <div className="flex items-center space-x-2 mt-2 text-xs text-content-tertiary">
                    {notification.paymentId && (
                      <span>Payment: {notification.paymentId.slice(-8)}</span>
                    )}
                    {notification.orderId && (
                      <span>Order: {notification.orderId.slice(-6)}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 ml-2 text-content-tertiary hover:text-content-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-content-tertiary mt-1">
              {notification.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Export notification item type for external use
export type { NotificationItem }