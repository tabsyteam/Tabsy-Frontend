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
        return 'bg-primary/10 text-primary border-primary/30'
      case OrderStatus.PREPARING:
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case OrderStatus.READY:
        return 'bg-green-100 text-green-800 border-green-300'
      case OrderStatus.DELIVERED:
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case OrderStatus.COMPLETED:
        return 'bg-slate-100 text-slate-800 border-slate-300'
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300'
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

  return (
    <div
      className={`flex flex-col bg-card rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-md h-full ${order.status === OrderStatus.RECEIVED ? 'ring-2 ring-primary/50 border-primary/40' : ''
        }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Order Header - Order Number and Price */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-md text-card-foreground">
            #{order.orderNumber}
          </h3>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl text-card-foreground">
            ${parseFloat(String(order.total || 0)).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Status Badge Row */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${getStatusColor(order.status)}`}>
          {getStatusIcon(order.status)}
          <span className="ml-1">{order.status.replace('_', ' ')}</span>
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

      {/* Table and Items Info Row */}
      <div className="flex items-center justify-between mb-3 text-sm text-foreground/80">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="font-medium">{getTableDisplay()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="font-medium">{getTotalItemCount()} items</span>
        </div>
        <div className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          <span className="font-medium">{timeAgo}</span>
        </div>
      </div>


      {/* Order Items Preview - Now with flex-1 to take remaining space */}
      <div className="flex-1 mb-4">
        <div className="bg-muted/30 rounded-md p-3 space-y-2">
            {order.items.slice(0, 2).map((item: OrderItem, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-card-foreground font-medium truncate flex-1 mr-2">
                  {item.quantity}x {item.menuItem.name}
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
            className="flex-1 text-xs h-8 font-medium border-text-foreground hover:border-text-foreground/80"
          >
            <Eye className="h-3 w-3 mr-1" />
            Details
          </Button>

          {canUpdateStatus(order.status) && getNextStatus(order.status) && (
            <Button
              size="sm"
              onClick={() => onStatusUpdate(order.id, getNextStatus(order.status)!)}
              className="flex-1 text-xs h-8 font-medium"
            >
              {getNextStatusText(order.status)}
            </Button>
          )}

          {canCancelOrder(order.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onStatusUpdate(order.id, OrderStatus.CANCELLED)}
              className="flex-1 text-xs h-8 px-3 font-medium flex-shrink-0"
            >
              Cancel
            </Button>
          )}

        </div>

    </div>
  )
}