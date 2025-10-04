'use client'

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@tabsy/ui-components'
import { Banknote, Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle, Users } from 'lucide-react'
import { Payment, PaymentStatus, PaymentMethod, Order } from '@tabsy/shared-types'
import { formatDistanceToNow } from 'date-fns'
import { tabsyClient } from '@tabsy/api-client'
import { toast } from 'sonner'
import { logger } from '../../lib/logger'
import { PAYMENT_QUERY_LIMIT } from '../../lib/constants'

interface PendingCashPaymentsProps {
  restaurantId: string
  isVisible?: boolean
}

interface PendingPaymentWithOrder extends Payment {
  order?: Order
}

export interface PendingCashPaymentsRef {
  refetch: () => void
}

export const PendingCashPayments = forwardRef<PendingCashPaymentsRef, PendingCashPaymentsProps>(
  ({ restaurantId, isVisible = true }, ref) => {
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  /**
   * SENIOR ARCHITECTURE NOTE:
   * WebSocket listeners removed - centralized in PaymentManagement.tsx
   * Component relies on React Query cache updates from usePaymentWebSocketSync
   */

  // Use React Query for data fetching - prevents duplicate API calls
  const { data: pendingPayments = [], isLoading: loading, refetch } = useQuery<PendingPaymentWithOrder[]>({
    queryKey: ['restaurant', 'pending-cash-payments', restaurantId],
    queryFn: async () => {
      logger.debug('Fetching pending cash payments', { restaurantId })
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        limit: PAYMENT_QUERY_LIMIT
      })

      if (response.success && response.data) {
        logger.debug('Pending cash payments fetched', { total: response.data.length })
        // Filter for pending/processing cash payments
        const cashPayments = response.data.filter(payment =>
          payment.paymentMethod === PaymentMethod.CASH &&
          (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING)
        )
        logger.debug('Filtered cash payments', { count: cashPayments.length })

        // Fetch order details for each payment
        const paymentsWithOrders = await Promise.all(
          cashPayments.map(async (payment) => {
            try {
              const orderResponse = await tabsyClient.order.getById(payment.orderId)
              return {
                ...payment,
                order: orderResponse.success ? orderResponse.data : undefined
              }
            } catch (error) {
              logger.error(`Error fetching order ${payment.orderId}`, error)
              return payment
            }
          })
        )

        return paymentsWithOrders
      }
      throw new Error('Failed to fetch pending cash payments')
    },
    enabled: !!restaurantId,
  })

  // Expose refetch method to parent
  useImperativeHandle(ref, () => ({
    refetch
  }), [refetch])

  // Handle cash payment confirmation
  const handleConfirmPayment = async (payment: PendingPaymentWithOrder) => {
    setProcessingPayments(prev => new Set([...prev, payment.id]))

    try {
      // Update existing payment status from PENDING/PROCESSING to COMPLETED
      const response = await tabsyClient.payment.updateStatus(payment.id, PaymentStatus.COMPLETED)

      if (response.success) {
        toast.success('Cash Payment Confirmed', {
          description: `Payment of $${Number(payment.amount || 0).toFixed(2)} confirmed for order #${payment.order?.orderNumber || payment.orderId}`
        })

        // Update React Query cache to remove the payment
        queryClient.setQueryData(['restaurant', 'pending-cash-payments', restaurantId], (oldData: PendingPaymentWithOrder[] | undefined) => {
          return oldData?.filter(p => p.id !== payment.id) || []
        })
      } else {
        throw new Error((response.error as any)?.message || 'Failed to confirm payment')
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error)
      toast.error('Failed to confirm cash payment', {
        description: error.message || 'Please try again'
      })
    } finally {
      setProcessingPayments(prev => {
        const newSet = new Set(prev)
        newSet.delete(payment.id)
        return newSet
      })
    }
  }

  // Handle payment cancellation
  const handleCancelPayment = async (payment: PendingPaymentWithOrder) => {
    setProcessingPayments(prev => new Set([...prev, payment.id]))

    try {
      const response = await tabsyClient.payment.updateStatus(payment.id, PaymentStatus.CANCELLED as any)

      if (response.success) {
        toast.success('Payment Cancelled', {
          description: `Cash payment request for order #${payment.order?.orderNumber || payment.orderId} has been cancelled`
        })

        // Update React Query cache to remove the payment
        queryClient.setQueryData(['restaurant', 'pending-cash-payments', restaurantId], (oldData: PendingPaymentWithOrder[] | undefined) => {
          return oldData?.filter(p => p.id !== payment.id) || []
        })
      } else {
        throw new Error((response.error as any)?.message || 'Failed to cancel payment')
      }
    } catch (error: any) {
      console.error('Error cancelling payment:', error)
      toast.error('Failed to cancel payment', {
        description: error.message || 'Please try again'
      })
    } finally {
      setProcessingPayments(prev => {
        const newSet = new Set(prev)
        newSet.delete(payment.id)
        return newSet
      })
    }
  }

  /**
   * SENIOR ARCHITECTURE NOTE:
   * WebSocket listeners removed - centralized in PaymentManagement.tsx
   * All payment events now handled by usePaymentWebSocketSync hook.
   * Component relies on React Query cache updates from centralized sync.
   */

  const formatTimeAgo = (createdAt: string): string => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true })
      .replace('about ', '')
      .replace(' minutes ago', 'm ago')
      .replace(' minute ago', 'm ago')
      .replace(' hours ago', 'h ago')
      .replace(' hour ago', 'h ago')
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Banknote className="w-5 h-5 text-status-warning" />
          <h2 className="text-lg font-semibold">Pending Cash Payments</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-content-secondary">Loading pending payments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-card rounded-lg border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Banknote className="w-5 h-5 text-status-warning" />
          <h2 className="text-lg font-semibold">Pending Cash Payments</h2>
          <span className="bg-status-warning/10 text-status-warning px-2 py-1 rounded-full text-xs font-medium">
            {pendingPayments.length}
          </span>
        </div>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-2">
            <CheckCircle className="w-12 h-12 text-status-success/50" />
            <h3 className="text-lg font-medium text-content-primary">All Caught Up!</h3>
            <p className="text-sm text-content-secondary">No pending cash payments at the moment</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-secondary/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <Banknote className="w-4 h-4 text-status-warning" />
                    <span className="font-semibold text-lg">${Number(payment.amount || 0).toFixed(2)}</span>
                  </div>

                  <div className="text-sm text-content-secondary">
                    Order #{payment.order?.orderNumber || payment.orderId.slice(-8)}
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-content-tertiary">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(payment.createdAt)}</span>
                  </div>
                </div>

                {payment.order && (
                  <div className="flex items-center space-x-4 text-sm text-content-secondary">
                    {payment.order.customerName && (
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{payment.order.customerName}</span>
                      </div>
                    )}

                    {payment.order.tableId && (
                      <span>Table {payment.order.tableId.slice(-2)}</span>
                    )}

                    <span>{payment.order.items.length} items</span>
                  </div>
                )}

                {/* Warning for old payments */}
                {new Date().getTime() - new Date(payment.createdAt).getTime() > 20 * 60 * 1000 && (
                  <div className="flex items-center space-x-1 mt-2 text-xs text-status-error">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Payment request is over 20 minutes old</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => handleConfirmPayment(payment)}
                  disabled={processingPayments.has(payment.id)}
                  className="bg-status-success hover:bg-status-success/80 text-white"
                >
                  {processingPayments.has(payment.id) ? (
                    <div className="flex items-center space-x-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Confirming...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Confirm</span>
                    </div>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelPayment(payment)}
                  disabled={processingPayments.has(payment.id)}
                  className="border-status-error text-status-error hover:bg-status-error-light hover:border-status-error"
                >
                  {processingPayments.has(payment.id) ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-status-error"></div>
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
})

PendingCashPayments.displayName = 'PendingCashPayments'