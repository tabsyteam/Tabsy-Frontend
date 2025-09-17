'use client'

import { useEffect, useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, Timer, Users, MapPin } from 'lucide-react'
import { Order, OrderStatus, OrderItem, OrderItemStatus } from '@tabsy/shared-types'
import { formatDistanceToNow } from 'date-fns'

interface OrderCardProps {
  order: Order
  onStatusUpdate: (orderId: string, status: OrderStatus) => void
  onViewDetails: (order: Order) => void
}

export function OrderCard({ order, onStatusUpdate, onViewDetails }: OrderCardProps) {
  const [timeAgo, setTimeAgo] = useState('')
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }))
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [order.createdAt])

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.RECEIVED:
        return 'bg-primary/10 text-primary border-primary/20'
      case OrderStatus.PREPARING:
        return 'bg-status-warning-light text-status-warning-dark border-status-warning-border'
      case OrderStatus.READY:
        return 'bg-status-success-light text-status-success-dark border-status-success-border'
      case OrderStatus.DELIVERED:
        return 'bg-secondary-light text-secondary-dark border-secondary/20'
      case OrderStatus.COMPLETED:
        return 'bg-surface-tertiary text-content-secondary border-border-secondary'
      case OrderStatus.CANCELLED:
        return 'bg-status-error-light text-status-error-dark border-status-error-border'
      default:
        return 'bg-surface-tertiary text-content-secondary border-border-secondary'
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.RECEIVED:
        return <CheckCircle className="w-3 h-3" />
      case OrderStatus.PREPARING:
        return <AlertCircle className="w-3 h-3" />
      case OrderStatus.READY:
        return <CheckCircle className="w-3 h-3" />
      case OrderStatus.DELIVERED:
      case OrderStatus.COMPLETED:
        return <CheckCircle className="w-3 h-3" />
      case OrderStatus.CANCELLED:
        return <XCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case OrderStatus.RECEIVED:
        return OrderStatus.PREPARING
      case OrderStatus.PREPARING:
        return OrderStatus.READY
      case OrderStatus.READY:
        return OrderStatus.DELIVERED
      case OrderStatus.DELIVERED:
        return OrderStatus.COMPLETED
      default:
        return null
    }
  }

  const getNextStatusText = (currentStatus: OrderStatus): string => {
    const nextStatus = getNextStatus(currentStatus)
    if (!nextStatus) return ''

    switch (nextStatus) {
      case OrderStatus.PREPARING:
        return 'Start Preparing'
      case OrderStatus.READY:
        return 'Mark Ready'
      case OrderStatus.DELIVERED:
        return 'Mark Delivered'
      case OrderStatus.COMPLETED:
        return 'Complete Order'
      default:
        return ''
    }
  }

  const getTotalItemCount = (): number => {
    return order.items.reduce((total: number, item: OrderItem) => total + item.quantity, 0)
  }

  const canUpdateStatus = (status: OrderStatus): boolean => {
    return ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status)
  }

  // Helper function to get table display
  const getTableDisplay = (): string => {
    // We'll need to fetch table info separately since Order only has tableId
    return order.tableId ? `Table ${order.tableId.slice(-2)}` : 'No Table'
  }

  const canCancelOrder = (status: OrderStatus): boolean => {
    return [OrderStatus.RECEIVED, OrderStatus.PREPARING].includes(status)
  }

  const formatTimeAgo = (timeStr: string): string => {
    // Convert "about 8 hours ago" -> "8h ago"
    // Convert "5 minutes ago" -> "5m ago"
    return timeStr
      .replace('about ', '')
      .replace(' hours ago', 'h ago')
      .replace(' hour ago', 'h ago')
      .replace(' minutes ago', 'm ago')
      .replace(' minute ago', 'm ago')
      .replace(' days ago', 'd ago')
      .replace(' day ago', 'd ago')
  }

  return (
    <div
      className={`group flex flex-col bg-card rounded-lg border p-4 shadow-sm transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] min-h-[320px] cursor-pointer relative overflow-hidden ${order.status === OrderStatus.RECEIVED ? 'ring-2 ring-primary/50 border-primary/40 m-0.5 hover:ring-primary/70' : 'hover:border-primary/30'
        }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Order Header - Order Number and Price */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-md text-card-foreground group-hover:text-primary transition-colors duration-200">
            #{order.orderNumber}
          </h3>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl text-card-foreground group-hover:text-primary transition-colors duration-200">
            ${parseFloat(String(order.total || 0)).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Status Badge Row */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${order.status ? getStatusColor(order.status) : 'bg-muted text-muted-foreground border-border'}`}>
          {order.status ? getStatusIcon(order.status) : <span className="w-3 h-3">?</span>}
          <span className="ml-1">{order.status?.replace('_', ' ') || 'UNKNOWN'}</span>
        </span>
        {order.estimatedPreparationTime && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              ETA: {order.estimatedPreparationTime}m
            </span>
          </div>
        )}
      </div>

      {/* Metadata Row - Responsive Grid Layout */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-3 text-xs text-foreground/80">
        <div className="flex items-center gap-1 min-w-0">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium truncate">{getTableDisplay()}</span>
        </div>
        <div className="flex items-center gap-1 justify-center min-w-0">
          <Users className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium truncate">{getTotalItemCount()}x</span>
        </div>
        <div className="flex items-center gap-1 justify-end min-w-0">
          <Timer className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium truncate">{formatTimeAgo(timeAgo)}</span>
        </div>
      </div>


      {/* Order Items Preview - Now with flex-1 to take remaining space */}
      <div className="flex-1 mb-4 min-h-[80px]">
        <div className="bg-muted/30 rounded-md p-3 space-y-2 h-full group-hover:bg-muted/40 transition-colors duration-200">
            {order.items.slice(0, 2).map((item: OrderItem, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-card-foreground font-medium truncate flex-1 mr-2">
                  {item.quantity}x {item.menuItem?.name || (item as any).name || 'Unknown Item'}
                </span>
                <span className="font-bold text-card-foreground flex-shrink-0">
                  ${parseFloat(String(item.subtotal || 0)).toFixed(2)}
                </span>
              </div>
            ))}
            {order.items.length > 2 && (
              <div className="text-sm text-muted-foreground pt-1 border-t border-border font-medium">
                +{order.items.length - 2} more items
              </div>
            )}
        </div>
      </div>


      {/* Action Buttons - Always at bottom */}
      <div className="flex justify-center gap-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(order)}
            className="flex-1 text-xs h-8 font-medium border-text-foreground hover:border-primary hover:text-primary hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <Eye className="h-3 w-3 mr-1" />
            Details
          </Button>

          {order.status && canUpdateStatus(order.status) && getNextStatus(order.status) && (
            <Button
              size="sm"
              onClick={() => order.status && onStatusUpdate(order.id, getNextStatus(order.status)!)}
              className="flex-1 text-xs h-8 font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              {order.status ? getNextStatusText(order.status) : 'Update'}
            </Button>
          )}

          {order.status && canCancelOrder(order.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onStatusUpdate(order.id, OrderStatus.CANCELLED)}
              className="flex-1 text-xs h-8 px-3 font-medium flex-shrink-0 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              Cancel
            </Button>
          )}

        </div>

    </div>
  )
}