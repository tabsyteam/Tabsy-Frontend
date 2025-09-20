'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import type {
  TableSessionBill,
  TableSessionUser,
  MultiUserTableSession,
  SplitPaymentOption
} from '@tabsy/shared-types'

interface TableSessionBillProps {
  tableSession: MultiUserTableSession
  currentUser: TableSessionUser
  users: TableSessionUser[]
  api: TabsyAPI
  onPaymentInitiated?: () => void
}

export function TableSessionBill({
  tableSession,
  currentUser,
  users,
  api,
  onPaymentInitiated
}: TableSessionBillProps) {
  const [bill, setBill] = useState<TableSessionBill | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSplitOptions, setShowSplitOptions] = useState(false)
  const [splitOption, setSplitOption] = useState<SplitPaymentOption>({
    type: 'equal',
    participants: [currentUser.guestSessionId]
  })

  // Load bill data
  useEffect(() => {
    const loadBill = async () => {
      try {
        setIsLoading(true)
        const response = await api.tableSession.getBill(tableSession.id)

        if (response.success) {
          setBill(response.data)
        } else {
          throw new Error('Failed to load bill')
        }
      } catch (error) {
        console.error('[TableSessionBill] Error loading bill:', error)
        toast.error('Failed to load bill')
      } finally {
        setIsLoading(false)
      }
    }

    loadBill()
  }, [api, tableSession.id])

  // Handle split payment option changes
  const handleSplitOptionChange = (type: SplitPaymentOption['type']) => {
    setSplitOption({
      type,
      participants: type === 'equal' ? users.map(u => u.guestSessionId) : [currentUser.guestSessionId]
    })
  }

  // Calculate split amounts
  const calculateSplitAmounts = () => {
    if (!bill) return {}

    const amounts: { [guestSessionId: string]: number } = {}
    const { remainingBalance } = bill.summary

    switch (splitOption.type) {
      case 'equal':
        const equalAmount = remainingBalance / splitOption.participants.length
        splitOption.participants.forEach(id => {
          amounts[id] = equalAmount
        })
        break

      case 'by_percentage':
        if (splitOption.percentages) {
          Object.entries(splitOption.percentages).forEach(([id, percentage]) => {
            amounts[id] = (remainingBalance * percentage) / 100
          })
        }
        break

      case 'by_amount':
        if (splitOption.amounts) {
          Object.assign(amounts, splitOption.amounts)
        }
        break

      case 'by_items':
        // Calculate based on item assignments
        const roundTotals: { [guestSessionId: string]: number } = {}

        if (splitOption.itemAssignments) {
          Object.values(bill.billByRound).forEach(round => {
            round.orders.forEach(order => {
              order.items.forEach((item: any) => {
                const assignedTo = splitOption.itemAssignments![item.id] || currentUser.guestSessionId
                roundTotals[assignedTo] = (roundTotals[assignedTo] || 0) + item.subtotal
              })
            })
          })

          // Add proportional tax and tip
          const subtotalSum = Object.values(roundTotals).reduce((sum, val) => sum + val, 0)
          Object.entries(roundTotals).forEach(([id, subtotal]) => {
            const proportion = subtotal / subtotalSum
            amounts[id] = subtotal + (bill.summary.tax * proportion) + (bill.summary.tip * proportion)
          })
        }
        break
    }

    return amounts
  }

  // Initiate payment
  const initiatePayment = async (amount?: number) => {
    try {
      const paymentAmount = amount || bill?.summary.remainingBalance || 0

      // For now, redirect to payment page with amount
      // In a real implementation, this would integrate with the payment system
      const paymentData = {
        tableSessionId: tableSession.id,
        amount: paymentAmount,
        splitOption: amount ? splitOption : null,
        guestSessionId: currentUser.guestSessionId
      }

      // Store payment data for the payment page
      sessionStorage.setItem('pendingPayment', JSON.stringify(paymentData))

      onPaymentInitiated?.()
      toast.success(`Initiating payment for $${paymentAmount.toFixed(2)}`)

      // In a real app, navigate to payment page
      // router.push('/payment')

    } catch (error) {
      console.error('[TableSessionBill] Error initiating payment:', error)
      toast.error('Failed to initiate payment')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="p-4 text-center">
        <p className="text-content-secondary">Unable to load bill</p>
      </div>
    )
  }

  const splitAmounts = calculateSplitAmounts()

  return (
    <div className="p-4 space-y-6">
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
            <span>-${bill.summary.totalPaid.toFixed(2)}</span>
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
                <div key={order.orderId} className="bg-surface-secondary rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-sm text-content-secondary">
                      by {order.placedBy}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span>${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-medium mt-2 pt-2 border-t border-default">
                    <span>Order Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
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
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Payment Options</h3>
            <button
              onClick={() => setShowSplitOptions(!showSplitOptions)}
              className="text-sm text-primary hover:underline"
            >
              {showSplitOptions ? 'Hide' : 'Show'} Split Options
            </button>
          </div>

          {/* Full Payment */}
          <button
            onClick={() => initiatePayment()}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Pay Full Amount • ${bill.summary.remainingBalance.toFixed(2)}
          </button>

          {/* Split Payment Options */}
          {showSplitOptions && (
            <div className="bg-surface-secondary rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Split Payment</h4>

              {/* Split Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSplitOptionChange('equal')}
                  className={`p-2 rounded text-sm ${
                    splitOption.type === 'equal'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface border border-default'
                  }`}
                >
                  Split Equally
                </button>
                <button
                  onClick={() => handleSplitOptionChange('by_items')}
                  className={`p-2 rounded text-sm ${
                    splitOption.type === 'by_items'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface border border-default'
                  }`}
                >
                  By Items
                </button>
                <button
                  onClick={() => handleSplitOptionChange('by_percentage')}
                  className={`p-2 rounded text-sm ${
                    splitOption.type === 'by_percentage'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface border border-default'
                  }`}
                >
                  By Percentage
                </button>
                <button
                  onClick={() => handleSplitOptionChange('by_amount')}
                  className={`p-2 rounded text-sm ${
                    splitOption.type === 'by_amount'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface border border-default'
                  }`}
                >
                  Custom Amount
                </button>
              </div>

              {/* Split Details */}
              {splitOption.type === 'equal' && (
                <div className="space-y-2">
                  <p className="text-sm text-content-secondary">
                    ${(bill.summary.remainingBalance / users.length).toFixed(2)} per person
                  </p>
                  <div className="space-y-1">
                    {users.map(user => (
                      <div key={user.guestSessionId} className="flex justify-between text-sm">
                        <span>{user.userName}</span>
                        <span>${(bill.summary.remainingBalance / users.length).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current User Payment */}
              {Object.keys(splitAmounts).length > 0 && (
                <div className="pt-3 border-t border-default">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Your Share:</span>
                    <span className="font-semibold">
                      ${(splitAmounts[currentUser.guestSessionId] || 0).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => initiatePayment(splitAmounts[currentUser.guestSessionId])}
                    className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg"
                  >
                    Pay My Share • ${(splitAmounts[currentUser.guestSessionId] || 0).toFixed(2)}
                  </button>
                </div>
              )}
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