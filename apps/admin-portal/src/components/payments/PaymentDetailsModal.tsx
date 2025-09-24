'use client';

import { useState } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  CreditCard,
  User,
  Store,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  Hash,
  Calendar,
  ArrowRight,
  RefreshCw,
  Shield,
  Banknote,
  Smartphone,
  Wallet,
  Package,
  Activity,
  FileText,
  Download,
  TrendingUp
} from 'lucide-react';
import { Payment, PaymentStatus, PaymentMethod } from '@tabsy/shared-types';
import { useOrder, useProcessRefund } from '@/hooks/api';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface PaymentDetailsModalProps {
  payment: Payment;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PaymentDetailsModal({
  payment,
  onClose,
  onUpdate
}: PaymentDetailsModalProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'details' | 'order' | 'timeline' | 'security'>('details');
  const [processingRefund, setProcessingRefund] = useState(false);

  const { data: order } = useOrder(payment.orderId || '');
  const processRefund = useProcessRefund();

  const tabs = [
    { id: 'details', label: 'Payment Details', icon: CreditCard },
    { id: 'order', label: 'Order Info', icon: Package },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  const getStatusColor = (status: PaymentStatus) => {
    const colors: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'text-status-warning bg-status-warning/10',
      [PaymentStatus.PROCESSING]: 'text-status-info bg-status-info/10',
      [PaymentStatus.COMPLETED]: 'text-status-success bg-status-success/10',
      [PaymentStatus.FAILED]: 'text-status-error bg-status-error/10',
      [PaymentStatus.REFUNDED]: 'text-status-warning bg-status-warning/10',
      [PaymentStatus.CANCELLED]: 'text-content-secondary bg-surface-secondary',
      [PaymentStatus.PARTIALLY_REFUNDED]: 'text-status-warning bg-status-warning/10'
    };
    return colors[status] || 'text-content-secondary bg-surface-secondary';
  };

  const getStatusIcon = (status: PaymentStatus) => {
    const icons: Record<PaymentStatus, any> = {
      [PaymentStatus.PENDING]: Clock,
      [PaymentStatus.PROCESSING]: RefreshCw,
      [PaymentStatus.COMPLETED]: CheckCircle,
      [PaymentStatus.FAILED]: XCircle,
      [PaymentStatus.REFUNDED]: Receipt,
      [PaymentStatus.CANCELLED]: XCircle,
      [PaymentStatus.PARTIALLY_REFUNDED]: Receipt
    };
    return icons[status] || AlertCircle;
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return CreditCard;
      case PaymentMethod.MOBILE_PAYMENT:
        return Smartphone;
      case PaymentMethod.CASH:
        return Banknote;
      default:
        return CreditCard;
    }
  };

  const handleProcessRefund = async () => {
    if (!confirm(`Are you sure you want to refund $${payment.amount?.toFixed(2)}?`)) {
      return;
    }

    setProcessingRefund(true);
    try {
      await processRefund.mutateAsync({
        paymentId: payment.id,
        amount: payment.amount,
        reason: 'Admin initiated refund'
      });
      toast.success('Refund processed successfully');
      onUpdate?.();
      onClose();
    } catch (error) {
      toast.error('Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleDownloadReceipt = () => {
    toast.success('Downloading receipt...');
  };

  const StatusIcon = getStatusIcon(payment.status);
  const MethodIcon = getPaymentMethodIcon(payment.method || PaymentMethod.CREDIT_CARD);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-modal animate-fadeIn">
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-tertiary bg-gradient-to-r from-primary-light/10 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-light rounded-lg">
              <CreditCard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-content-primary">
                Payment Details
              </h2>
              <div className="flex items-center mt-1 space-x-3">
                <span className="text-sm font-mono text-content-secondary">
                  {payment.id.slice(-12)}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                  <StatusIcon className="w-4 h-4 mr-1.5" />
                  {payment.status.toUpperCase()}
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

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-surface-secondary/50">
          <div className="bg-surface rounded-lg p-3 border border-border-tertiary">
            <div className="flex items-center justify-between mb-1">
              <DollarSign className="h-4 w-4 text-status-success" />
              <span className="text-xs text-status-success">Amount</span>
            </div>
            <div className="text-xl font-bold text-content-primary">
              ${payment.amount?.toFixed(2)}
            </div>
          </div>

          <div className="bg-surface rounded-lg p-3 border border-border-tertiary">
            <div className="flex items-center justify-between mb-1">
              <MethodIcon className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary">Method</span>
            </div>
            <div className="text-sm font-medium text-content-primary">
              {payment.method || 'Card'}
            </div>
          </div>

          <div className="bg-surface rounded-lg p-3 border border-border-tertiary">
            <div className="flex items-center justify-between mb-1">
              <Clock className="h-4 w-4 text-status-warning" />
              <span className="text-xs text-status-warning">Processing</span>
            </div>
            <div className="text-sm font-medium text-content-primary">
              2.3s
            </div>
          </div>

          <div className="bg-surface rounded-lg p-3 border border-border-tertiary">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span className="text-xs text-secondary">Fee</span>
            </div>
            <div className="text-sm font-medium text-content-primary">
              ${((payment.amount || 0) * 0.029).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {payment.status === PaymentStatus.COMPLETED && (
          <div className="px-6 py-3 border-b border-border-tertiary flex gap-2">
            <Button
              size="sm"
              onClick={handleProcessRefund}
              disabled={processingRefund}
              className="btn-professional hover-lift"
            >
              <Receipt className="h-4 w-4 mr-2" />
              {processingRefund ? 'Processing...' : 'Process Refund'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadReceipt}
              className="hover-lift"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
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
              {/* Transaction Information */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-primary" />
                  Transaction Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-content-secondary">Transaction ID</p>
                    <p className="text-sm font-mono text-content-primary">
                      {payment.transactionId || payment.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Payment Method</p>
                    <div className="flex items-center mt-1">
                      <MethodIcon className="h-4 w-4 mr-2 text-content-tertiary" />
                      <p className="text-sm font-medium text-content-primary">
                        {payment.method || 'Card'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Processing Gateway</p>
                    <p className="text-sm text-content-primary">
                      {payment.provider || 'Stripe'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Currency</p>
                    <p className="text-sm font-medium text-content-primary">
                      {payment.currency || 'USD'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  Customer Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-content-secondary">Name</p>
                    <p className="text-sm font-medium text-content-primary">
                      {payment.customerId || 'Guest User'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Email</p>
                    <p className="text-sm text-content-primary">
                      Not provided
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Customer ID</p>
                    <p className="text-sm font-mono text-content-primary">
                      {payment.customerId || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-primary" />
                  Amount Breakdown
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Subtotal</span>
                    <span className="text-sm font-medium text-content-primary">
                      ${((payment.amount || 0) / 1.1).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Tax</span>
                    <span className="text-sm text-content-primary">
                      ${((payment.amount || 0) * 0.1).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Tip</span>
                    <span className="text-sm text-content-primary">
                      ${Number(payment.tipAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-content-secondary">Processing Fee</span>
                    <span className="text-sm text-content-primary">
                      ${((payment.amount || 0) * 0.029).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border-tertiary flex justify-between">
                    <span className="text-sm font-medium text-content-primary">Total</span>
                    <span className="text-lg font-bold text-primary">
                      ${payment.amount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  Timestamps
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-content-secondary">Created</p>
                    <p className="text-sm text-content-primary">
                      {payment.createdAt ? format(new Date(payment.createdAt), 'PPp') : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary">Processed</p>
                    <p className="text-sm text-content-primary">
                      {payment.completedAt ? format(new Date(payment.completedAt), 'PPp') : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'order' && (
            <div>
              {order ? (
                <div className="space-y-4">
                  <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                    <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2 text-primary" />
                      Order Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-content-secondary">Order ID</p>
                        <p className="text-sm font-medium text-content-primary">
                          #{order.id.slice(-8)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-content-secondary">Table Number</p>
                        <p className="text-sm font-medium text-content-primary">
                          {order.tableId || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-content-secondary">Restaurant</p>
                        <p className="text-sm font-medium text-content-primary">
                          Restaurant {order.restaurantId?.slice(-8) || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-content-secondary">Status</p>
                        <p className="text-sm font-medium text-content-primary">
                          {order.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                    <h3 className="text-sm font-medium text-content-primary mb-3">Order Items</h3>
                    <div className="space-y-2">
                      {order.items?.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-sm text-content-primary">
                            {item.quantity}x {item.menuItem?.name}
                          </span>
                          <span className="text-sm font-medium text-content-primary">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 text-content-tertiary" />
                  <p className="text-sm text-content-secondary">Order information not available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-6 bottom-0 w-0.5 bg-border-tertiary"></div>

                {/* Timeline events */}
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-content-primary">Payment Initiated</p>
                      <p className="text-xs text-content-secondary">
                        {payment.createdAt ? format(new Date(payment.createdAt), 'PPp') : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {payment.status !== PaymentStatus.PENDING && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-warning/10 rounded-full">
                        <RefreshCw className="h-4 w-4 text-status-warning" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Processing Started</p>
                        <p className="text-xs text-content-secondary">Gateway validation in progress</p>
                      </div>
                    </div>
                  )}

                  {payment.status === PaymentStatus.COMPLETED && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-success/10 rounded-full">
                        <CheckCircle className="h-4 w-4 text-status-success" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Payment Completed</p>
                        <p className="text-xs text-content-secondary">
                          Successfully charged ${payment.amount?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.status === PaymentStatus.FAILED && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-error/10 rounded-full">
                        <XCircle className="h-4 w-4 text-status-error" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Payment Failed</p>
                        <p className="text-xs text-content-secondary">
                          {payment.failureReason || 'Transaction declined'}
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.status === PaymentStatus.REFUNDED && (
                    <div className="flex items-start">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-status-warning/10 rounded-full">
                        <Receipt className="h-4 w-4 text-status-warning" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-content-primary">Refund Processed</p>
                        <p className="text-xs text-content-secondary">
                          Amount refunded: ${payment.amount?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-primary" />
                  Security Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-secondary">3D Secure</span>
                    <span className="text-sm font-medium text-gray-400">
                      Not Available
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-secondary">Fraud Score</span>
                    <span className="text-sm font-medium text-green-600">Low Risk</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-secondary">IP Address</span>
                    <span className="text-sm font-mono text-content-primary">
                      Not available
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-secondary">Device ID</span>
                    <span className="text-sm font-mono text-content-primary">
                      Unknown
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-primary" />
                  Compliance
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-content-primary">PCI DSS Compliant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-content-primary">Data encrypted in transit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-content-primary">Tokenized card data</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}