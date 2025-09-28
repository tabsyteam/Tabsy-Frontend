'use client';

import { useState, useMemo, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button, useWebSocketEventRegistry } from '@tabsy/ui-components';
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
  ArrowDownRight,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { usePayments, usePaymentMetrics, useRealTimePaymentMetrics, usePaymentHealthStatus, usePaymentAlerts } from '@/hooks/api';
import { formatDistanceToNow, format } from 'date-fns';
import PaymentDetailsModal from '@/components/payments/PaymentDetailsModal';
import { Payment, PaymentStatus, PaymentMethod } from '@tabsy/shared-types';
import { useAuth } from '@tabsy/ui-components';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';

// Payment Method Icon
function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  switch (method) {
    case PaymentMethod.CREDIT_CARD:
    case PaymentMethod.DEBIT_CARD:
      return <CreditCard className="h-4 w-4" />;
    case PaymentMethod.MOBILE_PAYMENT:
      return <Smartphone className="h-4 w-4" />;
    case PaymentMethod.CASH:
      return <Banknote className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
}

// Status Badge Component
function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    PENDING: { color: 'bg-status-warning/10 text-status-warning border border-status-warning/20', icon: Clock, label: 'Pending' },
    PROCESSING: { color: 'bg-status-info/10 text-status-info border border-status-info/20', icon: RefreshCw, label: 'Processing' },
    COMPLETED: { color: 'bg-status-success/10 text-status-success border border-status-success/20', icon: CheckCircle, label: 'Completed' },
    FAILED: { color: 'bg-status-error/10 text-status-error border border-status-error/20', icon: XCircle, label: 'Failed' },
    CANCELLED: { color: 'bg-surface-secondary text-content-secondary border border-border-default', icon: XCircle, label: 'Cancelled' },
    REFUNDED: { color: 'bg-status-warning/10 text-status-warning border border-status-warning/20', icon: Receipt, label: 'Refunded' },
    PARTIALLY_REFUNDED: { color: 'bg-status-warning/10 text-status-warning border border-status-warning/20', icon: Receipt, label: 'Partially Refunded' }
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config?.icon || Clock;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color}`}>
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
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('today');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);
  const [metricsPeriod, setMetricsPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('today');
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

  const { data: metrics } = usePaymentMetrics(metricsPeriod);
  const { data: realtimeMetrics } = useRealTimePaymentMetrics();
  const { data: healthStatus } = usePaymentHealthStatus();
  const { data: alerts } = usePaymentAlerts();

  // Real-time WebSocket connection for admin portal
  const { isConnected } = useAdminWebSocket({
    onPaymentUpdate: (data) => {
      console.log('💳 Admin Payment Update:', data)
      // Invalidate payment queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'metrics'] })
      setRealtimeUpdates(prev => prev + 1)

      // Show toast notification for significant payment events
      if (data.type === 'payment:completed') {
        toast.success(`Payment of $${data.amount?.toFixed(2)} completed successfully`)
      } else if (data.type === 'payment:failed') {
        toast.error(`Payment failed: ${data.errorMessage}`)
      }
    },
    onAnalyticsUpdate: (data) => {
      console.log('📊 Admin Analytics Update:', data)
      // Update metrics in real-time
      if (data.metric === 'payments' || data.metric === 'revenue') {
        queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'metrics'] })
        setRealtimeUpdates(prev => prev + 1)
      }
    }
  })

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
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-content-primary flex items-center">
                    <CreditCard className="h-7 w-7 mr-3 text-primary" />
                    Payment Management
                  </h1>

                  {/* Real-time Status Indicator */}
                  <div className="flex items-center space-x-2">
                    {isConnected ? (
                      <>
                        <Wifi className="w-4 h-4 text-status-success" />
                        <span className="text-sm text-status-success font-medium">Live</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-status-error" />
                        <span className="text-sm text-status-error font-medium">Offline</span>
                      </>
                    )}
                    {realtimeUpdates > 0 && (
                      <div className="flex items-center space-x-1">
                        <Activity className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-xs text-content-tertiary">
                          {realtimeUpdates} updates
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-content-secondary">
                  Track and manage all payment transactions across all restaurants
                </p>
              </div>
              <div className="flex gap-3">
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

        {/* Period Selector and Health Status */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <select
                value={metricsPeriod}
                onChange={(e) => setMetricsPeriod(e.target.value as any)}
                className="px-4 py-2 border border-border-tertiary rounded-lg input-professional"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* Payment Health Status */}
            {healthStatus && (
              <div className={`flex items-center px-3 py-2 rounded-lg border ${
                healthStatus.status === 'HEALTHY' ? 'bg-status-success/10 border-status-success/20 text-status-success' :
                healthStatus.status === 'WARNING' ? 'bg-status-warning/10 border-status-warning/20 text-status-warning' :
                healthStatus.status === 'CRITICAL' ? 'bg-status-error/10 border-status-error/20 text-status-error' :
                'bg-status-info/10 border-status-info/20 text-status-info'
              }`}>
                <Activity className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">System {healthStatus.status}</span>
                <span className="text-xs ml-2">Score: {healthStatus.score}/100</span>
              </div>
            )}
          </div>

          {/* Payment Alerts */}
          {alerts && alerts.length > 0 && (
            <div className="mb-4 bg-status-warning/10 border border-status-warning/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-5 w-5 text-status-warning mr-2" />
                <h3 className="text-sm font-medium text-status-warning">Payment Alerts ({alerts.length})</h3>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert, index) => (
                  <div key={index} className={`text-xs px-2 py-1 rounded ${
                    alert.severity === 'CRITICAL' ? 'bg-status-error/20 text-status-error' :
                    alert.severity === 'HIGH' ? 'bg-status-warning/20 text-status-warning' :
                    'bg-status-info/20 text-status-info'
                  }`}>
                    {alert.message}
                  </div>
                ))}
                {alerts.length > 3 && (
                  <div className="text-xs text-content-tertiary">
                    +{alerts.length - 3} more alerts
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Metrics Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-status-success" />
                <span className={`text-xs flex items-center ${
                  (metrics?.revenueGrowth || 0) >= 0 ? 'text-status-success' : 'text-status-error'
                }`}>
                  {(metrics?.revenueGrowth || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {metrics?.revenueGrowth?.toFixed(1) || '0.0'}%
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.totalRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Total Revenue</p>
              {realtimeMetrics && (
                <p className="text-xs text-status-info mt-1">
                  Recent: ${realtimeMetrics.recentRevenue?.toFixed(2) || '0.00'}
                </p>
              )}
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span className={`text-xs flex items-center ${
                  (metrics?.transactionGrowth || 0) >= 0 ? 'text-status-success' : 'text-status-error'
                }`}>
                  {(metrics?.transactionGrowth || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {metrics?.transactionGrowth?.toFixed(1) || '0.0'}%
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics?.totalTransactions || 0}
              </div>
              <p className="text-xs text-content-secondary mt-1">Total Transactions</p>
              <p className="text-xs text-status-success mt-1">
                Success: {metrics?.successfulTransactions || 0} ({metrics?.successRate?.toFixed(1) || '0.0'}%)
              </p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-status-warning" />
                <span className="text-xs text-status-warning">
                  {metrics?.pendingPayments || 0}
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.pendingAmount?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Pending Amount</p>
              {realtimeMetrics && (
                <p className="text-xs text-status-warning mt-1">
                  Live: {realtimeMetrics.pendingPayments || 0}
                </p>
              )}
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="h-5 w-5 text-status-error" />
                <span className={`text-xs flex items-center ${
                  (metrics?.successRateChange || 0) >= 0 ? 'text-status-success' : 'text-status-error'
                }`}>
                  {(metrics?.successRateChange || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(metrics?.successRateChange || 0).toFixed(1)}%
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics?.failureRate?.toFixed(1) || '0.0'}%
              </div>
              <p className="text-xs text-content-secondary mt-1">Failure Rate</p>
              <p className="text-xs text-status-error mt-1">
                Failed: {metrics?.failedPayments || 0}
              </p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <span className="text-xs text-secondary">AOV</span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.averageTransactionValue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Average Order Value</p>
              <p className="text-xs text-secondary mt-1">
                Refund Rate: {metrics?.refundRate?.toFixed(1) || '0.0'}%
              </p>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="mt-4 bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
            <h3 className="text-sm font-medium text-content-primary mb-3">Payment Methods Distribution</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm text-content-secondary">Credit Cards</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {metrics?.cardPercentage?.toFixed(1) || '0.0'}%
                  </span>
                </div>
                <div className="text-xs text-content-tertiary">
                  {metrics?.cardTransactions || 0} transactions
                </div>
                <div className="text-xs text-content-tertiary">
                  ${metrics?.cardAmount?.toFixed(2) || '0.00'} revenue
                </div>
              </div>

              <div className="flex flex-col p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Smartphone className="h-4 w-4 text-secondary mr-2" />
                    <span className="text-sm text-content-secondary">Digital Wallets</span>
                  </div>
                  <span className="text-sm font-bold text-secondary">
                    {metrics?.walletPercentage?.toFixed(1) || '0.0'}%
                  </span>
                </div>
                <div className="text-xs text-content-tertiary">
                  {metrics?.digitalWalletTransactions || 0} transactions
                </div>
                <div className="text-xs text-content-tertiary">
                  ${metrics?.digitalWalletAmount?.toFixed(2) || '0.00'} revenue
                </div>
              </div>

              <div className="flex flex-col p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Banknote className="h-4 w-4 text-status-success mr-2" />
                    <span className="text-sm text-content-secondary">Cash</span>
                  </div>
                  <span className="text-sm font-bold text-status-success">
                    {metrics?.cashPercentage?.toFixed(1) || '0.0'}%
                  </span>
                </div>
                <div className="text-xs text-content-tertiary">
                  {metrics?.cashTransactions || 0} transactions
                </div>
                <div className="text-xs text-content-tertiary">
                  ${metrics?.cashAmount?.toFixed(2) || '0.00'} revenue
                </div>
              </div>

              {/* Peak Performance Indicator */}
              {metrics?.peakHours && metrics.peakHours.length > 0 && (
                <div className="flex flex-col p-3 bg-background rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 text-accent mr-2" />
                      <span className="text-sm text-content-secondary">Peak Hour</span>
                    </div>
                    <span className="text-sm font-bold text-accent">
                      {String(metrics.peakHours[0]?.hour || 0).padStart(2, '0')}:00
                    </span>
                  </div>
                  <div className="text-xs text-content-tertiary">
                    {metrics.peakHours[0]?.transactions || 0} transactions
                  </div>
                  <div className="text-xs text-accent">
                    Busiest period
                  </div>
                </div>
              )}
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
                  <option value={PaymentMethod.CREDIT_CARD}>Credit Card</option>
                  <option value={PaymentMethod.DEBIT_CARD}>Debit Card</option>
                  <option value={PaymentMethod.MOBILE_PAYMENT}>Mobile Payment</option>
                  <option value={PaymentMethod.CASH}>Cash</option>
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
                              <PaymentMethodIcon method={payment.paymentMethod || PaymentMethod.CREDIT_CARD} />
                              <span className="text-sm text-content-primary ml-2">
                                {payment.paymentMethod === PaymentMethod.CREDIT_CARD ? 'Credit Card' :
                                 payment.paymentMethod === PaymentMethod.DEBIT_CARD ? 'Debit Card' :
                                 payment.paymentMethod === PaymentMethod.MOBILE_PAYMENT ? 'Mobile Payment' :
                                 payment.paymentMethod === PaymentMethod.CASH ? 'Cash' : 'Credit Card'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-status-success mr-1" />
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