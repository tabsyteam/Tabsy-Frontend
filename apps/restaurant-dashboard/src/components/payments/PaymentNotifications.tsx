'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useWebSocket } from '@tabsy/ui-components'
import { motion, AnimatePresence } from 'framer-motion'
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
import type { PaymentMethod } from '@tabsy/shared-types'
import { NOTIFICATION_DURATIONS, MAX_NOTIFICATIONS } from '../../lib/constants'
import { logger } from '../../lib/logger'

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

/**
 * PaymentNotifications Component
 *
 * SENIOR ARCHITECTURE NOTE:
 * This component is now a pure UI notification display component.
 * WebSocket event listeners have been removed and centralized in PaymentManagement.tsx
 * via usePaymentWebSocketSync hook. This component can optionally receive notifications
 * via the onNotification prop for display purposes only.
 *
 * The component maintains local notification state for UI animation and auto-dismiss,
 * but does NOT listen to WebSocket events directly.
 */
export function PaymentNotifications({ restaurantId, onNotification }: PaymentNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  // Use ref instead of state to avoid stale closure issues with timeouts
  const timeoutIdsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
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

  // Remove notification with proper cleanup - stable reference
  const removeNotification = useCallback((id: string) => {
    // Remove from notifications array
    setNotifications(prev => prev.filter(n => n.id !== id))

    // Clear associated timeout from ref to prevent memory leak
    const timeoutId = timeoutIdsRef.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutIdsRef.current.delete(id)
      logger.debug('Cleared notification timeout', { id })
    }
  }, [])

  // Add notification to state with auto-dismiss
  const addNotification = useCallback((notification: NotificationItem) => {
    // Add to notifications array
    setNotifications(prev => {
      const updated = [notification, ...prev]
      // Limit total notifications to prevent UI overflow
      if (updated.length > MAX_NOTIFICATIONS) {
        // Remove oldest notifications and their timeouts to prevent memory leak
        const removed = updated.slice(MAX_NOTIFICATIONS)
        removed.forEach(n => {
          const timeoutId = timeoutIdsRef.current.get(n.id)
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutIdsRef.current.delete(n.id)
          }
        })
      }
      return updated.slice(0, MAX_NOTIFICATIONS)
    })

    // Set up auto-remove timeout
    if (notification.duration > 0) {
      const timeoutId = setTimeout(() => {
        removeNotification(notification.id)
      }, notification.duration)

      // Store timeout in ref for later cleanup
      timeoutIdsRef.current.set(notification.id, timeoutId)
      logger.debug('Set notification timeout', { id: notification.id, duration: notification.duration })
    }
  }, [removeNotification])

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

  /**
   * MEMORY LEAK FIX: Enhanced cleanup on unmount
   * Clears all pending timeouts to prevent memory leaks
   * This is the ONLY cleanup needed - no duplicate WebSocket listeners to clean up
   */
  useEffect(() => {
    logger.debug('PaymentNotifications mounted', { restaurantId })

    return () => {
      // Clear all pending timeouts when component unmounts
      const count = timeoutIdsRef.current.size
      if (count > 0) {
        logger.debug('Cleaning up notification timeouts', { count })
        timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
        timeoutIdsRef.current.clear()
      }
    }
  }, [restaurantId])

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

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-md pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              mass: 1
            }}
            className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm pointer-events-auto ${getColorClasses(notification.type)}`}
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
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-content-tertiary mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Export notification item type for external use
export type { NotificationItem }