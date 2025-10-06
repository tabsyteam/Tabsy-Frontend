'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@tabsy/ui-components'
import {
  Landmark,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { format } from 'date-fns'
import { useWebSocket } from '@tabsy/ui-components'
import { PaymentMetricsError } from '@tabsy/shared-types'
import { logger } from '../../lib/logger'
import { QUERY_STALE_TIME, QUERY_REFETCH_INTERVAL } from '../../lib/constants'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface PaymentOverviewProps {
  restaurantId: string
  isVisible?: boolean
}

interface PaymentMetrics {
  todayRevenue: number
  todayTransactions: number
  pendingPayments: number
  pendingAmount: number
  averageTransaction: number
  successRate: number
  failureRate: number
  refundCount: number
  refundAmount: number

  // Payment method breakdown
  cardTransactions: number
  cardAmount: number
  digitalWalletTransactions: number
  digitalWalletAmount: number
  cashTransactions: number
  cashAmount: number

  // Trends (percentage change from yesterday)
  revenueTrend: number
  transactionTrend: number
}

/**
 * PaymentOverview Component
 *
 * SENIOR ARCHITECTURE NOTE:
 * WebSocket event listeners removed - now centralized in PaymentManagement.tsx
 * This component relies on React Query cache updates from usePaymentWebSocketSync.
 * Optimized staleTime based on WebSocket connection status.
 */
export function PaymentOverview({ restaurantId, isVisible = true }: PaymentOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const queryClient = useQueryClient()
  const { isConnected } = useWebSocket()
  const { restaurant } = useCurrentRestaurant()
  const currency = (restaurant?.currency as CurrencyCode) || 'USD'

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant', 'payment-metrics', restaurantId, selectedPeriod],
    queryFn: async () => {
      logger.debug('Fetching payment metrics', { restaurantId, selectedPeriod })
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        limit: 1000,
        dateFrom: getDateFrom(selectedPeriod)
      })

      if (response.success && response.data) {
        logger.debug('Payment metrics fetched', { count: response.data.length })
        return calculateMetrics(response.data)
      }
      throw new PaymentMetricsError('Unable to fetch payment metrics', restaurantId, selectedPeriod, error || undefined)
    },
    refetchOnMount: true,
    // OPTIMIZATION: Use longer staleTime when WebSocket connected (centralized sync handles updates)
    staleTime: isConnected ? QUERY_STALE_TIME.MEDIUM : QUERY_STALE_TIME.SHORT,
    refetchInterval: isConnected ? false : QUERY_REFETCH_INTERVAL.FAST,
    retry: (failureCount, error) => {
      // Don't retry if we're getting client errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number
        if (status >= 400 && status < 500) return false
      }
      return failureCount < 2
    }
  })

  // Memoized helper functions
  const getDateFrom = useCallback((period: string): string => {
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
  }, [])

  const calculateTrendPercentage = useCallback((current: number, previous: number): number => {
    if (previous === 0) {
      return current > 0 ? 100 : 0
    }
    return ((current - previous) / previous) * 100
  }, [])

  const calculateMetrics = useMemo(() => (payments: any[]): PaymentMetrics => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)

    // Helper function to safely convert Prisma Decimal to number
    const toNumber = (value: any): number => {
      if (value === null || value === undefined) return 0
      if (typeof value === 'number') return value
      if (typeof value === 'string') return parseFloat(value) || 0
      if (typeof value === 'object' && value !== null) {
        // Handle Prisma Decimal objects
        if ('toNumber' in value && typeof value.toNumber === 'function') {
          return value.toNumber()
        }
        // Handle plain objects with toString
        return parseFloat(value.toString()) || 0
      }
      return 0
    }

    const todayPayments = payments.filter(p => new Date(p.createdAt) >= todayStart)
    const yesterdayPayments = payments.filter(p => {
      const createdAt = new Date(p.createdAt)
      return createdAt >= yesterdayStart && createdAt < todayStart
    })

    const todayCompleted = todayPayments.filter(p => p.status === 'COMPLETED')
    const yesterdayCompleted = yesterdayPayments.filter(p => p.status === 'COMPLETED')

    const completedPayments = todayCompleted
    const pendingPayments = todayPayments.filter(p => ['PENDING', 'PROCESSING'].includes(p.status))
    const failedPayments = todayPayments.filter(p => p.status === 'FAILED')
    const refundedPayments = todayPayments.filter(p => p.status === 'REFUNDED')

    const cardPayments = completedPayments.filter(p =>
      p.paymentMethod === 'CREDIT_CARD' || p.paymentMethod === 'DEBIT_CARD'
    )
    const walletPayments = completedPayments.filter(p => p.paymentMethod === 'MOBILE_PAYMENT')
    const cashPayments = completedPayments.filter(p => p.paymentMethod === 'CASH')

    // Debug logging for payment methods
    if (completedPayments.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('[PaymentOverview] Payment method breakdown:', {
        total: completedPayments.length,
        paymentMethods: completedPayments.map(p => p.paymentMethod),
        cardPayments: cardPayments.length,
        walletPayments: walletPayments.length,
        cashPayments: cashPayments.length,
        samplePayment: completedPayments[0]
      })
    }

    return {
      todayRevenue: completedPayments.reduce((sum, p) => sum + toNumber(p.amount), 0),
      todayTransactions: todayPayments.length,
      pendingPayments: pendingPayments.length,
      pendingAmount: pendingPayments.reduce((sum, p) => sum + toNumber(p.amount), 0),
      averageTransaction: completedPayments.length > 0
        ? completedPayments.reduce((sum, p) => sum + toNumber(p.amount), 0) / completedPayments.length
        : 0,
      successRate: todayPayments.length > 0 ? (completedPayments.length / todayPayments.length) * 100 : 0,
      failureRate: todayPayments.length > 0 ? (failedPayments.length / todayPayments.length) * 100 : 0,
      refundCount: refundedPayments.length,
      refundAmount: refundedPayments.reduce((sum, p) => sum + toNumber(p.amount), 0),

      cardTransactions: cardPayments.length,
      cardAmount: cardPayments.reduce((sum, p) => sum + toNumber(p.amount), 0),
      digitalWalletTransactions: walletPayments.length,
      digitalWalletAmount: walletPayments.reduce((sum, p) => sum + toNumber(p.amount), 0),
      cashTransactions: cashPayments.length,
      cashAmount: cashPayments.reduce((sum, p) => sum + toNumber(p.amount), 0),

      // Calculate real trends based on yesterday's data
      revenueTrend: calculateTrendPercentage(
        todayCompleted.reduce((sum, p) => sum + toNumber(p.amount), 0),
        yesterdayCompleted.reduce((sum, p) => sum + toNumber(p.amount), 0)
      ),
      transactionTrend: calculateTrendPercentage(
        todayCompleted.length,
        yesterdayCompleted.length
      ),
    }
  }, [calculateTrendPercentage])

  // Use shared utility for consistent formatting
  const formatCurrency = useCallback((amount: number) => formatPriceUtil(amount, currency), [currency])
  const formatPercent = useCallback((percent: number) => `${percent.toFixed(1)}%`, [])

  const getTrendIcon = useCallback((trend: number) => {
    if (trend > 0) return <ArrowUp className="w-4 h-4 text-status-success" />
    if (trend < 0) return <ArrowDown className="w-4 h-4 text-status-error" />
    return null
  }, [])

  const getTrendColor = useCallback((trend: number) => {
    if (trend > 0) return 'text-status-success'
    if (trend < 0) return 'text-status-error'
    return 'text-content-secondary'
  }, [])

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-content-primary mb-2">
          Error Loading Payment Data
        </h3>
        <p className="text-content-secondary mb-4">
          Unable to load payment metrics. Please try again.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-content-primary">Payment Overview</h2>

          {/* Real-time Status Indicator */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-status-success" />
                <span className="text-sm text-status-success">Live Updates</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-status-error" />
                <span className="text-sm text-status-error">Offline</span>
              </>
            )}
          </div>
        </div>

        <div className="flex bg-surface-secondary rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-surface text-content-primary shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-surface rounded-lg border p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-surface-secondary rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-surface-secondary rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-surface-secondary rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Revenue */}
            <div className="bg-surface rounded-lg border p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Landmark className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Revenue</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {formatCurrency(metrics?.todayRevenue || 0)}
                    </p>
                  </div>
                </div>
                {metrics?.revenueTrend !== undefined && metrics.revenueTrend !== 0 && (
                  <div className={`flex items-center space-x-1 text-sm ${getTrendColor(metrics.revenueTrend)}`}>
                    {getTrendIcon(metrics.revenueTrend)}
                    <span>{formatPercent(Math.abs(metrics.revenueTrend))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-surface rounded-lg border p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <CreditCard className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Transactions</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {metrics?.todayTransactions || 0}
                    </p>
                  </div>
                </div>
                {metrics?.transactionTrend !== undefined && metrics.transactionTrend !== 0 && (
                  <div className={`flex items-center space-x-1 text-sm ${getTrendColor(metrics.transactionTrend)}`}>
                    {getTrendIcon(metrics.transactionTrend)}
                    <span>{formatPercent(Math.abs(metrics.transactionTrend))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-surface rounded-lg border p-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-status-warning/10 rounded-lg">
                    <Clock className="w-6 h-6 text-status-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Pending</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {metrics?.pendingPayments || 0}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-content-secondary">
                  {formatCurrency(metrics?.pendingAmount || 0)}
                </p>
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-surface rounded-lg border p-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-status-success/10 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-status-success" />
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Success Rate</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {formatPercent(metrics?.successRate || 0)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-content-secondary">
                  {metrics?.todayTransactions || 0} total
                </p>
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-content-primary mb-4">Payment Methods</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-content-secondary" />
                    <span className="text-content-primary">Card Payments</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-content-primary">
                      {formatCurrency(metrics?.cardAmount || 0)}
                    </p>
                    <p className="text-sm text-content-secondary">
                      {metrics?.cardTransactions || 0} transactions
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-content-secondary" />
                    <span className="text-content-primary">Digital Wallet</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-content-primary">
                      {formatCurrency(metrics?.digitalWalletAmount || 0)}
                    </p>
                    <p className="text-sm text-content-secondary">
                      {metrics?.digitalWalletTransactions || 0} transactions
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Banknote className="w-5 h-5 text-content-secondary" />
                    <span className="text-content-primary">Cash</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-content-primary">
                      {formatCurrency(metrics?.cashAmount || 0)}
                    </p>
                    <p className="text-sm text-content-secondary">
                      {metrics?.cashTransactions || 0} transactions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-content-primary mb-4">Additional Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-content-secondary">Average Transaction</span>
                  <span className="font-semibold text-content-primary">
                    {formatCurrency(metrics?.averageTransaction || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-content-secondary">Failure Rate</span>
                  <span className="font-semibold text-status-error">
                    {formatPercent(metrics?.failureRate || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-content-secondary">Refunds</span>
                  <div className="text-right">
                    <p className="font-semibold text-content-primary">
                      {formatCurrency(metrics?.refundAmount || 0)}
                    </p>
                    <p className="text-sm text-content-secondary">
                      {metrics?.refundCount || 0} refunds
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-secondary">
                  <p className="text-xs text-content-tertiary">
                    Last updated: {format(new Date(), 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}