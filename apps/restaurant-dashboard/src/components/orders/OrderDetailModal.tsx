'use client'

import { useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { X, Clock, User, MapPin, FileText, DollarSign } from 'lucide-react'
import { Order, OrderStatus, OrderItem } from '@tabsy/shared-types'
import { format } from 'date-fns'
import { CustomizationList } from '@tabsy/ui-components'

interface OrderDetailModalProps {
  order: Order
  onClose: () => void
  onStatusUpdate: (orderId: string, status: OrderStatus) => void
}

export function OrderDetailModal({ order, onClose, onStatusUpdate }: OrderDetailModalProps) {
  const [updating, setUpdating] = useState(false)

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setUpdating(true)
    try {
      await onStatusUpdate(order.id, newStatus)
      // Modal will automatically update when parent component updates the order
    } catch (err) {
      console.error('Failed to update order status:', err)
    } finally {
      setUpdating(false)
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

  const canUpdateStatus = (status: OrderStatus): boolean => {
    return ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status)
  }

  const canCancelOrder = (status: OrderStatus): boolean => {
    return [OrderStatus.RECEIVED, OrderStatus.PREPARING].includes(status)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-content-primary">
                Order #{order.orderNumber}
              </h2>
              <p className="text-sm text-content-secondary">
                {format(new Date(order.createdAt), 'PPpp')}
              </p>
            </div>
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-content-disabled" />
                  <div>
                    <p className="text-sm text-content-secondary">Table</p>
                    <p className="font-medium">
                      {order.tableId ? `Table ${order.tableId.slice(-2)}` : 'No Table'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-content-disabled" />
                  <div>
                    <p className="text-sm text-content-secondary">Guest</p>
                    <p className="font-medium">
                      {order.customerName || 'Guest User'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-content-disabled" />
                  <div>
                    <p className="text-sm text-content-secondary">Preparation Time</p>
                    <p className="font-medium">{order.estimatedPreparationTime} minutes</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-content-disabled" />
                  <div>
                    <p className="text-sm text-content-secondary">Order Type</p>
                    <p className="font-medium">{(order.type || 'Dine In').replace('_', ' ')}</p>
                  </div>
                </div>

                {order.specialInstructions && (
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-content-disabled mt-0.5" />
                    <div>
                      <p className="text-sm text-content-secondary">Special Instructions</p>
                      <p className="font-medium">{order.specialInstructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-content-primary mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item: OrderItem) => (
                  <div key={item.id} className="bg-surface-secondary rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-content-primary">
                          {item.quantity}x {item.menuItem?.name || (item as any).name || 'Unknown Item'}
                        </h4>
                        {item.menuItem?.categoryName && (
                          <p className="text-xs text-content-tertiary mt-0.5">
                            Category: {item.menuItem.categoryName}
                          </p>
                        )}
                        <p className="text-sm text-content-secondary mt-1">
                          {item.menuItem?.description || ''}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold">${parseFloat(String(item.subtotal || 0)).toFixed(2)}</p>
                        <p className="text-xs text-content-tertiary">
                          ${parseFloat(String(item.price || 0)).toFixed(2)} each
                        </p>
                      </div>
                    </div>

                    {/* Customizations */}
                    {item.options && (
                      <div className="mt-2">
                        <CustomizationList
                          customizations={item.options}
                          compact={false}
                          showPrices={true}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {/* Item Special Instructions */}
                    {item.specialInstructions && (
                      <div className="mt-2 text-xs text-content-secondary">
                        <span className="font-medium">Instructions:</span> {item.specialInstructions}
                      </div>
                    )}

                    {/* Item Status */}
                    <div className="mt-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        (item.status || 'RECEIVED') === 'READY' ? 'bg-status-success-light text-status-success-dark' : 
                        (item.status || 'RECEIVED') === 'PREPARING' ? 'bg-status-warning-light text-status-warning-dark' :
                        'bg-surface-tertiary text-content-primary'
                      }`}>
                        {(item.status || 'RECEIVED').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-surface-secondary rounded-lg p-4">
              <h3 className="text-lg font-semibold text-content-primary mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${parseFloat(String(order.subtotal || 0)).toFixed(2)}</span>
                </div>
                {parseFloat(String(order.tax || '0')) > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${parseFloat(String(order.tax || 0)).toFixed(2)}</span>
                  </div>
                )}
                {(order.serviceChargeAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span>${(order.serviceChargeAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(String(order.tip || '0')) > 0 && (
                  <div className="flex justify-between">
                    <span>Tip:</span>
                    <span>${parseFloat(String(order.tip || 0)).toFixed(2)}</span>
                  </div>
                )}
                {(order.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-status-success">
                    <span>Discount:</span>
                    <span>-${(order.discountAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${parseFloat(String(order?.total || '0')).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center p-6 border-t bg-surface-secondary">
            <div>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                order.status === OrderStatus.RECEIVED ? 'bg-primary/10 text-primary' :
                order.status === OrderStatus.PREPARING ? 'bg-status-warning-light text-status-warning-dark' :
                order.status === OrderStatus.READY ? 'bg-status-success-light text-status-success-dark' :
                order.status === OrderStatus.DELIVERED ? 'bg-secondary/10 text-secondary-dark' :
                order.status === OrderStatus.COMPLETED ? 'bg-surface-tertiary text-content-primary' :
                'bg-surface-tertiary text-content-primary'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex space-x-3">
              {canCancelOrder(order.status) && (
                <Button
                  variant="destructive"
                  onClick={() => handleStatusUpdate(OrderStatus.CANCELLED)}
                  disabled={updating}
                >
                  Cancel Order
                </Button>
              )}
              
              {canUpdateStatus(order.status) && getNextStatus(order.status) && (
                <Button
                  onClick={() => handleStatusUpdate(getNextStatus(order.status)!)}
                  disabled={updating}
                >
                  {updating ? 'Updating...' : getNextStatusText(order.status)}
                </Button>
              )}
              
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}