'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import type {
  TableSessionBill,
  TableSessionUser,
  SplitPaymentOption
} from '@tabsy/shared-types'

interface SplitBillPaymentProps {
  bill: TableSessionBill
  currentUser: TableSessionUser
  users: TableSessionUser[]
  api: TabsyAPI
  onPaymentComplete?: (paymentId: string) => void
  onCancel?: () => void
}

interface PaymentMethod {
  id: string
  name: string
  icon: string
  description: string
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: '💳',
    description: 'Visa, Mastercard, American Express'
  },
  {
    id: 'digital_wallet',
    name: 'Digital Wallet',
    icon: '📱',
    description: 'Apple Pay, Google Pay, Samsung Pay'
  },
  {
    id: 'cash',
    name: 'Cash',
    icon: '💵',
    description: 'Pay with cash to staff'
  }
]

export function SplitBillPayment({
  bill,
  currentUser,
  users,
  api,
  onPaymentComplete,
  onCancel
}: SplitBillPaymentProps) {
  const [splitOption, setSplitOption] = useState<SplitPaymentOption>({
    type: 'equal',
    participants: users.map(u => u.guestSessionId)
  })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card')
  const [customAmounts, setCustomAmounts] = useState<{ [userId: string]: string }>({})
  const [customPercentages, setCustomPercentages] = useState<{ [userId: string]: string }>({})
  const [itemAssignments, setItemAssignments] = useState<{ [itemId: string]: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [tipAmount, setTipAmount] = useState<number>(0)

  // Initialize custom amounts and percentages
  useEffect(() => {
    const equalAmount = bill.summary.remainingBalance / users.length
    const equalPercentage = 100 / users.length

    const amounts: { [userId: string]: string } = {}
    const percentages: { [userId: string]: string } = {}

    users.forEach(user => {
      amounts[user.guestSessionId] = equalAmount.toFixed(2)
      percentages[user.guestSessionId] = equalPercentage.toFixed(1)
    })

    setCustomAmounts(amounts)
    setCustomPercentages(percentages)
  }, [users, bill.summary.remainingBalance])

  // Calculate split amounts based on current option
  const calculateSplitAmounts = (): { [guestSessionId: string]: number } => {
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
        Object.entries(customPercentages).forEach(([id, percentageStr]) => {
          const percentage = parseFloat(percentageStr) || 0
          amounts[id] = (remainingBalance * percentage) / 100
        })
        break

      case 'by_amount':
        Object.entries(customAmounts).forEach(([id, amountStr]) => {
          amounts[id] = parseFloat(amountStr) || 0
        })
        break

      case 'by_items':
        // Calculate based on item assignments
        const userTotals: { [guestSessionId: string]: number } = {}

        // Initialize all users with 0
        users.forEach(user => {
          userTotals[user.guestSessionId] = 0
        })

        // Sum up assigned items
        Object.values(bill.billByRound).forEach(round => {
          round.orders.forEach(order => {
            order.items.forEach((item: any) => {
              const assignedTo = itemAssignments[item.id] || currentUser.guestSessionId
              userTotals[assignedTo] += item.subtotal
            })
          })
        })

        // Add proportional tax and tip
        const subtotalSum = Object.values(userTotals).reduce((sum, val) => sum + val, 0)
        if (subtotalSum > 0) {
          Object.entries(userTotals).forEach(([id, subtotal]) => {
            const proportion = subtotal / subtotalSum
            amounts[id] = subtotal + (bill.summary.tax * proportion) + (bill.summary.tip * proportion)
          })
        }
        break
    }

    return amounts
  }

  // Handle split option change
  const handleSplitOptionChange = (type: SplitPaymentOption['type']) => {
    setSplitOption({
      type,
      participants: type === 'equal' ? users.map(u => u.guestSessionId) : splitOption.participants,
      amounts: type === 'by_amount' ? customAmounts : undefined,
      percentages: type === 'by_percentage' ? customPercentages : undefined,
      itemAssignments: type === 'by_items' ? itemAssignments : undefined
    })
  }

  // Handle participant selection
  const toggleParticipant = (userId: string) => {
    setSplitOption(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }))
  }

  // Handle custom amount change
  const handleAmountChange = (userId: string, value: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [userId]: value
    }))

    if (splitOption.type === 'by_amount') {
      setSplitOption(prev => ({
        ...prev,
        amounts: {
          ...prev.amounts,
          [userId]: parseFloat(value) || 0
        }
      }))
    }
  }

  // Handle custom percentage change
  const handlePercentageChange = (userId: string, value: string) => {
    setCustomPercentages(prev => ({
      ...prev,
      [userId]: value
    }))

    if (splitOption.type === 'by_percentage') {
      setSplitOption(prev => ({
        ...prev,
        percentages: {
          ...prev.percentages,
          [userId]: parseFloat(value) || 0
        }
      }))
    }
  }

  // Handle item assignment
  const handleItemAssignment = (itemId: string, userId: string) => {
    setItemAssignments(prev => ({
      ...prev,
      [itemId]: userId
    }))

    if (splitOption.type === 'by_items') {
      setSplitOption(prev => ({
        ...prev,
        itemAssignments: {
          ...prev.itemAssignments,
          [itemId]: userId
        }
      }))
    }
  }

  // Process payment
  const processPayment = async () => {
    const splitAmounts = calculateSplitAmounts()
    const userAmount = splitAmounts[currentUser.guestSessionId] || 0

    if (userAmount <= 0) {
      toast.error('Payment amount must be greater than $0')
      return
    }

    setIsProcessing(true)

    try {
      // Create split payment
      const paymentResponse = await api.payment.createSplitPayment({
        tableSessionId: bill.tableSessionId,
        amount: userAmount,
        paymentMethod: selectedPaymentMethod,
        splitOption,
        guestSessionId: currentUser.guestSessionId,
        tip: tipAmount
      })

      if (paymentResponse.success) {
        toast.success(`Payment of $${userAmount.toFixed(2)} processed successfully!`)
        onPaymentComplete?.(paymentResponse.data.id)
      } else {
        throw new Error(paymentResponse.error?.message || 'Payment failed')
      }

    } catch (error) {
      console.error('[SplitBillPayment] Payment error:', error)
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const splitAmounts = calculateSplitAmounts()
  const userAmount = splitAmounts[currentUser.guestSessionId] || 0
  const totalSplitAmount = Object.values(splitAmounts).reduce((sum, amount) => sum + amount, 0)

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Split Bill Payment</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-content-secondary hover:text-content-primary"
          >
            ✕
          </button>
        )}
      </div>

      {/* Bill Summary */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span>Total Bill</span>
          <span className="font-semibold">${bill.summary.grandTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span>Already Paid</span>
          <span className="text-success">-${bill.summary.totalPaid.toFixed(2)}</span>
        </div>
        <hr className="border-default my-2" />
        <div className="flex justify-between items-center font-semibold">
          <span>Remaining</span>
          <span>${bill.summary.remainingBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* Split Method Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold">Split Method</h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSplitOptionChange('equal')}
            className={`p-3 rounded-lg border text-left ${
              splitOption.type === 'equal'
                ? 'border-primary bg-primary/10'
                : 'border-default bg-surface'
            }`}
          >
            <div className="font-medium">Split Equally</div>
            <div className="text-sm text-content-secondary">
              ${(bill.summary.remainingBalance / users.length).toFixed(2)} per person
            </div>
          </button>

          <button
            onClick={() => handleSplitOptionChange('by_items')}
            className={`p-3 rounded-lg border text-left ${
              splitOption.type === 'by_items'
                ? 'border-primary bg-primary/10'
                : 'border-default bg-surface'
            }`}
          >
            <div className="font-medium">By Items</div>
            <div className="text-sm text-content-secondary">
              Assign items to people
            </div>
          </button>

          <button
            onClick={() => handleSplitOptionChange('by_percentage')}
            className={`p-3 rounded-lg border text-left ${
              splitOption.type === 'by_percentage'
                ? 'border-primary bg-primary/10'
                : 'border-default bg-surface'
            }`}
          >
            <div className="font-medium">By Percentage</div>
            <div className="text-sm text-content-secondary">
              Custom percentages
            </div>
          </button>

          <button
            onClick={() => handleSplitOptionChange('by_amount')}
            className={`p-3 rounded-lg border text-left ${
              splitOption.type === 'by_amount'
                ? 'border-primary bg-primary/10'
                : 'border-default bg-surface'
            }`}
          >
            <div className="font-medium">Custom Amount</div>
            <div className="text-sm text-content-secondary">
              Specify exact amounts
            </div>
          </button>
        </div>
      </div>

      {/* Split Details */}
      {splitOption.type === 'by_items' && (
        <div className="space-y-4">
          <h4 className="font-medium">Assign Items</h4>
          {Object.values(bill.billByRound).map(round => (
            <div key={round.roundNumber} className="bg-surface-secondary rounded-lg p-4">
              <h5 className="font-medium mb-3">Round {round.roundNumber}</h5>
              {round.orders.map(order => (
                <div key={order.orderId} className="space-y-2">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{item.quantity}x {item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">${item.subtotal.toFixed(2)}</span>
                        <select
                          value={itemAssignments[item.id] || currentUser.guestSessionId}
                          onChange={(e) => handleItemAssignment(item.id, e.target.value)}
                          className="text-xs border border-default rounded px-2 py-1"
                        >
                          {users.map(user => (
                            <option key={user.guestSessionId} value={user.guestSessionId}>
                              {user.userName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {splitOption.type === 'by_percentage' && (
        <div className="space-y-3">
          <h4 className="font-medium">Set Percentages</h4>
          {users.map(user => (
            <div key={user.guestSessionId} className="flex items-center justify-between">
              <span>{user.userName}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={customPercentages[user.guestSessionId] || ''}
                  onChange={(e) => handlePercentageChange(user.guestSessionId, e.target.value)}
                  className="w-16 px-2 py-1 border border-default rounded text-sm"
                />
                <span className="text-sm">%</span>
                <span className="text-sm w-16 text-right">
                  ${((parseFloat(customPercentages[user.guestSessionId]) || 0) * bill.summary.remainingBalance / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {splitOption.type === 'by_amount' && (
        <div className="space-y-3">
          <h4 className="font-medium">Set Amounts</h4>
          {users.map(user => (
            <div key={user.guestSessionId} className="flex items-center justify-between">
              <span>{user.userName}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customAmounts[user.guestSessionId] || ''}
                  onChange={(e) => handleAmountChange(user.guestSessionId, e.target.value)}
                  className="w-20 px-2 py-1 border border-default rounded text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Split Summary */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <h4 className="font-medium mb-3">Split Summary</h4>
        <div className="space-y-2">
          {users.map(user => {
            const amount = splitAmounts[user.guestSessionId] || 0
            return (
              <div key={user.guestSessionId} className="flex justify-between">
                <span className={user.guestSessionId === currentUser.guestSessionId ? 'font-medium' : ''}>
                  {user.userName} {user.guestSessionId === currentUser.guestSessionId && '(You)'}
                </span>
                <span className={user.guestSessionId === currentUser.guestSessionId ? 'font-medium' : ''}>
                  ${amount.toFixed(2)}
                </span>
              </div>
            )
          })}
          <hr className="border-default" />
          <div className="flex justify-between font-semibold">
            <span>Total Split</span>
            <span>${totalSplitAmount.toFixed(2)}</span>
          </div>
          {Math.abs(totalSplitAmount - bill.summary.remainingBalance) > 0.01 && (
            <div className="text-warning text-sm">
              ⚠️ Split total doesn't match remaining balance
            </div>
          )}
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <h3 className="font-semibold">Payment Method</h3>
        <div className="space-y-2">
          {paymentMethods.map(method => (
            <label key={method.id} className="flex items-center gap-3 p-3 border border-default rounded-lg cursor-pointer hover:bg-surface-secondary">
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selectedPaymentMethod === method.id}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="text-primary"
              />
              <div className="text-xl">{method.icon}</div>
              <div className="flex-1">
                <div className="font-medium">{method.name}</div>
                <div className="text-sm text-content-secondary">{method.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="space-y-3">
        <h3 className="font-semibold">Add Tip (Optional)</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={tipAmount}
            onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="flex-1 px-3 py-2 border border-default rounded-lg"
          />
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Your Payment Total:</span>
          <span className="text-xl font-bold text-primary">
            ${(userAmount + tipAmount).toFixed(2)}
          </span>
        </div>
        {tipAmount > 0 && (
          <div className="text-sm text-content-secondary mt-1">
            Includes ${tipAmount.toFixed(2)} tip
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-surface border border-default text-content-primary rounded-lg font-medium"
          >
            Cancel
          </button>
        )}
        <button
          onClick={processPayment}
          disabled={isProcessing || userAmount <= 0}
          className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              Processing...
            </div>
          ) : (
            `Pay $${(userAmount + tipAmount).toFixed(2)}`
          )}
        </button>
      </div>
    </div>
  )
}