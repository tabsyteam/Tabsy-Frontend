'use client';

import { useState } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  ShoppingBag,
  User,
  Store,
  Clock,
  DollarSign,
  Package,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChefHat,
  Truck,
  Receipt,
  Calendar,
  Hash,
  MessageSquare,
  TrendingUp,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Order, OrderStatus, OrderItem, Payment, PaymentStatus } from '@tabsy/shared-types';
import { useUpdateOrderStatus, useOrderPayment } from '@/hooks/api';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onUpdate?: () => void;
}

const statusFlow: OrderStatus[] = [
  OrderStatus.RECEIVED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED
];

export default function OrderDetailsModal({
  order,
  onClose,
  onUpdate
}: OrderDetailsModalProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'timeline' | 'payment'>('details');
  const [notes, setNotes] = useState('');

  const updateOrderStatus = useUpdateOrderStatus();
  const { data: payment } = useOrderPayment(order.id);

  const tabs = [
    { id: 'details', label: 'Details', icon: Package },
    { id: 'items', label: 'Items', icon: ShoppingBag },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'payment', label: 'Payment', icon: CreditCard }
  ];

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      [OrderStatus.RECEIVED]: 'text-status-warning-dark bg-status-warning-light',
      [OrderStatus.PREPARING]: 'text-status-info-dark bg-status-info-light',
      [OrderStatus.READY]: 'text-status-success-dark bg-status-success-light',
      [OrderStatus.DELIVERED]: 'text-status-success-dark bg-status-success-light',
      [OrderStatus.COMPLETED]: 'text-status-success-dark bg-status-success-light',
      [OrderStatus.CANCELLED]: 'text-status-error-dark bg-status-error-light'
    };
    return colors[status] || 'text-content-secondary bg-surface-tertiary';
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons: Record<OrderStatus, any> = {
      [OrderStatus.RECEIVED]: Clock,
      [OrderStatus.PREPARING]: ChefHat,
      [OrderStatus.READY]: Package,
      [OrderStatus.DELIVERED]: Truck,
      [OrderStatus.COMPLETED]: CheckCircle,
      [OrderStatus.CANCELLED]: XCircle
    };
    return icons[status] || AlertCircle;
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: newStatus
      });
      toast.success(`Order status updated to ${newStatus}`);
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleCancelOrder = async () => {
    if (confirm('Are you sure you want to cancel this order?')) {
      await handleStatusUpdate(OrderStatus.CANCELLED);
    }
  };

  const handleRefund = async () => {
    if (confirm('Are you sure you want to refund this order?')) {
      // TODO: Process refund
      toast.success('Refund initiated successfully');
    }
  };

  const StatusIcon = getStatusIcon(order.status);

  // Calculate order progress
  const currentStatusIndex = statusFlow.indexOf(order.status);
  const progressPercentage = order.status === OrderStatus.CANCELLED
    ? 0
    : ((currentStatusIndex + 1) / statusFlow.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-modal animate-fadeIn">
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-5xl max-h-[90vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-tertiary bg-gradient-to-r from-primary-light/10 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-light rounded-lg">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-content-primary">
                Order #{order.id.slice(-8)}
              </h2>
              <div className="flex items-center mt-1 space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  <StatusIcon className="w-4 h-4 mr-1.5" />
                  {order.status.toUpperCase()}
                </span>
                <span className="text-sm text-content-secondary">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {order.createdAt ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-secondary rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-content-secondary" />
          </button>
        </div>

        {/* Order Progress Bar */}
        <div className="px-6 py-4 bg-surface-secondary/50">
          <div className="flex items-center justify-between mb-2">
            {statusFlow.map((status, index) => {
              const Icon = getStatusIcon(status);
              const isActive = index <= currentStatusIndex;
              const isCurrent = status === order.status;

              return (
                <div key={status} className="flex items-center flex-1">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground' :
                      'bg-surface-tertiary text-content-tertiary'
                    } ${isCurrent ? 'ring-4 ring-primary-light' : ''}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap ${
                      isActive ? 'text-content-primary font-medium' : 'text-content-tertiary'
                    }`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                  {index < statusFlow.length - 1 && (
                    <div className="flex-1 h-1 mx-2">
                      <div className="h-full bg-surface-tertiary rounded">
                        <div
                          className="h-full bg-primary rounded transition-all duration-500"
                          style={{ width: isActive ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
          <div className="px-6 py-3 border-b border-border-tertiary flex gap-2">
            {order.status === OrderStatus.RECEIVED && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(OrderStatus.PREPARING)}
                className="btn-professional hover-lift"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Order
              </Button>
            )}
            {order.status === OrderStatus.PREPARING && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(OrderStatus.READY)}
                className="btn-professional hover-lift"
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Start Preparing
              </Button>
            )}
            {order.status === OrderStatus.READY && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(OrderStatus.DELIVERED)}
                className="btn-professional hover-lift"
              >
                <Package className="h-4 w-4 mr-2" />
                Mark as Ready
              </Button>
            )}
            {order.status === OrderStatus.DELIVERED && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(OrderStatus.COMPLETED)}
                className="btn-professional hover-lift"
              >
                <Truck className="h-4 w-4 mr-2" />
                Mark as Delivered
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelOrder}
              className="hover-lift text-status-error border-status-error-border hover:bg-status-error-light"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border-tertiary">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-content-secondary hover:text-content-primary'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[400px]">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  Customer Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-content-secondary">Guest Name</p>
                    <p className="text-sm font-medium text-content-primary">
                      {order.customerName || 'Guest User'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Session ID</p>
                    <p className="text-sm text-content-primary font-mono">
                      {order.guestSessionId ? `${order.guestSessionId.slice(0, 8)}...` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Email</p>
                    <p className="text-sm text-content-primary">
                      {order.customerEmail || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Phone</p>
                    <p className="text-sm text-content-primary">
                      {order.customerPhone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Table</p>
                    <p className="text-sm font-medium text-content-primary">
                      Table {order.tableId || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Restaurant Information */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <Store className="h-4 w-4 mr-2 text-primary" />
                  Restaurant Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-content-secondary">Name</p>
                    <p className="text-sm font-medium text-content-primary">
                      Restaurant ID: {order.restaurantId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Address</p>
                    <p className="text-sm text-content-primary">
                      Not available
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Phone</p>
                    <p className="text-sm text-content-primary">
                      Not available
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <Receipt className="h-4 w-4 mr-2 text-primary" />
                  Order Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Subtotal</span>
                    <span className="text-sm font-medium text-content-primary">
                      ${Number(order.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Tax</span>
                    <span className="text-sm text-content-primary">
                      ${Number(order.tax || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Service Fee</span>
                    <span className="text-sm text-content-primary">
                      ${Number(order.serviceChargeAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Tip</span>
                    <span className="text-sm text-content-primary">
                      ${Number(order.tip || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border-tertiary flex justify-between">
                    <span className="text-sm font-medium text-content-primary">Total</span>
                    <span className="text-lg font-bold text-primary">
                      ${Number(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              {false && (
                <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                  <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                    Special Instructions
                  </h3>
                  <p className="text-sm text-content-secondary">
                    No notes available
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-3">
              {order.items?.map((item: OrderItem, index: number) => (
                <div key={index} className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-content-primary mr-2">
                          {item.quantity}x
                        </span>
                        <span className="text-sm font-medium text-content-primary">
                          {item.menuItem?.name}
                        </span>
                      </div>
                      {item.menuItem?.categoryName && (
                        <p className="text-xs text-content-secondary mt-0.5">
                          Category: {item.menuItem.categoryName}
                        </p>
                      )}
                      {item.menuItem?.description && (
                        <p className="text-xs text-content-secondary mt-1">
                          {item.menuItem.description}
                        </p>
                      )}
                      {item.options && item.options.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-content-tertiary mb-1">Options:</p>
                          <div className="text-xs">
                            {item.options.map((option: any, idx: number) => (
                              <div key={idx} className="text-content-secondary">
                                • <span className="font-medium">{option.optionName || option.name}:</span>{' '}
                                <span>{option.valueName || option.value || option.choice}</span>
                                {option.price > 0 && (
                                  <span className="ml-1 text-content-tertiary">(+${option.price.toFixed(2)})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.specialInstructions && (
                        <p className="text-xs text-content-secondary mt-2 italic">
                          Special Instructions: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-content-primary">
                        ${(Number(item.price || 0) * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-xs text-content-secondary">
                        ${Number(item.price || 0).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-6 bottom-0 w-0.5 bg-border-tertiary"></div>

                {/* Timeline events */}
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-success-light rounded-full">
                      <CheckCircle className="h-4 w-4 text-status-success-dark" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-content-primary">Order Placed</p>
                      <p className="text-xs text-content-secondary">
                        {order.createdAt ? format(new Date(order.createdAt), 'PPp') : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {order.status !== OrderStatus.RECEIVED && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-info-light rounded-full">
                        <CheckCircle className="h-4 w-4 text-status-info-dark" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Order Confirmed</p>
                        <p className="text-xs text-content-secondary">By restaurant staff</p>
                      </div>
                    </div>
                  )}

                  {[OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(order.status) && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-info-light rounded-full">
                        <ChefHat className="h-4 w-4 text-status-info-dark" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Preparation Started</p>
                        <p className="text-xs text-content-secondary">Kitchen received the order</p>
                      </div>
                    </div>
                  )}

                  {[OrderStatus.READY, OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(order.status) && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-success-light rounded-full">
                        <Package className="h-4 w-4 text-status-success-dark" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Order Ready</p>
                        <p className="text-xs text-content-secondary">Ready for pickup/delivery</p>
                      </div>
                    </div>
                  )}

                  {order.status === OrderStatus.CANCELLED && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-error-light rounded-full">
                        <XCircle className="h-4 w-4 text-status-error-dark" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Order Cancelled</p>
                        <p className="text-xs text-content-secondary">Cancelled by customer/restaurant</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-primary" />
                  Payment Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Payment Method</span>
                    <span className="text-sm font-medium text-content-primary">
                      {payment?.method || 'CARD'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Payment Status</span>
                    <span className={`text-sm font-medium ${
                      payment?.status === PaymentStatus.COMPLETED ? 'text-status-success-dark' : 'text-status-warning-dark'
                    }`}>
                      {payment?.status || PaymentStatus.PENDING}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Transaction ID</span>
                    <span className="text-sm font-mono text-content-primary">
                      {payment?.transactionId || order.id.slice(-12)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Amount Paid</span>
                    <span className="text-lg font-bold text-primary">
                      ${Number(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {order.status === OrderStatus.COMPLETED && (
                  <div className="mt-4 pt-4 border-t border-border-tertiary">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefund}
                      className="w-full hover-lift"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Process Refund
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}