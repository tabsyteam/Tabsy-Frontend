'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@tabsy/ui-components'
import {
  Search,
  Filter,
  Download,
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  AlertCircle,
  Eye,
  MoreHorizontal,
  User,
  MapPin,
  ArrowUpDown
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { format, formatDistanceToNow } from 'date-fns'
import type { Payment, PaymentStatus, PaymentMethod } from '@tabsy/shared-types'
import { PaymentDetailsModal } from './PaymentDetailsModal'
import { formatPrice, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'

interface PaymentHistoryProps {
  restaurantId: string
}

type SortField = 'createdAt' | 'amount' | 'status' | 'paymentMethod'
type SortDirection = 'asc' | 'desc'

interface PaymentFilters {
  status: PaymentStatus | 'all'
  method: PaymentMethod | 'all'
  dateRange: 'today' | 'week' | 'month' | 'custom'
  searchTerm: string
  sortField: SortField
  sortDirection: SortDirection
}

export function PaymentHistory({ restaurantId }: PaymentHistoryProps) {
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    method: 'all',
    dateRange: 'week',
    searchTerm: '',
    sortField: 'createdAt',
    sortDirection: 'desc'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { restaurant } = useCurrentRestaurant()
  const currency = (restaurant?.currency || 'USD') as CurrencyCode

  const { data: payments, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant', 'payment-history', restaurantId, filters],
    queryFn: async () => {
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        limit: 500,
        dateFrom: getDateFrom(filters.dateRange),
        status: filters.status !== 'all' ? filters.status : undefined
      })

      if (response.success && response.data) {
        let filteredPayments = response.data

        // Apply payment method filter client-side
        if (filters.method !== 'all') {
          filteredPayments = filteredPayments.filter((p: Payment) => p.paymentMethod === filters.method)
        }

        // Apply search filter
        if (filters.searchTerm) {
          filteredPayments = filteredPayments.filter((payment: Payment) =>
            payment.id.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            payment.orderId?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            payment.tableSessionId?.toLowerCase().includes(filters.searchTerm.toLowerCase())
          )
        }

        // Apply sorting
        filteredPayments.sort((a: Payment, b: Payment) => {
          let aValue: any = a[filters.sortField]
          let bValue: any = b[filters.sortField]

          if (filters.sortField === 'amount') {
            // Convert Prisma Decimal to number for sorting
            const toNumber = (val: any): number => {
              if (!val) return 0
              if (typeof val === 'number') return val
              if (typeof val === 'string') return parseFloat(val) || 0
              if (typeof val === 'object' && 'toNumber' in val) return val.toNumber()
              return parseFloat(val.toString()) || 0
            }
            aValue = toNumber(a.amount)
            bValue = toNumber(b.amount)
          }

          if (filters.sortField === 'createdAt') {
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
          }

          if (aValue < bValue) return filters.sortDirection === 'asc' ? -1 : 1
          if (aValue > bValue) return filters.sortDirection === 'asc' ? 1 : -1
          return 0
        })

        return filteredPayments
      }
      throw new Error('Failed to fetch payment history')
    },
    refetchInterval: 60000, // Refetch every minute
  })

  function getDateFrom(period: string): string {
    const now = new Date()
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return weekAgo.toISOString()
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return monthAgo.toISOString()
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    }
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return <CreditCard className="w-4 h-4" />
      case 'MOBILE_PAYMENT':
        return <Smartphone className="w-4 h-4" />
      case 'CASH':
        return <Banknote className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-status-success" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-status-error" />
      case 'PENDING':
        return <Clock className="w-4 h-4 text-status-warning" />
      case 'PROCESSING':
        return <RefreshCw className="w-4 h-4 text-status-info animate-spin" />
      case 'REFUNDED':
        return <RefreshCw className="w-4 h-4 text-status-warning" />
      default:
        return <AlertCircle className="w-4 h-4 text-content-tertiary" />
    }
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-status-success/10 text-status-success border-status-success/20'
      case 'FAILED':
        return 'bg-status-error/10 text-status-error border-status-error/20'
      case 'PENDING':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20'
      case 'PROCESSING':
        return 'bg-status-info/10 text-status-info border-status-info/20'
      case 'REFUNDED':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20'
      default:
        return 'bg-surface-secondary text-content-secondary'
    }
  }

  const handleSort = (field: SortField) => {
    if (filters.sortField === field) {
      setFilters(prev => ({
        ...prev,
        sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc'
      }))
    } else {
      setFilters(prev => ({
        ...prev,
        sortField: field,
        sortDirection: 'desc'
      }))
    }
  }

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev =>
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPayments.length === (payments?.length || 0)) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(payments?.map((p: Payment) => p.id) || [])
    }
  }

  const handleExportSelected = () => {
    console.log('Export selected payments:', selectedPayments)
  }

  const handleViewPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId)
    setIsModalOpen(true)
  }

  const formatAmount = (amount: any): string => {
    let numericAmount = 0
    if (!amount) numericAmount = 0
    else if (typeof amount === 'number') numericAmount = amount
    else if (typeof amount === 'string') numericAmount = parseFloat(amount) || 0
    else if (typeof amount === 'object' && 'toNumber' in amount) numericAmount = amount.toNumber()
    else numericAmount = parseFloat(amount.toString()) || 0
    return formatPrice(numericAmount, currency)
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-content-primary mb-2">
          Error Loading Payment History
        </h3>
        <p className="text-content-secondary mb-4">
          Unable to load payment history. Please try again.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header with Search and Filters */}
      <div className="p-4 sm:p-6 border-b border-border-default">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-content-primary">Payment History</h2>
            <p className="text-content-secondary mt-1">
              View and manage all payment transactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedPayments.length > 0 && (
              <Button
                onClick={handleExportSelected}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Selected ({selectedPayments.length})</span>
              </Button>
            )}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-content-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder="Search by payment ID, order ID, or table..."
            className="w-full pl-10 pr-4 py-2 border border-border-default rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-surface-secondary rounded-lg">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Status</label>
              <select
                className="w-full p-2 border border-border-default rounded bg-surface"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as PaymentStatus | 'all' }))}
              >
                <option value="all">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Payment Method</label>
              <select
                className="w-full p-2 border border-border-default rounded bg-surface"
                value={filters.method}
                onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value as PaymentMethod | 'all' }))}
              >
                <option value="all">All Methods</option>
                <option value="CARD">Card</option>
                <option value="DIGITAL_WALLET">Digital Wallet</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Date Range</label>
              <select
                className="w-full p-2 border border-border-default rounded bg-surface"
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as 'today' | 'week' | 'month' | 'custom' }))}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => setFilters({
                  status: 'all',
                  method: 'all',
                  dateRange: 'week',
                  searchTerm: '',
                  sortField: 'createdAt',
                  sortDirection: 'desc'
                })}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="p-6 border-b border-border-default bg-surface-secondary">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Total Transactions</p>
              <p className="text-lg font-semibold text-content-primary">
                {payments?.length || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-status-success/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-status-success" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Completed</p>
              <p className="text-lg font-semibold text-content-primary">
                {payments?.filter((p: Payment) => p.status === 'COMPLETED').length || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-status-error/10 rounded-lg">
              <XCircle className="w-5 h-5 text-status-error" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Failed</p>
              <p className="text-lg font-semibold text-content-primary">
                {payments?.filter((p: Payment) => p.status === 'FAILED').length || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-status-warning/10 rounded-lg">
              <RefreshCw className="w-5 h-5 text-status-warning" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Refunded</p>
              <p className="text-lg font-semibold text-content-primary">
                {payments?.filter((p: Payment) => p.status === 'REFUNDED').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-surface rounded-lg border p-4">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-4 h-4 bg-surface-secondary rounded"></div>
                        <div className="w-8 h-8 bg-surface-secondary rounded"></div>
                        <div>
                          <div className="h-4 bg-surface-secondary rounded w-32 mb-2"></div>
                          <div className="h-3 bg-surface-secondary rounded w-20"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-surface-secondary rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !payments || payments.length === 0 ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-content-primary mb-2">
              No Payment History Found
            </h3>
            <p className="text-content-secondary">
              No payments match your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="p-6">
            {/* Table Header */}
            <div className="flex items-center space-x-4 p-4 border-b border-border-secondary text-sm font-medium text-content-secondary">
              <div className="w-8">
                <input
                  type="checkbox"
                  checked={selectedPayments.length === payments.length}
                  onChange={handleSelectAll}
                  className="rounded border-border-default"
                />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center space-x-1 hover:text-content-primary"
                >
                  <span>Payment Info</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </div>
              <div className="w-24">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center space-x-1 hover:text-content-primary"
                >
                  <span>Amount</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </div>
              <div className="w-20">Actions</div>
            </div>

            {/* Payment Rows */}
            <div className="space-y-2 mt-4">
              {payments.map((payment: Payment) => (
                <div
                  key={payment.id}
                  className={`bg-surface rounded-lg border p-4 transition-colors hover:bg-surface-secondary ${
                    selectedPayments.includes(payment.id) ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id)}
                      onChange={() => handleSelectPayment(payment.id)}
                      className="rounded border-border-default"
                    />

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      {getPaymentMethodIcon(payment.paymentMethod)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-content-primary">
                          Payment #{payment.id.slice(-8)}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}
                        >
                          {payment.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 mt-1 text-sm text-content-secondary">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>Order #{payment.orderId?.slice(-6) || 'N/A'}</span>
                        </div>

                        {payment.tableSessionId && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>Session {payment.tableSessionId}</span>
                          </div>
                        )}

                        <span>
                          {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-content-primary">
                        {formatAmount(payment.amount)}
                      </p>
                      <p className="text-sm text-content-secondary">
                        {format(new Date(payment.createdAt), 'MMM dd, h:mm a')}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleViewPayment(payment.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </Button>
                    </div>
                  </div>

                  {payment.failureReason && (
                    <div className="mt-3 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-status-error">
                        <AlertCircle className="w-4 h-4" />
                        <span>Failure Reason: {payment.failureReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {selectedPaymentId && (
        <PaymentDetailsModal
          paymentId={selectedPaymentId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedPaymentId(null)
          }}
        />
      )}
    </div>
  )
}