'use client'

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@tabsy/ui-components'
import {
  Clock,
  CreditCard,
  Smartphone,
  Banknote,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  User,
  MapPin,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { format, formatDistanceToNow } from 'date-fns'
import type { Payment, PaymentStatus, PaymentMethod } from '@tabsy/shared-types'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { PaymentDetailsModal } from './PaymentDetailsModal'

interface ActivePaymentsProps {
  restaurantId: string
  hideControls?: boolean
  filterStatus?: string
}

export interface ActivePaymentsRef {
  refetch: () => void
  exportData: () => void
}

export const ActivePayments = forwardRef<ActivePaymentsRef, ActivePaymentsProps>(
  ({ restaurantId, hideControls = false, filterStatus = 'all' }, ref) => {
  const [realtimeUpdates, setRealtimeUpdates] = useState(0)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const queryClient = useQueryClient()
  const { isConnected } = useWebSocket()

  const { data: activePayments, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant', 'active-payments', restaurantId, filterStatus],
    queryFn: async () => {
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        limit: 100
        // Server-side filtering for restaurant-specific payments
      })

      if (response.success && response.data) {
        // Apply parent filter status
        let filteredData = response.data
        if (filterStatus === 'all') {
          // Filter for active payments (pending, processing)
          filteredData = response.data.filter((payment: Payment) =>
            ['PENDING', 'PROCESSING'].includes(payment.status)
          )
        } else {
          // Apply specific status filter
          filteredData = response.data.filter((payment: Payment) =>
            payment.status === filterStatus
          )
        }

        return filteredData.sort((a: Payment, b: Payment) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }
      throw new Error('Failed to fetch active payments')
    },
    refetchInterval: false, // Removed polling - rely on WebSockets only
  })

  // WebSocket event handlers for real-time payment updates
  const handlePaymentCreated = useCallback((data: any) => {
    console.log('🆕🎯 [ActivePayments] Payment created event received:', data)
    console.log('🆕🎯 [ActivePayments] Current restaurant ID:', restaurantId)
    console.log('🆕🎯 [ActivePayments] Event data restaurant ID:', data?.restaurantId)
    console.log('🆕🎯 [ActivePayments] Payment data keys:', Object.keys(data || {}))

    // Only process events for this restaurant
    if (data?.restaurantId !== restaurantId) {
      console.log('🆕❌ [ActivePayments] Ignoring event - different restaurant:', data?.restaurantId, 'vs', restaurantId)
      return
    }

    // Force immediate refetch like order handlers do
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'active-payments', restaurantId] })

    // Also invalidate payments list to refresh payment components
    queryClient.invalidateQueries({
      queryKey: ['restaurants', restaurantId, 'payments']
    })

    setRealtimeUpdates(prev => prev + 1)

    // Add toast notification like OrdersManagement does
    console.log('💳✅ [ActivePayments] Payment created - queries invalidated and UI updated')
  }, [queryClient, restaurantId])

  const handlePaymentStatusUpdated = useCallback((data: any) => {
    console.log('🔄🎯 [ActivePayments] Payment status updated event received:', data)

    // Only process events for this restaurant
    if (data?.restaurantId !== restaurantId) {
      console.log('🔄❌ [ActivePayments] Ignoring status update - different restaurant:', data?.restaurantId, 'vs', restaurantId)
      return
    }

    // Update cached payment data
    queryClient.setQueryData(['restaurant', 'active-payments', restaurantId], (oldData: Payment[] | undefined) => {
      if (!oldData) return oldData

      return oldData.map(payment =>
        payment.id === data.paymentId
          ? { ...payment, status: data.status as PaymentStatus, updatedAt: data.updatedAt }
          : payment
      ).filter(payment =>
        // Keep only pending/processing payments for active view
        ['PENDING', 'PROCESSING'].includes(payment.status)
      )
    })
    setRealtimeUpdates(prev => prev + 1)
  }, [queryClient, restaurantId])

  const handlePaymentCompleted = useCallback((data: any) => {
    console.log('✅🎯 [ActivePayments] Payment completed event received:', data)

    // Only process events for this restaurant
    if (data?.restaurantId !== restaurantId) {
      console.log('✅❌ [ActivePayments] Ignoring completion - different restaurant:', data?.restaurantId, 'vs', restaurantId)
      return
    }

    // Remove completed payment from active payments
    queryClient.setQueryData(['restaurant', 'active-payments', restaurantId], (oldData: Payment[] | undefined) => {
      if (!oldData) return oldData
      return oldData.filter(payment => payment.id !== data.paymentId)
    })
    setRealtimeUpdates(prev => prev + 1)
  }, [queryClient, restaurantId])

  const handlePaymentFailed = useCallback((data: any) => {
    console.log('❌ Payment failed:', data)

    // Only process events for this restaurant
    if (data?.restaurantId !== restaurantId) {
      console.log('❌❌ [ActivePayments] Ignoring failure - different restaurant:', data?.restaurantId, 'vs', restaurantId)
      return
    }

    // Update payment status and error message
    queryClient.setQueryData(['restaurant', 'active-payments', restaurantId], (oldData: Payment[] | undefined) => {
      if (!oldData) return oldData

      return oldData.map(payment =>
        payment.id === data.paymentId
          ? { ...payment, status: 'FAILED' as PaymentStatus, failureReason: data.errorMessage }
          : payment
      )
    })
    setRealtimeUpdates(prev => prev + 1)
  }, [queryClient, restaurantId])

  const handlePaymentCancelled = useCallback((data: any) => {
    console.log('🚫 Payment cancelled:', data)

    // Only process events for this restaurant
    if (data?.restaurantId !== restaurantId) {
      console.log('🚫❌ [ActivePayments] Ignoring cancellation - different restaurant:', data?.restaurantId, 'vs', restaurantId)
      return
    }

    // Remove cancelled payment from active payments
    queryClient.setQueryData(['restaurant', 'active-payments', restaurantId], (oldData: Payment[] | undefined) => {
      if (!oldData) return oldData
      return oldData.filter(payment => payment.id !== data.paymentId)
    })
    setRealtimeUpdates(prev => prev + 1)
  }, [queryClient, restaurantId])

  // Handler for table session payment updates (actual payment creation events from backend)
  const handleTableSessionPaymentUpdated = useCallback((data: any) => {
    console.log('🆕🎯 [ActivePayments] Table session payment updated (payment created):', data)
    console.log('🆕🎯 [ActivePayments] Current restaurant ID:', restaurantId)
    console.log('🆕🎯 [ActivePayments] Event data keys:', Object.keys(data || {}))

    // Only process events for this restaurant
    if (data?.restaurantId !== restaurantId) {
      console.log('🆕❌ [ActivePayments] Ignoring table session update - different restaurant:', data?.restaurantId, 'vs', restaurantId)
      return
    }

    queryClient.invalidateQueries({ queryKey: ['restaurant', 'active-payments', restaurantId] })
    queryClient.invalidateQueries({ queryKey: ['restaurants', restaurantId, 'payments'] })
    queryClient.invalidateQueries({ queryKey: ['table-sessions', restaurantId] })

    setRealtimeUpdates(prev => prev + 1)
    console.log('💳✅ [ActivePayments] Table session payment updated - queries invalidated and UI updated')
  }, [queryClient, restaurantId])

  // Register WebSocket event listeners
  console.log('🎯🔥 [ActivePayments] Registering WebSocket event listeners for restaurant:', restaurantId)
  useWebSocketEvent('payment:created', handlePaymentCreated, [handlePaymentCreated], 'ActivePayments-created')
  useWebSocketEvent('payment:status_updated', handlePaymentStatusUpdated, [handlePaymentStatusUpdated], 'ActivePayments-status')
  useWebSocketEvent('payment:completed', handlePaymentCompleted, [handlePaymentCompleted], 'ActivePayments-completed')
  useWebSocketEvent('payment:failed', handlePaymentFailed, [handlePaymentFailed], 'ActivePayments-failed')
  useWebSocketEvent('payment:cancelled', handlePaymentCancelled, [handlePaymentCancelled], 'ActivePayments-cancelled')
  useWebSocketEvent('table_session:payment_updated', handleTableSessionPaymentUpdated, [handleTableSessionPaymentUpdated], 'ActivePayments-table-session')
  console.log('🎯🔥 [ActivePayments] All WebSocket event listeners registered')

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
      case 'PENDING':
        return <Clock className="w-4 h-4 text-status-warning" />
      case 'PROCESSING':
        return <RefreshCw className="w-4 h-4 text-status-info animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4 text-content-tertiary" />
    }
  }

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Pending'
      case 'PROCESSING':
        return 'Processing'
      default:
        return status
    }
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20'
      case 'PROCESSING':
        return 'bg-status-info/10 text-status-info border-status-info/20'
      default:
        return 'bg-surface-secondary text-content-secondary'
    }
  }

  const getPriorityLevel = (payment: Payment) => {
    const createdAt = new Date(payment.createdAt)
    const now = new Date()
    const minutesAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    if (minutesAgo > 15) return 'high'
    if (minutesAgo > 10) return 'medium'
    return 'low'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-status-error'
      case 'medium':
        return 'border-l-status-warning'
      default:
        return 'border-l-status-info'
    }
  }

  const handleViewPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId)
    setIsModalOpen(true)
  }

  const handleExportPayments = async () => {
    try {
      setIsExporting(true)
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        limit: 1000,
        status: 'PENDING' // Export only pending payments
      })

      if (response.success && response.data) {
        // Create CSV content
        const headers = ['Payment ID', 'Amount', 'Status', 'Method', 'Order ID', 'Created At']
        const csvContent = [
          headers.join(','),
          ...response.data.map(payment => [
            payment.id.slice(-8),
            `$${Number(payment.amount || 0).toFixed(2)}`,
            payment.status,
            payment.paymentMethod,
            payment.orderId?.slice(-8) || 'N/A',
            new Date(payment.createdAt).toLocaleString()
          ].join(','))
        ].join('\n')

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `active-payments-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting payments:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    refetch,
    exportData: handleExportPayments
  }), [refetch, handleExportPayments])

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-content-primary mb-2">
          Error Loading Active Payments
        </h3>
        <p className="text-content-secondary mb-4">
          Unable to load active payments. Please try again.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-content-primary">Active Payments</h2>
            <p className="text-content-secondary mt-1">
              Monitor payments currently being processed
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* WebSocket Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-status-success" />
                  <span className="text-xs text-status-success">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-status-error" />
                  <span className="text-xs text-status-error">Offline</span>
                </>
              )}
              {realtimeUpdates > 0 && (
                <span className="text-xs text-content-tertiary">
                  ({realtimeUpdates} live updates)
                </span>
              )}
            </div>

            {!hideControls && (
              <>
                <Button
                  onClick={handleExportPayments}
                  disabled={isExporting || !activePayments || activePayments.length === 0}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                </Button>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-secondary rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-status-warning" />
              <div>
                <p className="text-sm text-content-secondary">Pending</p>
                <p className="text-lg font-semibold text-content-primary">
                  {activePayments?.filter(p => p.status === 'PENDING').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-secondary rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-status-info" />
              <div>
                <p className="text-sm text-content-secondary">Processing</p>
                <p className="text-lg font-semibold text-content-primary">
                  {activePayments?.filter(p => p.status === 'PROCESSING').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-secondary rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-status-error" />
              <div>
                <p className="text-sm text-content-secondary">Attention Needed</p>
                <p className="text-lg font-semibold text-content-primary">
                  {activePayments?.filter(p => getPriorityLevel(p) === 'high').length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Payments List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-surface rounded-lg border p-4">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-surface-secondary rounded-lg"></div>
                        <div>
                          <div className="h-4 bg-surface-secondary rounded w-24 mb-2"></div>
                          <div className="h-3 bg-surface-secondary rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-surface-secondary rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !activePayments || activePayments.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-status-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-content-primary mb-2">
              All Caught Up!
            </h3>
            <p className="text-content-secondary">
              No active payments requiring attention at the moment.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {activePayments.map((payment) => {
              const priority = getPriorityLevel(payment)
              return (
                <div
                  key={payment.id}
                  className={`bg-surface rounded-lg border border-l-4 ${getPriorityColor(priority)} p-4 transition-colors hover:bg-surface-secondary`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        {getPaymentMethodIcon(payment.paymentMethod)}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-content-primary">
                            ${Number(payment.amount || 0).toFixed(2)}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}
                          >
                            {getStatusLabel(payment.status)}
                          </span>
                          {priority === 'high' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-status-error/10 text-status-error border border-status-error/20">
                              Urgent
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 mt-1 text-sm text-content-secondary">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>Order #{payment.orderId?.slice(-6) || 'N/A'}</span>
                          </div>

                          {(payment as any).tableId && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>Table {(payment as any).tableId}</span>
                            </div>
                          )}

                          <span>
                            {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm text-content-secondary">
                        <p>{format(new Date(payment.createdAt), 'h:mm a')}</p>
                        <p>{payment.paymentMethod}</p>
                      </div>

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
                        <span>Error: {payment.failureReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
})

ActivePayments.displayName = 'ActivePayments'