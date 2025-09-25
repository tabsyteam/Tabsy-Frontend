'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import { SessionManager } from '@/lib/session'
import { Button } from '@tabsy/ui-components'
import { CreditCard, Split, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import type {
  TableSessionBill as TableSessionBillType,
  TableSessionUser,
  MultiUserTableSession
} from '@tabsy/shared-types'

interface TableSessionBillProps {
  tableSession: MultiUserTableSession
  currentUser: TableSessionUser
  users: TableSessionUser[]
  api: TabsyAPI
  onPaymentInitiated?: () => void
}

const TableSessionBillComponent = ({
  tableSession,
  currentUser,
  users,
  api,
  onPaymentInitiated
}: TableSessionBillProps) => {
  const router = useRouter()
  const [bill, setBill] = useState<TableSessionBillType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Memoized bill loading function with enhanced error handling
  const loadBill = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.tableSession.getBill(tableSession.id)

      if (response.success && response.data) {
        setBill(response.data)
        setRetryCount(0) // Reset retry count on success
      } else {
        throw new Error(response.error?.message || 'Failed to load bill')
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load bill'
      console.error('[TableSessionBill] Error loading bill:', error)
      setError(errorMessage)

      // Only show toast on first error, not retries
      if (retryCount === 0) {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }, [api, tableSession.id, retryCount])

  // Load bill data on mount and when dependencies change
  useEffect(() => {
    loadBill()
  }, [loadBill])

  // Retry function
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1)
    loadBill()
  }, [loadBill])


  // Memoized payment initiation functions
  const initiatePayment = useCallback(async () => {
    try {
      const session = SessionManager.getDiningSession()
      if (!session) {
        toast.error('Session not found')
        return
      }

      // Navigate to payment page for table session
      const queryParams = new URLSearchParams({
        tableSessionId: tableSession.id,
        type: 'table_session',
        restaurant: session.restaurantId,
        table: session.tableId
      })

      router.push(`/payment?${queryParams.toString()}`)
      onPaymentInitiated?.()

    } catch (error) {
      console.error('[TableSessionBill] Error initiating payment:', error)
      toast.error('Failed to initiate payment')
    }
  }, [tableSession.id, router, onPaymentInitiated])

  const initiateSplitPayment = useCallback(async () => {
    try {
      const session = SessionManager.getDiningSession()
      if (!session) {
        toast.error('Session not found')
        return
      }

      // Navigate to payment page for split bill
      const queryParams = new URLSearchParams({
        tableSessionId: tableSession.id,
        type: 'split_bill',
        restaurant: session.restaurantId,
        table: session.tableId
      })

      router.push(`/payment?${queryParams.toString()}`)
      onPaymentInitiated?.()

    } catch (error) {
      console.error('[TableSessionBill] Error initiating split payment:', error)
      toast.error('Failed to initiate split payment')
    }
  }, [tableSession.id, router, onPaymentInitiated])

  // Enhanced loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <LoadingSpinner />
        <p className="text-sm text-content-secondary">Loading bill details...</p>
      </div>
    )
  }

  // Enhanced error state with retry option
  if (error && !bill) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="font-medium text-red-800 mb-1">Unable to Load Bill</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="p-4 text-center">
        <p className="text-content-secondary">No bill data available</p>
      </div>
    )
  }


  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Bill Header */}
      <div className="bg-surface rounded-lg border border-default p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Table Bill</h2>
          <span className="text-sm text-content-secondary">
            Session: {bill.sessionCode}
          </span>
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${bill.summary.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${bill.summary.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tip</span>
            <span>${bill.summary.tip.toFixed(2)}</span>
          </div>
          <hr className="border-default" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${bill.summary.grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-success">
            <span>Paid</span>
            <span>-${(bill.summary.totalPaid || 0).toFixed(2)}</span>
          </div>
          <hr className="border-default" />
          <div className="flex justify-between font-semibold text-lg">
            <span>Remaining</span>
            <span>${bill.summary.remainingBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Order Rounds */}
      <div className="space-y-4">
        <h3 className="font-semibold">Order History</h3>
        {Object.entries(bill.billByRound).map(([roundNum, round]) => (
          <div key={roundNum} className="bg-surface rounded-lg border border-default p-4">
            <h4 className="font-medium mb-3">Round {roundNum}</h4>
            <div className="space-y-3">
              {round.orders.map(order => (
                <div key={order.orderId} className={`rounded p-3 transition-all ${
                  order.isPaid
                    ? 'bg-green-50 border-2 border-green-200 opacity-75'
                    : 'bg-surface-secondary'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${order.isPaid ? 'line-through text-green-700' : ''}`}>
                        {order.orderNumber}
                      </span>
                      {order.isPaid && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Paid
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-content-secondary">
                      by {order.placedBy}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className={`flex justify-between text-sm ${
                        order.isPaid ? 'text-green-700' : ''
                      }`}>
                        <span className={order.isPaid ? 'line-through' : ''}>
                          {item.quantity}x {item.name}
                        </span>
                        <span className={order.isPaid ? 'line-through' : ''}>
                          ${Number(item.subtotal || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={`flex justify-between font-medium mt-2 pt-2 border-t border-default ${
                    order.isPaid ? 'text-green-700' : ''
                  }`}>
                    <span className={order.isPaid ? 'line-through' : ''}>Order Total</span>
                    <span className={order.isPaid ? 'line-through' : ''}>
                      ${Number(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                  {order.isPaid && order.payments && order.payments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <div className="text-xs text-green-700">
                        Payment: {order.payments.map((p: any) =>
                          `${p.method} $${Number(p.amount).toFixed(2)}`
                        ).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between font-medium mt-3 pt-3 border-t border-default">
              <span>Round {roundNum} Total</span>
              <span>${round.roundTotal.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Options */}
      {bill.summary.remainingBalance > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Options</span>
          </h3>

          {/* Payment Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {/* Full Payment */}
            <Button
              onClick={initiatePayment}
              size="lg"
              className="w-full flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Full Amount • ${bill.summary.remainingBalance.toFixed(2)}</span>
            </Button>

            {/* Split Payment - only show if multiple users */}
            {users.length > 1 && (
              <Button
                onClick={initiateSplitPayment}
                variant="outline"
                size="lg"
                className="w-full flex items-center justify-center space-x-2"
              >
                <Split className="w-4 h-4" />
                <span>Split Bill</span>
                <Users className="w-4 h-4" />
                <span>({users.length} people)</span>
              </Button>
            )}
          </div>

          {/* Info for multiple diners */}
          {users.length > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-sm text-blue-800">
                <Users className="w-4 h-4" />
                <span>
                  {users.length} people are dining at this table. Use "Split Bill" to divide the payment among participants.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Complete */}
      {bill.summary.isFullyPaid && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="font-semibold text-success mb-1">Payment Complete!</h3>
          <p className="text-sm text-content-secondary">
            Thank you for dining with us!
          </p>
        </div>
      )}
    </div>
  )
}

// Memoized component export for performance optimization
export const TableSessionBill = memo(TableSessionBillComponent)