'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  CheckCircle,
  ChefHat,
  Bell,
  Utensils,
  Receipt,
  ArrowRight,
  AlertCircle,
  User
} from 'lucide-react'
import { OrderStatus, type Order } from '@tabsy/shared-types'
import { useRestaurantOptional } from '@/contexts/RestaurantContext'
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface OrderCardProps {
  order: Order & { restaurantName?: string }
  onClick: (orderId: string) => void
  showCustomer?: boolean
  className?: string
}

const ORDER_STATUS_CONFIG = {
  [OrderStatus.RECEIVED]: {
    label: 'Order Received',
    icon: Receipt,
    color: 'text-status-info',
    bgColor: 'bg-status-info-light',
    borderColor: 'border-status-info',
    stripeColor: 'bg-status-info',
    description: 'Order confirmed'
  },
  [OrderStatus.PREPARING]: {
    label: 'Preparing',
    icon: ChefHat,
    color: 'text-accent',
    bgColor: 'bg-accent-light',
    borderColor: 'border-accent',
    stripeColor: 'bg-accent',
    description: 'Being prepared'
  },
  [OrderStatus.READY]: {
    label: 'Ready',
    icon: Bell,
    color: 'text-secondary',
    bgColor: 'bg-secondary-light',
    borderColor: 'border-secondary',
    stripeColor: 'bg-secondary',
    description: 'Ready for pickup'
  },
  [OrderStatus.DELIVERED]: {
    label: 'Delivered',
    icon: Utensils,
    color: 'text-status-success',
    bgColor: 'bg-status-success-light',
    borderColor: 'border-status-success',
    stripeColor: 'bg-status-success',
    description: 'Delivered to table'
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-status-success',
    bgColor: 'bg-status-success-light',
    borderColor: 'border-status-success',
    stripeColor: 'bg-status-success',
    description: 'Order complete'
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: AlertCircle,
    color: 'text-status-error',
    bgColor: 'bg-status-error-light',
    borderColor: 'border-status-error',
    stripeColor: 'bg-status-error',
    description: 'Order cancelled'
  }
} as const

const DEFAULT_STATUS_CONFIG = {
  label: 'Unknown Status',
  icon: AlertCircle,
  color: 'text-content-secondary',
  bgColor: 'bg-surface-secondary',
  borderColor: 'border-default',
  stripeColor: 'bg-content-tertiary',
  description: 'Status unknown'
}

export function OrderCard({ order, onClick, showCustomer = false, className = '' }: OrderCardProps) {
  const statusConfig = ORDER_STATUS_CONFIG[order.status] || DEFAULT_STATUS_CONFIG
  const StatusIcon = statusConfig.icon

  const restaurantContext = useRestaurantOptional()
  const currency = (restaurantContext?.currency as CurrencyCode) || 'USD'

  // Use shared utility for consistent formatting
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return formatPriceUtil(numPrice, currency)
  }

  const getTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  }

  const isActive = ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(order.id)}
      className={`
        relative bg-surface rounded-xl border cursor-pointer
        hover:shadow-md transition-all duration-200 overflow-hidden
        ${className}
      `}
    >
      {/* Status Stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.stripeColor}`} />

      <div className="p-4 pl-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Status Icon */}
            <div className={`w-10 h-10 rounded-full ${statusConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
            </div>

            {/* Order Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-content-primary truncate">
                Order #{order.orderNumber}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-content-secondary">
                <span className={`font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <span>•</span>
                <span>{getTimeAgo(order.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0 ml-3">
            <div className="text-lg font-semibold text-content-primary">
              {formatPrice(order.total)}
            </div>
            {isActive && order.estimatedPreparationTime && (
              <div className="flex items-center text-xs text-content-tertiary">
                <Clock className="w-3 h-3 mr-1" />
                {order.estimatedPreparationTime} min
              </div>
            )}
          </div>
        </div>

        {/* Customer Name (for table orders) */}
        {showCustomer && order.customerName && (
          <div className="flex items-center text-sm text-content-secondary mb-2">
            <User className="w-3 h-3 mr-1.5" />
            <span>by {order.customerName}</span>
          </div>
        )}

        {/* Restaurant Name */}
        {order.restaurantName && (
          <div className="text-sm text-content-secondary mb-3">
            {order.restaurantName}
          </div>
        )}

        {/* Items Summary */}
        <div className="mb-3">
          <div className="text-sm text-content-secondary mb-1">
            {order.items.length} item{order.items.length > 1 ? 's' : ''}:
          </div>
          <div className="text-sm text-content-primary">
            {order.items.map(item =>
              `${item.quantity}× ${item.menuItem?.name || (item as any).name || 'Unknown Item'}`
            ).join(', ')}
          </div>
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="mb-3 p-2 bg-surface-secondary rounded-lg">
            <div className="text-xs text-content-secondary mb-1">Special Instructions:</div>
            <div className="text-sm text-content-primary">{order.specialInstructions}</div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-content-tertiary">
            {statusConfig.description}
          </span>
          <ArrowRight className="w-4 h-4 text-content-tertiary" />
        </div>

        {/* Pulse Animation for Active Orders */}
        {isActive && order.status === OrderStatus.PREPARING && (
          <motion.div
            className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-xl border-2 border-status-warning"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>
    </motion.div>
  )
}