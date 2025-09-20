'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  Clock,
  User,
  MapPin,
  FileText,
  DollarSign,
  ChefHat,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Order, OrderStatus, OrderItem } from '@tabsy/shared-types';
import { format } from 'date-fns';
import { OrderStatusFlow } from './OrderStatusFlow';

interface OrderDetailSlidePanelProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
}

export function OrderDetailSlidePanel({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
}: OrderDetailSlidePanelProps) {
  const [updating, setUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when panel is closed
      document.body.style.overflow = 'unset';
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      await onStatusUpdate(order.id, newStatus);
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case OrderStatus.RECEIVED:
        return OrderStatus.PREPARING;
      case OrderStatus.PREPARING:
        return OrderStatus.READY;
      case OrderStatus.READY:
        return OrderStatus.DELIVERED;
      case OrderStatus.DELIVERED:
        return OrderStatus.COMPLETED;
      default:
        return null;
    }
  };

  const getNextStatusText = (currentStatus: OrderStatus): string => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return '';

    switch (nextStatus) {
      case OrderStatus.PREPARING:
        return 'Start Preparing';
      case OrderStatus.READY:
        return 'Mark Ready';
      case OrderStatus.DELIVERED:
        return 'Mark Delivered';
      case OrderStatus.COMPLETED:
        return 'Complete Order';
      default:
        return '';
    }
  };

  const canUpdateStatus = (status: OrderStatus): boolean => {
    if (!status) return false;
    return ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status);
  };

  const canCancelOrder = (status: OrderStatus): boolean => {
    if (!status) return false;
    return [OrderStatus.RECEIVED, OrderStatus.PREPARING].includes(status);
  };

  const getStatusProgress = (status: OrderStatus): number => {
    switch (status) {
      case OrderStatus.RECEIVED:
        return 20;
      case OrderStatus.PREPARING:
        return 40;
      case OrderStatus.READY:
        return 60;
      case OrderStatus.DELIVERED:
        return 80;
      case OrderStatus.COMPLETED:
        return 100;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.RECEIVED:
        return 'text-primary bg-primary/10';
      case OrderStatus.PREPARING:
        return 'text-amber-600 bg-amber-100';
      case OrderStatus.READY:
        return 'text-green-600 bg-green-100';
      case OrderStatus.DELIVERED:
        return 'text-purple-600 bg-purple-100';
      case OrderStatus.COMPLETED:
        return 'text-muted-foreground bg-muted';
      case OrderStatus.CANCELLED:
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  if (!mounted || !order) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-lg bg-background shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Order #{order.orderNumber}</h2>
              <p className="text-primary-foreground/80 text-sm">
                {format(new Date(order.createdAt), 'PPpp')}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(order.status)}`}
              >
                {order.status?.replace('_', ' ') || 'UNKNOWN'}
              </span>
              <span className="text-primary-foreground/80 text-sm">
                {getStatusProgress(order.status)}% Complete
              </span>
            </div>
            <div className="w-full bg-primary-foreground/20 rounded-full h-2">
              <div
                className="bg-primary-foreground rounded-full h-2 transition-all duration-500 ease-out"
                style={{ width: `${getStatusProgress(order.status)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content - Now with proper flexbox layout */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">Table</p>
                  <p className="font-semibold text-sm text-foreground">
                    {order.tableId ? `Table ${order.tableId.slice(-2)}` : 'No Table'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">Total</p>
                  <p className="font-semibold text-lg text-foreground">
                    ${parseFloat(String(order.total || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">ETA</p>
                  <p className="font-semibold text-sm text-foreground">
                    {order.estimatedPreparationTime || 'N/A'} min
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">Guest</p>
                  <p className="font-semibold text-sm text-foreground">
                    {order.customerName || 'Guest User'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Status Flow */}
          <OrderStatusFlow
            currentStatus={order.status}
            onStatusUpdate={(newStatus) => handleStatusUpdate(newStatus)}
            disabled={updating || !canUpdateStatus(order.status)}
          />

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-warning-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning-foreground mb-1">
                    Special Instructions
                  </p>
                  <p className="text-sm text-foreground">{order.specialInstructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <ChefHat className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Order Items</h3>
            </div>

            <div className="space-y-3">
              {order.items.map((item: OrderItem, index) => (
                <div key={item.id} className="bg-card border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {item.quantity}x {item.menuItem?.name || (item as any).name || 'Unknown Item'}
                      </h4>
                      <p className="text-sm text-foreground/80 mt-1">{item.menuItem?.description || ''}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-semibold text-foreground">
                        ${parseFloat(String(item.subtotal || 0)).toFixed(2)}
                      </p>
                      <p className="text-xs text-foreground/70">
                        ${parseFloat(String(item.price || 0)).toFixed(2)} each
                      </p>
                    </div>
                  </div>

                  {/* Selected Options */}
                  {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                    <div className="mt-2 p-2 bg-muted/50 rounded border-l-2 border-primary/20">
                      <p className="text-xs font-medium text-foreground/90 mb-1">Customizations:</p>
                      {item.options.map((option: any, optionIndex: number) => (
                        <div key={optionIndex} className="text-xs text-foreground/80">
                          <span className="font-medium">{option.optionName || option.name}:</span>
                          {(option.selectedValues || option.values || []).map(
                            (value: any, valueIndex: number) => (
                              <span key={valueIndex} className="ml-1">
                                {value.valueName || value.name || value}
                                {value.priceModifier && value.priceModifier !== 0 && (
                                  <span className="text-foreground/70">
                                    ({value.priceModifier > 0 ? '+' : ''}$
                                    {value.priceModifier.toFixed(2)})
                                  </span>
                                )}
                                {valueIndex <
                                  (option.selectedValues || option.values || []).length - 1 && ', '}
                              </span>
                            ),
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Item Special Instructions */}
                  {item.specialInstructions && (
                    <div className="mt-2 p-2 bg-primary/5 rounded border-l-2 border-primary/20">
                      <p className="text-xs font-medium text-primary">Special Notes:</p>
                      <p className="text-xs text-foreground">{item.specialInstructions}</p>
                    </div>
                  )}

                  {/* Item Status */}
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                        (item.status || 'PENDING') === 'READY'
                          ? 'bg-success/10 text-success-foreground'
                          : (item.status || 'PENDING') === 'PREPARING'
                            ? 'bg-warning/10 text-warning-foreground'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {(item.status || 'PENDING').replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/80">Subtotal:</span>
                <span className="font-medium">
                  ${parseFloat(String(order.subtotal || 0)).toFixed(2)}
                </span>
              </div>
              {parseFloat(String(order.tax || '0')) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/80">Tax:</span>
                  <span className="font-medium">
                    ${parseFloat(String(order.tax || 0)).toFixed(2)}
                  </span>
                </div>
              )}
              {(order.serviceChargeAmount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/80">Service Charge:</span>
                  <span className="font-medium">
                    ${(order.serviceChargeAmount || 0).toFixed(2)}
                  </span>
                </div>
              )}
              {parseFloat(String(order.tip || '0')) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/80">Tip:</span>
                  <span className="font-medium">
                    ${parseFloat(String(order.tip || 0)).toFixed(2)}
                  </span>
                </div>
              )}
              {(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount:</span>
                  <span className="font-medium">-${(order.discountAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>${parseFloat(String(order?.total || '0')).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-background p-4 flex-shrink-0">
          <div className="flex gap-2">
            {canCancelOrder(order.status) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStatusUpdate(OrderStatus.CANCELLED)}
                disabled={updating}
                className="flex-1"
              >
                Cancel Order
              </Button>
            )}

            {canUpdateStatus(order.status) && getNextStatus(order.status) && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(getNextStatus(order.status)!)}
                disabled={updating}
                className="flex-1"
              >
                {updating ? (
                  'Updating...'
                ) : (
                  <>
                    {getNextStatusText(order.status)}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
