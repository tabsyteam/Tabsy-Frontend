'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@tabsy/ui-components'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Calendar,
  ArrowUp,
  ArrowDown,
  Target,
  BarChart3
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import type { PaymentMetrics, RealTimePaymentMetrics, PaymentHealthStatus, PaymentAlert } from '@tabsy/shared-types'

interface PaymentAnalyticsProps {
  restaurantId: string
}

export function PaymentAnalytics({ restaurantId }: PaymentAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | '3months'>('month')
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'transactions' | 'success_rate'>('revenue')
  const queryClient = useQueryClient()
  const { isConnected } = useWebSocket()

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant', 'payment-analytics', restaurantId, selectedPeriod],
    queryFn: async () => {
      const period = selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'quarter'
      const response = await tabsyClient.paymentMetrics.getMetricsForPeriod(period, restaurantId, true)

      if (response.success && response.data) {
        return response.data
      }
      throw new Error('Failed to fetch payment analytics')
    },
    staleTime: 300000, // 5 minutes - rely on WebSocket for real-time updates
    retry: (failureCount, error) => {
      // Don't retry if we're getting 404s or other client errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number
        if (status >= 400 && status < 500) return false
      }
      return failureCount < 2
    }
  })

  // Real-time metrics - use WebSocket invalidation instead of polling
  const { data: realtimeMetrics } = useQuery({
    queryKey: ['restaurant', 'payment-realtime', restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getRealTimeMetrics(restaurantId)
      return response.data
    },
    staleTime: 60000, // 1 minute - rely on WebSocket for updates
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number
        if (status >= 400 && status < 500) return false
      }
      return failureCount < 2
    }
  })

  // Payment health status - use WebSocket invalidation
  const { data: healthStatus } = useQuery({
    queryKey: ['restaurant', 'payment-health', restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getHealthStatus(restaurantId)
      return response.data
    },
    staleTime: 120000, // 2 minutes - rely on WebSocket for updates
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number
        if (status >= 400 && status < 500) return false
      }
      return failureCount < 2
    }
  })

  // Payment alerts - use WebSocket invalidation
  const { data: alerts } = useQuery({
    queryKey: ['restaurant', 'payment-alerts', restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getAlerts(restaurantId)
      return response.data || []
    },
    staleTime: 120000, // 2 minutes - rely on WebSocket for updates
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number
        if (status >= 400 && status < 500) return false
      }
      return failureCount < 2
    }
  })

  // WebSocket event handlers for payment-related events
  const handlePaymentEvent = useCallback(() => {
    // Invalidate all payment-related queries when any payment event occurs
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'payment-realtime', restaurantId] })
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'payment-health', restaurantId] })
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'payment-alerts', restaurantId] })
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'payment-analytics', restaurantId] })
  }, [queryClient, restaurantId])

  // Register WebSocket event listeners for all payment events
  useWebSocketEvent('payment:completed', handlePaymentEvent, [handlePaymentEvent])
  useWebSocketEvent('payment:failed', handlePaymentEvent, [handlePaymentEvent])
  useWebSocketEvent('payment:created', handlePaymentEvent, [handlePaymentEvent])
  useWebSocketEvent('payment:refunded', handlePaymentEvent, [handlePaymentEvent])
  useWebSocketEvent('payment:cancelled', handlePaymentEvent, [handlePaymentEvent])


  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatPercent = (percent: number) => `${percent.toFixed(1)}%`

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-status-success" />
    if (value < 0) return <ArrowDown className="w-4 h-4 text-status-error" />
    return null
  }

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('PaymentAnalytics Debug:', {
      isConnected,
      restaurantId,
      selectedPeriod,
      hasAnalytics: !!analytics,
      hasPeakHours: !!analytics?.peakHours,
      hasTopDays: !!analytics?.topDays,
      peakHoursCount: analytics?.peakHours?.length || 0,
      topDaysCount: analytics?.topDays?.length || 0,
      error: error?.message
    })
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-status-success'
    if (value < 0) return 'text-status-error'
    return 'text-content-secondary'
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'week': return 'Last 7 Days'
      case 'month': return 'Last 30 Days'
      case '3months': return 'Last 90 Days'
      default: return 'Last 30 Days'
    }
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-content-primary mb-2">
          Error Loading Analytics
        </h3>
        <p className="text-content-secondary mb-4">
          Unable to load payment analytics. Please try again.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-content-primary">Payment Analytics</h2>
          <p className="text-content-secondary mt-1">
            Detailed insights and trends for your payment data
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-surface-secondary rounded-lg p-1">
            {(['week', 'month', '3months'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-surface text-content-primary shadow-sm'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Payment Health Status & Alerts */}
      <div className="flex items-center justify-between">
        {/* Payment Health Status */}
        {healthStatus && (
          <div className={`flex items-center px-4 py-2 rounded-lg border ${
            healthStatus.status === 'HEALTHY' ? 'bg-status-success/10 border-status-success/20 text-status-success' :
            healthStatus.status === 'WARNING' ? 'bg-status-warning/10 border-status-warning/20 text-status-warning' :
            healthStatus.status === 'CRITICAL' ? 'bg-status-error/10 border-status-error/20 text-status-error' :
            'bg-status-info/10 border-status-info/20 text-status-info'
          }`}>
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">System {healthStatus.status}</span>
            <span className="text-xs ml-2">Score: {healthStatus.score}/100</span>
          </div>
        )}

        {/* Real-time Metrics Summary */}
        {realtimeMetrics && (
          <div className="flex items-center space-x-4 text-sm text-content-secondary">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1 text-status-warning" />
              <span>Live: {realtimeMetrics.pendingPayments} pending</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-1 text-status-success" />
              <span>Recent: ${realtimeMetrics.recentRevenue?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-status-warning/10 border border-status-warning/20 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-status-warning mr-2" />
            <h3 className="text-sm font-medium text-status-warning">Payment Alerts ({alerts.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.slice(0, 4).map((alert, index) => (
              <div key={index} className={`text-xs px-3 py-2 rounded ${
                alert.severity === 'CRITICAL' ? 'bg-status-error/20 text-status-error' :
                alert.severity === 'HIGH' ? 'bg-status-warning/20 text-status-warning' :
                'bg-status-info/20 text-status-info'
              }`}>
                <span className="font-medium">{alert.severity}:</span> {alert.message}
              </div>
            ))}
            {alerts.length > 4 && (
              <div className="text-xs text-content-tertiary col-span-full text-center">
                +{alerts.length - 4} more alerts
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-lg border p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-surface-secondary rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-8 bg-surface-secondary rounded"></div>
                  <div className="h-8 bg-surface-secondary rounded"></div>
                  <div className="h-8 bg-surface-secondary rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Total Revenue</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {formatCurrency(analytics?.totalRevenue || 0)}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 text-sm ${getTrendColor(analytics?.revenueGrowth || 0)}`}>
                  {getTrendIcon(analytics?.revenueGrowth || 0)}
                  <span>{formatPercent(Math.abs(analytics?.revenueGrowth || 0))}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Transactions</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {analytics?.totalTransactions || 0}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 text-sm ${getTrendColor(analytics?.transactionGrowth || 0)}`}>
                  {getTrendIcon(analytics?.transactionGrowth || 0)}
                  <span>{formatPercent(Math.abs(analytics?.transactionGrowth || 0))}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-lg border p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">Avg Transaction</p>
                  <p className="text-2xl font-bold text-content-primary">
                    {formatCurrency(analytics?.averageTransactionValue || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-status-success/10 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-status-success" />
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Success Rate</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {formatPercent(analytics?.successRate || 0)}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 text-sm ${getTrendColor(analytics?.successRateChange || 0)}`}>
                  {getTrendIcon(analytics?.successRateChange || 0)}
                  <span>{formatPercent(Math.abs(analytics?.successRateChange || 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Distribution & Peak Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-content-primary mb-4">Payment Method Distribution</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-content-secondary" />
                    <div>
                      <span className="text-content-primary block">Card Payments</span>
                      <span className="text-xs text-content-tertiary">
                        {analytics?.cardTransactions || 0} transactions · ${analytics?.cardAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-surface-secondary rounded-full h-2">
                      <div
                        className="h-2 bg-primary rounded-full"
                        style={{ width: `${analytics?.cardPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {formatPercent(analytics?.cardPercentage || 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-content-secondary" />
                    <div>
                      <span className="text-content-primary block">Digital Wallet</span>
                      <span className="text-xs text-content-tertiary">
                        {analytics?.digitalWalletTransactions || 0} transactions · ${analytics?.digitalWalletAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-surface-secondary rounded-full h-2">
                      <div
                        className="h-2 bg-secondary rounded-full"
                        style={{ width: `${analytics?.walletPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {formatPercent(analytics?.walletPercentage || 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Banknote className="w-5 h-5 text-content-secondary" />
                    <div>
                      <span className="text-content-primary block">Cash</span>
                      <span className="text-xs text-content-tertiary">
                        {analytics?.cashTransactions || 0} transactions · ${analytics?.cashAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-surface-secondary rounded-full h-2">
                      <div
                        className="h-2 bg-accent rounded-full"
                        style={{ width: `${analytics?.cashPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {formatPercent(analytics?.cashPercentage || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-content-primary mb-4">Peak Hours</h3>
              <div className="space-y-4">
                {analytics?.peakHours?.length ? (
                  analytics.peakHours.map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-primary/20 text-primary' :
                          index === 1 ? 'bg-secondary/20 text-secondary' :
                          'bg-accent/20 text-accent'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-content-primary">
                          {hour.hour === 0 ? '12:00 AM' :
                           hour.hour === 12 ? '12:00 PM' :
                           hour.hour > 12 ? `${hour.hour - 12}:00 PM` : `${hour.hour}:00 AM`}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-content-primary">
                          {hour.transactions} transactions
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-content-secondary">No peak hours data available for selected period</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Metrics & Top Days */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-content-primary mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-status-success" />
                    <span className="text-content-secondary">Success Rate</span>
                  </div>
                  <span className="font-semibold text-content-primary">
                    {formatPercent(analytics?.successRate || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <XCircle className="w-5 h-5 text-status-error" />
                    <div>
                      <span className="text-content-secondary block">Failure Rate</span>
                      <span className="text-xs text-content-tertiary">
                        {analytics?.failedPayments || 0} failed transactions
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold text-status-error">
                    {formatPercent(analytics?.failureRate || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-5 h-5 text-status-warning" />
                    <div>
                      <span className="text-content-secondary block">Refund Rate</span>
                      <span className="text-xs text-content-tertiary">
                        Processing refunds
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold text-status-warning">
                    {formatPercent(analytics?.refundRate || 0)}
                  </span>
                </div>

                {/* Add pending payments info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-status-info" />
                    <div>
                      <span className="text-content-secondary block">Pending</span>
                      <span className="text-xs text-content-tertiary">
                        ${analytics?.pendingAmount?.toFixed(2) || '0.00'} in pending payments
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold text-status-info">
                    {analytics?.pendingPayments || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-content-primary mb-4">Top Performing Days</h3>
              <div className="space-y-4">
                {analytics?.topDays?.length ? (
                  analytics.topDays.slice(0, 3).map((day, index) => (
                    <div key={day.dayOfWeek} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-primary/20 text-primary' :
                          index === 1 ? 'bg-secondary/20 text-secondary' :
                          'bg-accent/20 text-accent'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-content-primary">{day.dayOfWeek}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-content-primary">
                          {formatCurrency(day.averageRevenue)}
                        </p>
                        <p className="text-sm text-content-secondary">
                          {day.averageTransactions.toFixed(0)} avg transactions
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-content-secondary">No top performing days data available for selected period</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trend Chart Placeholder */}
          <div className="bg-surface rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-content-primary">Revenue Trend</h3>
              <div className="flex bg-surface-secondary rounded-lg p-1">
                {(['revenue', 'transactions', 'success_rate'] as const).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedMetric === metric
                        ? 'bg-surface text-content-primary shadow-sm'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    {metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 flex items-center justify-center bg-surface-secondary/50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-content-tertiary mx-auto mb-2" />
                <p className="text-content-secondary">
                  Chart visualization would be implemented here with a charting library
                </p>
                <p className="text-sm text-content-tertiary mt-1">
                  Showing {selectedMetric.replace('_', ' ')} trend for {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}