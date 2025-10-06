/**
 * Theme utility functions for Admin Portal
 * Executive Indigo theme with consistent semantic color usage
 */

import { OrderStatus, PaymentStatus, PaymentMethod } from '@tabsy/shared-types'

/**
 * Get status color classes for badges and indicators
 */
export function getStatusColorClass(
  status: OrderStatus | PaymentStatus
): string {
  const statusMap: Record<string, string> = {
    // Order statuses
    RECEIVED: 'bg-status-info/10 text-status-info border-status-info/20',
    PREPARING: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    READY: 'bg-primary/10 text-primary border-primary/20',
    DELIVERED: 'bg-status-success/10 text-status-success border-status-success/20',
    COMPLETED: 'bg-status-success/10 text-status-success border-status-success/20',
    CANCELLED: 'bg-status-error/10 text-status-error border-status-error/20',

    // Payment statuses
    PENDING: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    PROCESSING: 'bg-primary/10 text-primary border-primary/20',
    FAILED: 'bg-status-error/10 text-status-error border-status-error/20',
    REFUNDED: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    PARTIALLY_REFUNDED: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  }

  return statusMap[status] || 'bg-surface-secondary text-content-secondary border-border-tertiary'
}

/**
 * Get status text color for text elements
 */
export function getStatusTextClass(
  status: OrderStatus | PaymentStatus
): string {
  const statusMap: Record<string, string> = {
    RECEIVED: 'text-status-info',
    PREPARING: 'text-status-warning',
    READY: 'text-primary',
    DELIVERED: 'text-status-success',
    COMPLETED: 'text-status-success',
    CANCELLED: 'text-status-error',
    PENDING: 'text-status-warning',
    PROCESSING: 'text-primary',
    FAILED: 'text-status-error',
    REFUNDED: 'text-status-warning',
    PARTIALLY_REFUNDED: 'text-status-warning',
  }

  return statusMap[status] || 'text-content-secondary'
}

/**
 * Get status background color for full backgrounds
 */
export function getStatusBgClass(
  status: OrderStatus | PaymentStatus
): string {
  const statusMap: Record<string, string> = {
    RECEIVED: 'bg-status-info/10',
    PREPARING: 'bg-status-warning/10',
    READY: 'bg-primary/10',
    DELIVERED: 'bg-status-success/10',
    COMPLETED: 'bg-status-success/10',
    CANCELLED: 'bg-status-error/10',
    PENDING: 'bg-status-warning/10',
    PROCESSING: 'bg-primary/10',
    FAILED: 'bg-status-error/10',
    REFUNDED: 'bg-status-warning/10',
    PARTIALLY_REFUNDED: 'bg-status-warning/10',
  }

  return statusMap[status] || 'bg-surface-secondary'
}

/**
 * Get payment method icon color
 */
export function getPaymentMethodColor(method: PaymentMethod): string {
  const methodMap: Record<PaymentMethod, string> = {
    CREDIT_CARD: 'text-primary',
    DEBIT_CARD: 'text-secondary',
    MOBILE_PAYMENT: 'text-accent',
    CASH: 'text-status-success',
  }

  return methodMap[method] || 'text-content-secondary'
}

/**
 * Get trend arrow color based on direction
 */
export function getTrendColorClass(
  trend: 'up' | 'down' | 'neutral',
  inverse = false
): string {
  if (trend === 'neutral') return 'text-content-tertiary'

  if (inverse) {
    return trend === 'up' ? 'text-status-error' : 'text-status-success'
  }

  return trend === 'up' ? 'text-status-success' : 'text-status-error'
}

/**
 * Get metric card color scheme
 */
export function getMetricCardColors(variant?: 'default' | 'primary' | 'success' | 'warning' | 'error') {
  const variantMap = {
    default: {
      bg: 'bg-surface',
      border: 'border-border-tertiary',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    primary: {
      bg: 'bg-primary/5',
      border: 'border-primary/20',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    success: {
      bg: 'bg-status-success/5',
      border: 'border-status-success/20',
      iconBg: 'bg-status-success/10',
      iconColor: 'text-status-success',
    },
    warning: {
      bg: 'bg-status-warning/5',
      border: 'border-status-warning/20',
      iconBg: 'bg-status-warning/10',
      iconColor: 'text-status-warning',
    },
    error: {
      bg: 'bg-status-error/5',
      border: 'border-status-error/20',
      iconBg: 'bg-status-error/10',
      iconColor: 'text-status-error',
    },
  }

  return variantMap[variant || 'default']
}

/**
 * Get button variant classes
 */
export function getButtonClasses(variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary') {
  const variantMap = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
    outline: 'border-2 border-primary text-primary hover:bg-primary/10',
    ghost: 'text-content-primary hover:bg-surface-secondary',
    danger: 'bg-status-error text-white hover:bg-status-error/90',
  }

  return variantMap[variant]
}

/**
 * Get alert variant classes
 */
export function getAlertClasses(variant: 'info' | 'success' | 'warning' | 'error') {
  const variantMap = {
    info: 'bg-status-info/10 border-status-info/20 text-status-info',
    success: 'bg-status-success/10 border-status-success/20 text-status-success',
    warning: 'bg-status-warning/10 border-status-warning/20 text-status-warning',
    error: 'bg-status-error/10 border-status-error/20 text-status-error',
  }

  return variantMap[variant]
}

/**
 * Get loading skeleton classes
 */
export function getSkeletonClasses(variant: 'default' | 'card' | 'text' = 'default') {
  const baseClasses = 'animate-pulse bg-surface-tertiary rounded'

  const variantMap = {
    default: baseClasses,
    card: `${baseClasses} p-4`,
    text: `${baseClasses} h-4`,
  }

  return variantMap[variant]
}

/**
 * Combine class names (simple utility for conditional classes)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default {
  getStatusColorClass,
  getStatusTextClass,
  getStatusBgClass,
  getPaymentMethodColor,
  getTrendColorClass,
  getMetricCardColors,
  getButtonClasses,
  getAlertClasses,
  getSkeletonClasses,
  cn,
}
