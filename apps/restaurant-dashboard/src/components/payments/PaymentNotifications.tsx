'use client'

import { useEffect, useState, useCallback } from 'react'
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

export function PaymentNotifications({ restaurantId, onNotification }: PaymentNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
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

  // Add notification to state
  const addNotification = (notification: NotificationItem) => {
    setNotifications(prev => [notification, ...prev])

    // Auto-remove after duration
    if (notification.duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, notification.duration)
    }
  }

  // Remove notification manually
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // WebSocket event handlers for payment notifications
  const handlePaymentCompleted = useCallback((data: any) => {
    const notification = createNotification(
      'success',
      'Payment Completed',
      `Payment of $${data.amount.toFixed(2)} completed successfully${data.tip ? ` (Tip: $${data.tip.toFixed(2)})` : ''}`,
      data.paymentId,
      data.orderId
    )
    addNotification(notification)
  }, [])

  const handlePaymentFailed = useCallback((data: any) => {
    const notification = createNotification(
      'error',
      'Payment Failed',
      `Payment of $${data.amount.toFixed(2)} failed: ${data.errorMessage}`,
      data.paymentId,
      data.orderId,
      8000 // Longer duration for errors
    )
    addNotification(notification)
  }, [])

  const handlePaymentCreated = useCallback((data: any) => {
    const notification = createNotification(
      'info',
      'New Payment Started',
      `Payment of $${data.amount.toFixed(2)} initiated via ${data.method.replace('_', ' ').toLowerCase()}`,
      data.paymentId,
      data.orderId,
      3000
    )
    addNotification(notification)
  }, [])

  const handlePaymentRefunded = useCallback((data: any) => {
    const notification = createNotification(
      'warning',
      'Payment Refunded',
      `Refund of $${data.amount.toFixed(2)} processed${data.reason ? ` - ${data.reason}` : ''}`,
      data.refundId,
      data.orderId,
      6000
    )
    addNotification(notification)
  }, [])

  const handlePaymentCancelled = useCallback((data: any) => {
    const notification = createNotification(
      'warning',
      'Payment Cancelled',
      `Payment cancelled${data.reason ? ` - ${data.reason}` : ''}`,
      data.paymentId,
      data.orderId,
      4000
    )
    addNotification(notification)
  }, [])

  // Register WebSocket event listeners
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