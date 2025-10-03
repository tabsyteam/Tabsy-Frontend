'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import { SessionManager } from '@/lib/session'
import { Button } from '@tabsy/ui-components'
import { CreditCard, Split, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import { PaymentType } from '@/constants/payment'
import { useBillStatus } from '@/hooks/useBillData' // ✅ Updated to use React Query version
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

  // ARCHITECTURE FIX: Use shared useBillStatus hook instead of duplicate state
  // This ensures bill amount is consistent across BottomNav badge and this component
  const {
    bill,
    isLoading,
    error,
    refreshBillStatus
  } = useBillStatus()

  // Retry function - now delegates to hook's refresh
  const handleRetry = useCallback(() => {
    refreshBillStatus()
  }, [refreshBillStatus])


  // Memoized payment initiation functions
  const initiatePayment = useCallback(async () => {
    try {
      const session = SessionManager.getDiningSession()
      if (!session) {
        toast.error('Session not found. Please scan the QR code at your table.')
        return
      }

      // Navigate to payment page for table session
      const queryParams = new URLSearchParams({
        tableSessionId: tableSession.id,
        type: PaymentType.TABLE_SESSION,
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
        toast.error('Session not found. Please scan the QR code at your table.')
        return
      }

      // Navigate to payment page for split bill
      const queryParams = new URLSearchParams({
        tableSessionId: tableSession.id,
        type: PaymentType.SPLIT_BILL,
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

  // Recalculate bill summary excluding CANCELLED orders
  const adjustedBillSummary = useMemo(() => {
    if (!bill) return null

    let adjustedSubtotal = 0
    let adjustedTax = 0
    let adjustedTip = 0
    let adjustedTotalPaid = 0

    // Calculate totals from only active (non-cancelled) orders
    Object.values(bill.billByRound).forEach((round: any) => {
      round.orders
        .filter((order: any) => order.status !== 'CANCELLED')
        .forEach((order: any) => {
          adjustedSubtotal += Number(order.subtotal || 0)
          adjustedTax += Number(order.tax || 0)
          adjustedTip += Number(order.tip || 0)

          // Calculate paid amount for this order
          const orderPaid = order.payments
            ?.filter((p: any) => p.status === 'COMPLETED')
            ?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0
          adjustedTotalPaid += orderPaid
        })
    })

    const adjustedGrandTotal = adjustedSubtotal + adjustedTax + adjustedTip
    const adjustedRemainingBalance = adjustedGrandTotal - adjustedTotalPaid

    return {
      subtotal: adjustedSubtotal,
      tax: adjustedTax,
      tip: adjustedTip,
      grandTotal: adjustedGrandTotal,
      totalPaid: adjustedTotalPaid,
      remainingBalance: adjustedRemainingBalance,
      isFullyPaid: adjustedRemainingBalance <= 0.01
    }
  }, [bill])

  // Helper function for better floating-point comparison
  const hasRemainingBalance = useMemo(() => {
    if (!adjustedBillSummary) return false
    // Use both isFullyPaid flag and remaining balance with small epsilon for floating-point precision
    const epsilon = 0.01 // 1 cent tolerance
    return !adjustedBillSummary.isFullyPaid && adjustedBillSummary.remainingBalance > epsilon
  }, [adjustedBillSummary])

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
        <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-status-error mx-auto mb-2" />
          <h3 className="font-medium text-status-error mb-1">Unable to Load Bill</h3>
          <p className="text-sm text-status-error mb-4">{error}</p>
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="border-status-error/30 text-status-error hover:bg-status-error/5"
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
      {/* Enhanced Bill Header */}
      <div className="bg-gradient-to-r from-surface to-surface-secondary rounded-xl border border-default shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-content-primary">Table Bill</h2>
            <p className="text-sm text-content-secondary">Complete order summary</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1.5 text-sm font-medium">
              #{bill.sessionCode}
            </div>
          </div>
        </div>

        {/* Enhanced Summary - Using adjusted totals (excluding CANCELLED orders) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-content-secondary">Subtotal</span>
            <span className="font-medium">${(adjustedBillSummary?.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-content-secondary">Tax</span>
            <span className="font-medium">${(adjustedBillSummary?.tax || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-content-secondary">Tip</span>
            <span className="font-medium">${(adjustedBillSummary?.tip || 0).toFixed(2)}</span>
          </div>

          <div className="border-t border-default/50 pt-3">
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-content-primary">Total</span>
              <span className="font-bold text-lg">${(adjustedBillSummary?.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>

          {(adjustedBillSummary?.totalPaid || 0) > 0 && (
            <div className="flex justify-between items-center py-2 bg-status-success/10 rounded-lg px-3 -mx-1">
              <span className="font-medium text-status-success">Amount Paid</span>
              <span className="font-bold text-status-success">-${(adjustedBillSummary?.totalPaid || 0).toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-default pt-3">
            <div className={`flex justify-between items-center py-2 px-3 -mx-1 rounded-lg ${
              hasRemainingBalance
                ? 'bg-status-warning/10 border border-status-warning/20'
                : 'bg-status-success/10 border border-status-success/20'
            }`}>
              <span className={`font-bold text-lg ${
                hasRemainingBalance ? 'text-status-warning' : 'text-status-success'
              }`}>
                {hasRemainingBalance ? 'Outstanding' : 'Balance'}
              </span>
              <span className={`font-bold text-xl ${
                hasRemainingBalance ? 'text-status-warning' : 'text-status-success'
              }`}>
                ${(adjustedBillSummary?.remainingBalance || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Rounds */}
      <div className="space-y-4">
        <h3 className="font-semibold">Order History</h3>
        {Object.entries(bill.billByRound).filter(([, round]) =>
          round.orders.some((order: any) => order.status !== 'CANCELLED')
        ).length === 0 ? (
          <div className="bg-surface rounded-lg border border-default p-8 text-center">
            <p className="text-content-secondary">All orders have been cancelled</p>
          </div>
        ) : (
          Object.entries(bill.billByRound).map(([roundNum, round]) => {
          // Filter out CANCELLED orders - customers should not see or pay for cancelled orders
          const activeOrders = round.orders.filter((order: any) => order.status !== 'CANCELLED')

          // Skip this round entirely if all orders were cancelled
          if (activeOrders.length === 0) {
            return null
          }

          // Determine payment status from payments array
          const ordersWithPaymentStatus = activeOrders.map((order: any) => {
            // Calculate total paid amount from payments array
            const totalPaidForOrder = order.payments
              ?.filter((p: any) => p.status === 'COMPLETED')
              ?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0;

            // Order is paid if total paid equals or exceeds order total (with small epsilon for floating point)
            const isPaid = order.isPaid ?? (totalPaidForOrder >= Number(order.total) - 0.01);

            return {
              ...order,
              isPaid,
              paidAmount: totalPaidForOrder
            };
          });

          const paidOrdersCount = ordersWithPaymentStatus.filter((o) => o.isPaid).length
          const totalOrdersCount = ordersWithPaymentStatus.length
          const hasUnpaidOrders = ordersWithPaymentStatus.some((o) => !o.isPaid)

          return (
            <div key={roundNum} className="bg-surface rounded-lg border border-default p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Round {roundNum}</h4>
                {paidOrdersCount > 0 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    hasUnpaidOrders
                      ? 'bg-status-warning/10 text-status-warning'
                      : 'bg-status-success/10 text-status-success'
                  }`}>
                    {paidOrdersCount} of {totalOrdersCount} paid
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {ordersWithPaymentStatus.map(order => (
                  <div key={order.orderId} className={`rounded p-3 transition-all ${
                    order.isPaid
                      ? 'bg-status-success/10 border-2 border-status-success/20 opacity-75'
                      : 'bg-surface-secondary'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${order.isPaid ? 'line-through text-status-success' : ''}`}>
                          {order.orderNumber}
                        </span>
                        {order.isPaid && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-status-success/20 text-status-success">
                            ✓ Paid
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-content-secondary">
                        by {order.placedBy}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item, idx: number) => (
                        <div key={idx} className={`flex justify-between text-sm ${
                          order.isPaid ? 'text-status-success' : ''
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
                      order.isPaid ? 'text-status-success' : ''
                    }`}>
                      <span className={order.isPaid ? 'line-through' : ''}>Order Total</span>
                      <span className={order.isPaid ? 'line-through' : ''}>
                        ${Number(order.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-medium mt-3 pt-3 border-t border-default">
                <span>Round {roundNum} Total</span>
                <span>${activeOrders.reduce((sum, order: any) => sum + Number(order.total || 0), 0).toFixed(2)}</span>
              </div>
            </div>
          )
        })
        )}
      </div>

      {/* Payment Options - Only show when there's an outstanding balance */}
      {hasRemainingBalance && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold flex items-center justify-center space-x-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>Ready to Pay?</span>
            </h3>
            <p className="text-sm text-content-secondary">
              Choose how you'd like to settle your bill
            </p>
          </div>

          {/* Payment Action Buttons */}
          <div className="space-y-3">
            {/* Full Payment Button */}
            <Button
              onClick={initiatePayment}
              size="lg"
              className="w-full h-14 flex items-center justify-center space-x-3 bg-gradient-to-r from-primary to-primary-hover shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <CreditCard className="w-5 h-5" />
              <div className="flex flex-col items-center">
                <span className="font-semibold">Pay Full Amount</span>
                <span className="text-sm opacity-90">${(adjustedBillSummary?.remainingBalance || 0).toFixed(2)}</span>
              </div>
            </Button>

            {/* Split Payment - only show if multiple users */}
            {users.length > 1 && (
              <Button
                onClick={initiateSplitPayment}
                variant="outline"
                size="lg"
                className="w-full h-14 flex items-center justify-center space-x-3 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
              >
                <Split className="w-5 h-5 text-primary" />
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-content-secondary">Split Bill</span>
                  <div className="flex items-center space-x-1 text-sm text-content-secondary">
                    <Users className="w-3 h-3" />
                    <span>{users.length} people</span>
                  </div>
                </div>
              </Button>
            )}
          </div>

          {/* Enhanced info for multiple diners */}
          {users.length > 1 && (
            <div className="bg-gradient-to-r from-surface to-surface-secondary border border-default rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-status-info mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-status-info">Multiple Diners Detected</p>
                  <p className="text-sm text-status-info">
                    {users.length} people are dining at this table. You can pay the full amount or split the bill fairly among everyone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Payment Complete Section */}
      {adjustedBillSummary?.isFullyPaid && (
        <div className="relative overflow-hidden bg-gradient-to-br from-surface via-surface-secondary to-surface-tertiary border-2 border-status-success/30 rounded-2xl p-8 text-center shadow-lg">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-4 left-4 w-16 h-16 bg-status-success/20 rounded-full"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 bg-status-success/20 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-status-success/20 rounded-full"></div>
          </div>

          <div className="relative z-10 space-y-4">
            {/* Animated checkmark */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-status-success/10 rounded-full mb-2">
              <div className="text-5xl animate-bounce">🎉</div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-status-success">Payment Complete!</h3>
              <p className="text-status-success font-medium">
                All settled! Thank you for dining with us.
              </p>

              {/* Payment summary */}
              <div className="inline-flex items-center justify-center bg-surface/60 backdrop-blur-sm border border-status-success/30 rounded-full px-4 py-2 mt-4">
                <span className="text-sm font-semibold text-status-success">
                  Total Paid: ${(adjustedBillSummary?.totalPaid || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Additional message based on user count */}
            <div className="pt-4 border-t border-status-success/30">
              <p className="text-sm text-status-success">
                {users.length > 1
                  ? `Hope you all enjoyed your meal together! 🍽️`
                  : `Hope you enjoyed your meal! Come back soon! 🍽️`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoized component export for performance optimization
export const TableSessionBill = memo(TableSessionBillComponent)