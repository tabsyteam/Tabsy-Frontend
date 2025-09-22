'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@tabsy/ui-components'
import {
  Bell,
  Phone,
  Clock,
  User,
  MapPin,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Notification } from '@tabsy/shared-types'
import { tabsyClient } from '@tabsy/api-client'
import { toast } from 'sonner'
import { useNotificationMute } from '@/contexts/NotificationMuteContext'

interface AssistanceRequest {
  id: string
  tableId: string
  orderId?: string
  customerName: string
  urgency: 'low' | 'normal' | 'high'
  message?: string
  requestTime: string
  acknowledged?: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

interface AssistanceAlertProps {
  notification: Notification
  onDismiss: (notificationId: string) => void
  onAcknowledge: (notificationId: string) => void
}

interface AssistanceAlertsContainerProps {
  notifications: Notification[]
  onDismiss: (notificationId: string) => void
  onAcknowledge: (notificationId: string) => void
}

const urgencyConfig = {
  low: {
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
  },
  normal: {
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    iconColor: 'text-yellow-600',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
  },
  high: {
    color: 'bg-red-50 border-red-200 text-red-800',
    iconColor: 'text-red-600',
    buttonColor: 'bg-red-600 hover:bg-red-700'
  }
}

export function AssistanceAlert({ notification, onDismiss, onAcknowledge }: AssistanceAlertProps) {
  const [acknowledging, setAcknowledging] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState<string>('')
  const queryClient = useQueryClient()

  // Parse assistance request data from notification metadata
  const assistanceData = notification.metadata as AssistanceRequest

  const urgency = assistanceData.urgency || 'normal'
  const config = urgencyConfig[urgency]

  // Calculate time elapsed since request
  useEffect(() => {
    const updateTimeElapsed = () => {
      if (assistanceData.requestTime) {
        const requestTime = new Date(assistanceData.requestTime)
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - requestTime.getTime()) / 1000)

        if (diffInSeconds < 60) {
          setTimeElapsed(`${diffInSeconds}s ago`)
        } else if (diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60)
          setTimeElapsed(`${minutes}m ago`)
        } else {
          const hours = Math.floor(diffInSeconds / 3600)
          setTimeElapsed(`${hours}h ago`)
        }
      }
    }

    updateTimeElapsed()
    const interval = setInterval(updateTimeElapsed, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [assistanceData.requestTime])

  const handleAcknowledge = async () => {
    setAcknowledging(true)
    try {
      await tabsyClient.notification.markAsRead(notification.id)
      // Invalidate notifications cache to update badge count immediately
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      onAcknowledge(notification.id)
      toast.success(`Assistance acknowledged for Table ${assistanceData.tableId}`)
    } catch (error) {
      console.error('Failed to acknowledge assistance:', error)
      toast.error('Failed to acknowledge assistance request')
    } finally {
      setAcknowledging(false)
    }
  }

  const handleDismiss = () => {
    onDismiss(notification.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`border rounded-lg p-4 shadow-lg ${config.color} relative`}
    >
      {/* Priority indicator */}
      {urgency === 'high' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm`}>
            <Phone className={`w-4 h-4 ${config.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-sm">
                Assistance Required - Table {assistanceData.tableId}
              </h3>
              {urgency === 'high' && (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{assistanceData.customerName}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{timeElapsed}</span>
                </div>
                {assistanceData.orderId && (
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Order:</span>
                    <span className="font-mono">#{assistanceData.orderId.slice(-6)}</span>
                  </div>
                )}
              </div>

              {assistanceData.message && (
                <div className="mt-2">
                  <p className="text-gray-600 font-medium">"{assistanceData.message}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end space-x-2 mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-xs"
        >
          Dismiss
        </Button>
        <Button
          size="sm"
          onClick={handleAcknowledge}
          disabled={acknowledging}
          className={`text-xs text-white ${config.buttonColor}`}
        >
          {acknowledging ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
              Acknowledging...
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Acknowledge
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}

export function AssistanceAlertsContainer({ notifications, onDismiss, onAcknowledge }: AssistanceAlertsContainerProps) {
  // Use notification mute context for reactive state
  const { notificationsMuted } = useNotificationMute()

  // Filter for assistance required notifications that haven't been read
  const assistanceNotifications = notifications.filter(
    notification =>
      notification.type === 'ASSISTANCE_REQUIRED' &&
      !notification.isRead
  )

  // Don't show assistance alerts if notifications are muted
  console.log('🚨 AssistanceAlert: Check visibility', {
    assistanceCount: assistanceNotifications.length,
    notificationsMuted,
    shouldShow: assistanceNotifications.length > 0 && !notificationsMuted
  })

  if (assistanceNotifications.length === 0 || notificationsMuted) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      <AnimatePresence mode="popLayout">
        {assistanceNotifications.map(notification => (
          <AssistanceAlert
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
            onAcknowledge={onAcknowledge}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}