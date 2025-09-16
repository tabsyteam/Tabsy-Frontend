import { Notification } from '@tabsy/shared-types'
import { ShoppingCart, CreditCard, Bell, AlertCircle, Gift } from 'lucide-react'

/**
 * Format notification content based on type and metadata
 */
export function formatNotificationContent(notification: Notification): {
  title: string
  message: string
  icon: any
  iconColor: string
} {
  const { type, content, metadata } = notification

  switch (type) {
    case 'ORDER_STATUS':
      return {
        title: 'Order Update',
        message: metadata.orderId
          ? `Order #${metadata.orderId}: ${content}`
          : content,
        icon: ShoppingCart,
        iconColor: 'text-blue-600'
      }

    case 'PAYMENT_STATUS':
      return {
        title: 'Payment Update',
        message: metadata.paymentId
          ? `Payment #${metadata.paymentId}: ${content}`
          : content,
        icon: CreditCard,
        iconColor: 'text-green-600'
      }

    case 'ASSISTANCE_REQUIRED':
      return {
        title: 'Service Request',
        message: metadata.tableId
          ? `Table ${metadata.tableId}: ${content}`
          : content,
        icon: Bell,
        iconColor: 'text-orange-600'
      }

    case 'SYSTEM':
      return {
        title: 'System Notification',
        message: content,
        icon: AlertCircle,
        iconColor: 'text-gray-600'
      }

    case 'MARKETING':
      return {
        title: 'Promotion',
        message: content,
        icon: Gift,
        iconColor: 'text-purple-600'
      }

    default:
      return {
        title: 'Notification',
        message: content,
        icon: Bell,
        iconColor: 'text-gray-600'
      }
  }
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  }

  // For older dates, show actual date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get notification priority color for badge
 */
export function getNotificationPriorityColor(type: string): string {
  switch (type) {
    case 'ASSISTANCE_REQUIRED':
      return 'bg-red-500'
    case 'ORDER_STATUS':
      return 'bg-blue-500'
    case 'PAYMENT_STATUS':
      return 'bg-green-500'
    case 'SYSTEM':
      return 'bg-gray-500'
    case 'MARKETING':
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}

/**
 * Generate fallback notification content for testing
 */
export function generateFallbackNotifications(): Array<{
  id: string
  content: string
  type: string
  isRead: boolean
  createdAt: string
  metadata: any
}> {
  return [
    {
      id: 'fallback-1',
      content: 'New order received',
      type: 'ORDER_STATUS',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      metadata: { orderId: '1234' }
    },
    {
      id: 'fallback-2',
      content: 'requesting service',
      type: 'ASSISTANCE_REQUIRED',
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      metadata: { tableId: '5' }
    }
  ]
}