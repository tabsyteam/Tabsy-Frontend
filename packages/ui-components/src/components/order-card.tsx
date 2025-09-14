import * as React from 'react'
import { Order, OrderStatus } from '@tabsy/shared-types'
import { formatCurrency, formatDateTime } from '@tabsy/shared-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface OrderCardProps {
  order: Order
  onViewDetails?: (order: Order) => void
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void
  showActions?: boolean
  className?: string
}

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.RECEIVED]: 'bg-blue-100 text-blue-800',
  [OrderStatus.PREPARING]: 'bg-amber-100 text-amber-800',
  [OrderStatus.READY]: 'bg-green-100 text-green-800',
  [OrderStatus.DELIVERED]: 'bg-purple-100 text-purple-800',
  [OrderStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800'
}

export const OrderCard = React.forwardRef<HTMLDivElement, OrderCardProps>(
  ({ order, onViewDetails, onUpdateStatus, showActions = true, className }, ref) => {
    const handleViewDetails = () => {
      if (onViewDetails) {
        onViewDetails(order)
      }
    }

    const handleStatusUpdate = (status: OrderStatus) => {
      if (onUpdateStatus) {
        onUpdateStatus(order.id, status)
      }
    }

    const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
      const statusFlow: Record<OrderStatus, OrderStatus | null> = {
        [OrderStatus.RECEIVED]: OrderStatus.PREPARING,
        [OrderStatus.PREPARING]: OrderStatus.READY,
        [OrderStatus.READY]: OrderStatus.DELIVERED,
        [OrderStatus.DELIVERED]: OrderStatus.COMPLETED,
        [OrderStatus.COMPLETED]: null,
        [OrderStatus.CANCELLED]: null
      }
      return statusFlow[currentStatus]
    }

    const nextStatus = getNextStatus(order.status)

    return (
      <Card ref={ref} className={className}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
              <CardDescription>
                Table: {order.tableId || 'N/A'} • {formatDateTime(order.createdAt)}
              </CardDescription>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-2 ${statusColors[order.status]}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-lg">
                {formatCurrency(order.totalAmount || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </CardHeader>
        {showActions && (
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
                className="flex-1"
              >
                View Details
              </Button>
              {nextStatus && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate(nextStatus)}
                  className="flex-1"
                >
                  Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }
)
OrderCard.displayName = "OrderCard"
