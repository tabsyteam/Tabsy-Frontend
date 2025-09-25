'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@tabsy/ui-components'
import { Banknote, Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle, Users } from 'lucide-react'
import { Payment, PaymentStatus, PaymentMethod, Order } from '@tabsy/shared-types'
import { formatDistanceToNow } from 'date-fns'
import { tabsyClient } from '@tabsy/api-client'
import { toast } from 'sonner'
import { useWebSocketEvent } from '@tabsy/ui-components'

interface PendingCashPaymentsProps {
  restaurantId: string
}

interface PendingPaymentWithOrder extends Payment {
  order?: Order
}

export function PendingCashPayments({ restaurantId }: PendingCashPaymentsProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set())

  // Fetch pending cash payments for the restaurant
  const fetchPendingPayments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        // We'll need to filter by PENDING status and CASH method on the frontend
        // since the API doesn't have specific filters for this yet
      })

      if (response.success && response.data) {
        // Filter for pending cash payments
        const cashPayments = response.data.filter(payment =>
          payment.method === PaymentMethod.CASH &&
          payment.status === PaymentStatus.PENDING
        )

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
              console.error(`Error fetching order ${payment.orderId}:`, error)
              return payment
            }
          })
        )

        setPendingPayments(paymentsWithOrders)
      }
    } catch (error) {
      console.error('Error fetching pending cash payments:', error)
      toast.error('Failed to load pending cash payments')
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    fetchPendingPayments()
  }, [fetchPendingPayments])

  // Handle cash payment confirmation
  const handleConfirmPayment = async (payment: PendingPaymentWithOrder) => {
    setProcessingPayments(prev => new Set([...prev, payment.id]))

    try {
      const response = await tabsyClient.payment.recordCash({
        orderId: payment.orderId,
        amount: payment.amount
      })

      if (response.success) {
        toast.success('Cash Payment Confirmed', {
          description: `Payment of $${payment.amount.toFixed(2)} confirmed for order #${payment.order?.orderNumber || payment.orderId}`
        })

        // Remove from pending list
        setPendingPayments(prev => prev.filter(p => p.id !== payment.id))
      } else {
        throw new Error(response.error || 'Failed to confirm payment')
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

        // Remove from pending list
        setPendingPayments(prev => prev.filter(p => p.id !== payment.id))
      } else {
        throw new Error(response.error || 'Failed to cancel payment')
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

  // WebSocket event handlers for real-time updates
  useWebSocketEvent('payment:created', (data: any) => {
    if (data.paymentMethod === 'CASH' && data.status === 'PENDING') {
      fetchPendingPayments()
    }
  }, [fetchPendingPayments])

  useWebSocketEvent('payment:completed', (data: any) => {
    if (data.paymentMethod === 'CASH') {
      // Remove completed payment from list
      setPendingPayments(prev => prev.filter(p => p.id !== data.paymentId))
    }
  }, [])

  useWebSocketEvent('payment:cancelled', (data: any) => {
    if (data.paymentMethod === 'CASH') {
      // Remove cancelled payment from list
      setPendingPayments(prev => prev.filter(p => p.id !== data.paymentId))
    }
  }, [])

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
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Banknote className="w-5 h-5 text-status-warning" />
          <h2 className="text-lg font-semibold">Pending Cash Payments</h2>
          <span className="bg-status-warning/10 text-status-warning px-2 py-1 rounded-full text-xs font-medium">
            {pendingPayments.length}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPendingPayments}
          disabled={loading}
          className="flex items-center space-x-1"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
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
                    <span className="font-semibold text-lg">${payment.amount.toFixed(2)}</span>
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
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  {processingPayments.has(payment.id) ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
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
  )
}