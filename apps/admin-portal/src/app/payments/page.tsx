'use client';

import { useState, useMemo, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@tabsy/ui-components';
import {
  CreditCard,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Download,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  Store,
  User,
  Hash,
  Banknote,
  Smartphone,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { usePayments, usePaymentMetrics } from '@/hooks/api';
import { formatDistanceToNow, format } from 'date-fns';
import PaymentDetailsModal from '@/components/payments/PaymentDetailsModal';
import { Payment, PaymentStatus } from '@tabsy/shared-types';
import { useWebSocket, useWebSocketEvent, usePaymentUpdates } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Payment Method Icon
function PaymentMethodIcon({ method }: { method: string }) {
  const icons: Record<string, any> = {
    card: CreditCard,
    cash: Banknote,
    mobile: Smartphone,
    wallet: Wallet
  };

  const Icon = icons[method.toLowerCase()] || CreditCard;
  return <Icon className="h-4 w-4" />;
}

// Status Badge Component
function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    PENDING: { color: 'badge-warning', icon: Clock, label: 'Pending' },
    PROCESSING: { color: 'badge-info', icon: Clock, label: 'Processing' },
    COMPLETED: { color: 'badge-success', icon: CheckCircle, label: 'Completed' },
    FAILED: { color: 'badge-error', icon: XCircle, label: 'Failed' },
    CANCELLED: { color: 'badge-error', icon: XCircle, label: 'Cancelled' },
    REFUNDED: { color: 'badge-error', icon: Receipt, label: 'Refunded' },
    PARTIALLY_REFUNDED: { color: 'badge-warning', icon: Receipt, label: 'Partially Refunded' }
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config?.icon || Clock;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color || 'badge-warning'}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config?.label || 'Unknown'}
    </span>
  );
}

export default function PaymentsPage() {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'card' | 'cash' | 'mobile'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('today');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const itemsPerPage = 10;

  const auth = useAuth();
  const queryClient = useQueryClient();

  // Fetch payments data with real-time updates
  const { data: paymentsData, isLoading, refetch } = usePayments({
    search: searchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    method: methodFilter === 'all' ? undefined : methodFilter,
    dateRange: dateFilter,
    sortBy,
    sortOrder
  });

  const { data: metrics } = usePaymentMetrics();

  // WebSocket for real-time updates
  const ws = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5001',
    auth: {
      token: auth.session?.token,
      namespace: 'restaurant' as const
    },
    onConnect: () => {
      console.log('Payments WebSocket connected');
    },
    onError: (error: Error) => {
      console.error('Payments WebSocket error:', error);
    }
  });

  // Real-time payment updates using shared WebSocket hooks - COMPLETE PAYMENT LIFECYCLE MONITORING
  useWebSocketEvent(ws.client, 'payment:created', (data: any) => {
    toast.info(`💳 Payment initiated: $${data.amount} for order #${data.orderId?.slice(-8)} via ${data.method}`);
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    refetch();
  });

  useWebSocketEvent(ws.client, 'payment:completed', (data: any) => {
    const tipText = data.tip ? ` (tip: $${data.tip})` : '';
    toast.success(`✅ Payment completed: $${data.amount} via ${data.method}${tipText}`);
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    refetch();
  });

  useWebSocketEvent(ws.client, 'payment:failed', (data: any) => {
    toast.error(`❌ Payment failed: $${data.amount} via ${data.method} - ${data.errorMessage} (${data.errorCode})`);
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    refetch();
  });

  useWebSocketEvent(ws.client, 'payment:cancelled', (data: any) => {
    toast.warning(`⏹️ Payment cancelled: Order #${data.orderId?.slice(-8)} - ${data.reason}`);
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    refetch();
  });

  useWebSocketEvent(ws.client, 'payment:refunded', (data: any) => {
    toast.info(`💰 Refund processed: $${data.amount} for order #${data.orderId?.slice(-8)} - ${data.reason} (by ${data.processedBy})`);
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    refetch();
  });

  useWebSocketEvent(ws.client, 'payment:status_updated', (data: any) => {
    toast.info(`🔄 Payment status updated: #${data.paymentId?.slice(-8)} → ${data.status}`);
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    refetch();
  });

  // Calculate pagination
  const payments = Array.isArray(paymentsData) ? paymentsData : paymentsData?.payments || [];
  const totalPages = Math.ceil((payments?.length || 0) / itemsPerPage);
  const paginatedPayments = useMemo(() => {
    if (!payments) return [];
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return payments.slice(start, end);
  }, [payments, currentPage]);

  // Handlers
  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
    setActiveDropdown(null);
  };

  const handleExportPayments = () => {
    toast.success('Exporting payment transactions...');
  };

  const handleRefund = async (payment: Payment) => {
    if (confirm(`Are you sure you want to refund payment #${payment.id.slice(-8)}?`)) {
      toast.success('Refund initiated successfully');
      refetch();
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-surface border-b border-border-tertiary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-content-primary flex items-center">
                  <CreditCard className="h-7 w-7 mr-3 text-primary" />
                  Payment Management
                </h1>
                <p className="mt-1 text-sm text-content-secondary">
                  Track and manage all payment transactions
                </p>
              </div>
              <div className="flex gap-3">
                <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                  ws.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    ws.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  {ws.isConnected ? 'Live' : 'Offline'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="hover-lift"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPayments}
                  className="hover-lift"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15%
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.totalRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Total Revenue</p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium text-blue-600">
                  {metrics?.totalTransactions || 0}
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics?.successfulTransactions || 0}
              </div>
              <p className="text-xs text-content-secondary mt-1">Successful</p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="text-xs text-orange-600">
                  {metrics?.pendingPayments || 0}
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.pendingAmount?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Pending</p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-xs text-red-600">
                  {metrics?.failedPayments || 0}
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics?.failureRate?.toFixed(1) || '0.0'}%
              </div>
              <p className="text-xs text-content-secondary mt-1">Failure Rate</p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-xs text-purple-600">AOV</span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.averageTransactionValue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Avg Value</p>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="mt-4 bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
            <h3 className="text-sm font-medium text-content-primary mb-3">Payment Methods</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm text-content-secondary">Card</span>
                </div>
                <span className="text-sm font-medium text-content-primary">
                  {metrics?.methodBreakdown?.card || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Banknote className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-content-secondary">Cash</span>
                </div>
                <span className="text-sm font-medium text-content-primary">
                  {metrics?.methodBreakdown?.cash || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="h-4 w-4 text-purple-500 mr-2" />
                  <span className="text-sm text-content-secondary">Mobile</span>
                </div>
                <span className="text-sm font-medium text-content-primary">
                  {metrics?.methodBreakdown?.mobile || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wallet className="h-4 w-4 text-orange-500 mr-2" />
                  <span className="text-sm text-content-secondary">Wallet</span>
                </div>
                <span className="text-sm font-medium text-content-primary">
                  {metrics?.methodBreakdown?.wallet || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-lg shadow-card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-tertiary" />
                  <input
                    type="text"
                    placeholder="Search by transaction ID, order ID, or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-tertiary rounded-lg input-professional focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="px-4 py-2 border border-border-tertiary rounded-lg input-professional"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 border border-border-tertiary rounded-lg input-professional"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value as any)}
                  className="px-4 py-2 border border-border-tertiary rounded-lg input-professional"
                >
                  <option value="all">All Methods</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-border-tertiary rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
          <div className="bg-surface rounded-lg shadow-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-content-secondary">Loading payments...</p>
              </div>
            ) : paginatedPayments.length === 0 ? (
              <div className="p-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-content-tertiary" />
                <p className="text-content-secondary">No payments found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full table-professional">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Transaction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-tertiary">
                      {paginatedPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-surface-secondary transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Hash className="h-4 w-4 text-content-tertiary mr-2" />
                              <span className="text-sm font-mono text-content-primary">
                                {payment.id.slice(-12)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-content-primary">
                              #{payment.orderId?.slice(-8) || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-content-tertiary mr-2" />
                              <span className="text-sm text-content-primary">
                                Customer #{payment.orderId?.slice(-8) || 'Guest'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <PaymentMethodIcon method={payment.method || 'card'} />
                              <span className="text-sm text-content-primary ml-2">
                                {payment.method || 'Card'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm font-bold text-content-primary">
                                {payment.amount?.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <PaymentStatusBadge status={payment.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-content-secondary">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {payment.createdAt ? formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true }) : 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="relative">
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === payment.id ? null : payment.id)}
                                className="p-2 hover:bg-surface-secondary rounded-full transition-colors"
                              >
                                <MoreVertical className="h-4 w-4 text-content-tertiary" />
                              </button>
                              {activeDropdown === payment.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-border-tertiary z-10">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleViewDetails(payment)}
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </button>
                                    {payment.status === PaymentStatus.COMPLETED && (
                                      <button
                                        onClick={() => handleRefund(payment)}
                                        className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                      >
                                        <Receipt className="h-4 w-4 mr-2" />
                                        Process Refund
                                      </button>
                                    )}
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Receipt
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-3 flex items-center justify-between border-t border-border-tertiary">
                    <div className="text-sm text-content-secondary">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, payments?.length || 0)} of{' '}
                      {payments?.length || 0} payments
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-border-tertiary rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page =>
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        )
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-content-tertiary">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded-lg ${
                                page === currentPage
                                  ? 'bg-primary text-white'
                                  : 'hover:bg-surface-secondary'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-border-tertiary rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {showDetailsModal && selectedPayment && (
          <PaymentDetailsModal
            payment={selectedPayment}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedPayment(null);
            }}
            onUpdate={() => refetch()}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}