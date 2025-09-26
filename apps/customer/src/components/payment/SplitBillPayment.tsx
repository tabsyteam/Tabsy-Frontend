'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  DollarSign,
  Receipt,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Percent,
  Banknote,
  Users,
  Split,
  Calculator,
  Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import { useTableSessionWebSocket } from '@/hooks/useWebSocket'
import { SplitBillType } from '@/constants/payment'
import {
  PaymentMethod
} from '@tabsy/shared-types'
import type {
  TableSessionBill,
  TableSessionUser,
  SplitPaymentOption
} from '@tabsy/shared-types'
import { StripeProvider } from '@/components/providers/stripe-provider'
import { PaymentForm } from './PaymentForm'

interface SplitBillPaymentProps {
  bill: TableSessionBill
  currentUser: TableSessionUser
  users: TableSessionUser[]
  api: TabsyAPI
  sessionId?: string // Fallback sessionId in case bill.sessionId is undefined
  restaurantId?: string
  tableId?: string
  onPaymentComplete?: (paymentId: string) => void
  onCancel?: () => void
}

interface TipOption {
  percentage: number
  label: string
  amount: number
}

interface PaymentMethodOption {
  id: PaymentMethod
  name: string
  icon: string
  description: string
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: PaymentMethod.CREDIT_CARD,
    name: 'Credit/Debit Card',
    icon: '💳',
    description: 'Visa, Mastercard, American Express'
  },
  {
    id: PaymentMethod.MOBILE_PAYMENT,
    name: 'Digital Wallet',
    icon: '📱',
    description: 'Apple Pay, Google Pay, Samsung Pay'
  },
  {
    id: PaymentMethod.CASH,
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
  sessionId,
  restaurantId,
  tableId,
  onPaymentComplete,
  onCancel
}: SplitBillPaymentProps) {
  // Get the actual sessionId, with fallback to prop if bill.sessionId is undefined
  const actualSessionId = bill.sessionId || sessionId
  if (!actualSessionId) {
    console.error('[SplitBillPayment] No sessionId available:', { billSessionId: bill.sessionId, propSessionId: sessionId })
  }

  // Ensure unique users to prevent React key warnings (memoized to prevent infinite loops)
  const uniqueUsers = useMemo(() =>
    users.filter((user, index, arr) =>
      arr.findIndex(u => u.guestSessionId === user.guestSessionId) === index
    ), [users]
  )
  const [splitOption, setSplitOption] = useState<SplitPaymentOption>({
    type: SplitBillType.EQUAL,
    participants: [] // Initialize as empty, will be set in useEffect
  })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CREDIT_CARD)
  const [customAmounts, setCustomAmounts] = useState<{ [userId: string]: string }>({})
  const [customPercentages, setCustomPercentages] = useState<{ [userId: string]: string }>({})
  const [itemAssignments, setItemAssignments] = useState<{ [itemId: string]: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [tipAmount, setTipAmount] = useState<number>(0)
  const [paymentLock, setPaymentLock] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastBillUpdate, setLastBillUpdate] = useState<string>(bill.summary.updatedAt || new Date().toISOString())

  // Stripe integration state (same as PaymentView)
  const [selectedTip, setSelectedTip] = useState<number>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [updatingTip, setUpdatingTip] = useState(false)
  const [paymentBreakdown, setPaymentBreakdown] = useState<{
    subtotal: number
    tax: number
    tip: number
    total: number
  } | null>(null)

  // Calculate total number of unique items across all rounds (moved up before useEffects)
  const totalUniqueItems = useMemo(() => {
    let itemCount = 0
    Object.values(bill.billByRound).forEach(round => {
      round.orders.forEach(order => {
        itemCount += order.items.length
      })
    })
    return itemCount
  }, [bill.billByRound])

  // Initialize split option participants when users change
  useEffect(() => {
    if (uniqueUsers.length > 0) {
      setSplitOption(prev => ({
        ...prev,
        participants: uniqueUsers.map(user => user.guestSessionId)
      }))
    }
  }, [uniqueUsers])

  // Auto-switch from BY_ITEMS if only one item remains
  useEffect(() => {
    if (splitOption.type === SplitBillType.BY_ITEMS && totalUniqueItems <= 1) {
      console.log('[SplitBillPayment] Auto-switching from BY_ITEMS to EQUAL due to single item')
      setSplitOption(prev => ({
        ...prev,
        type: SplitBillType.EQUAL
      }))
    }
  }, [totalUniqueItems, splitOption.type])

  // Initialize custom amounts and percentages
  useEffect(() => {
    const equalAmount = bill.summary.remainingBalance / uniqueUsers.length
    const equalPercentage = 100 / uniqueUsers.length

    const amounts: { [userId: string]: string } = {}
    const percentages: { [userId: string]: string } = {}

    uniqueUsers.forEach(user => {
      amounts[user.guestSessionId] = equalAmount.toFixed(2)
      percentages[user.guestSessionId] = equalPercentage.toFixed(1)
    })

    setCustomAmounts(amounts)
    setCustomPercentages(percentages)
  }, [uniqueUsers, bill.summary.remainingBalance])

  // Backend-calculated split amounts state
  const [backendSplitAmounts, setBackendSplitAmounts] = useState<{ [guestSessionId: string]: number }>({})
  const [splitCalculationLoading, setSplitCalculationLoading] = useState(false)
  const [splitCalculationError, setSplitCalculationError] = useState<string | null>(null)
  const [syncingWithOtherUsers, setSyncingWithOtherUsers] = useState(false)

  // Optimistic UI state management
  const [optimisticState, setOptimisticState] = useState<{
    percentages?: { [userId: string]: string }
    amounts?: { [userId: string]: string }
    itemAssignments?: { [itemId: string]: string }
    pendingUpdate?: boolean
    updateId?: string
  }>({})

  // Rollback state for error recovery
  const [rollbackState, setRollbackState] = useState<{
    percentages: { [userId: string]: string }
    amounts: { [userId: string]: string }
    itemAssignments: { [itemId: string]: string }
  } | null>(null)

  // Conflict resolution state
  const [conflictResolution, setConflictResolution] = useState<{
    showDialog: boolean
    conflictType: 'concurrent_update' | 'validation_error' | 'network_timeout' | null
    conflictData?: {
      remoteUpdate?: any
      localUpdate?: any
      updatedBy?: string
      timestamp?: string
    }
    resolutionOptions?: Array<{
      id: string
      label: string
      description: string
      action: () => void
    }>
  }>({
    showDialog: false,
    conflictType: null
  })

  // WebSocket integration for real-time split updates
  const handleTableSessionUpdate = useCallback((data: any) => {
    if (data.type === 'split_calculation_updated') {
      console.log('[SplitBillPayment] Received split calculation update:', data)

      // Only update if this update was made by another user
      if (data.updatedBy !== currentUser.guestSessionId) {
        setSyncingWithOtherUsers(true)
        const splitCalculation = data.splitCalculation

        // Check for concurrent update conflicts
        if (optimisticState.pendingUpdate) {
          handleConcurrentUpdateConflict(data, splitCalculation)
          return
        }

        if (splitCalculation) {
          // Update backend split amounts with real-time data
          setBackendSplitAmounts(splitCalculation.splitAmounts || {})

          // Update local state to reflect changes from other users
          if (splitCalculation.percentages) {
            setCustomPercentages(prev => {
              // Only update percentages that weren't changed by current user
              const updated = { ...prev }
              Object.entries(splitCalculation.percentages).forEach(([userId, percentage]) => {
                if (userId !== currentUser.guestSessionId) {
                  updated[userId] = percentage.toString()
                }
              })
              return updated
            })
          }

          if (splitCalculation.amounts) {
            setCustomAmounts(prev => {
              // Only update amounts that weren't changed by current user
              const updated = { ...prev }
              Object.entries(splitCalculation.amounts).forEach(([userId, amount]) => {
                if (userId !== currentUser.guestSessionId) {
                  updated[userId] = amount.toString()
                }
              })
              return updated
            })
          }

          if (splitCalculation.itemAssignments) {
            setItemAssignments(splitCalculation.itemAssignments)
          }

          // Show notification to user about the update
          const updatedByUser = users.find(u => u.guestSessionId === data.updatedBy)
          const updatedByName = updatedByUser?.userName || 'Another user'

          toast.info(`${updatedByName} updated the split calculation`, {
            description: 'Your view has been updated to reflect the changes',
            duration: 3000
          })

          // Clear syncing state after a brief delay to show the update
          setTimeout(() => {
            setSyncingWithOtherUsers(false)
          }, 1000)
        }
      }
    }
  }, [currentUser.guestSessionId, users])

  // Set up WebSocket connection for real-time updates
  useTableSessionWebSocket(
    actualSessionId || '',
    restaurantId || '',
    tableId || '',
    currentUser.guestSessionId,
    handleTableSessionUpdate
  )

  // Optimistic UI update helpers
  const createRollbackSnapshot = () => {
    setRollbackState({
      percentages: { ...customPercentages },
      amounts: { ...customAmounts },
      itemAssignments: { ...itemAssignments }
    })
  }

  const rollbackToSnapshot = () => {
    if (rollbackState) {
      setCustomPercentages(rollbackState.percentages)
      setCustomAmounts(rollbackState.amounts)
      setItemAssignments(rollbackState.itemAssignments)
      setOptimisticState({})
      toast.error('Update failed - reverted to previous values', {
        description: 'Please try again',
        duration: 4000
      })
    }
  }

  const applyOptimisticUpdate = (updateType: 'percentages' | 'amounts' | 'itemAssignments', data: any, updateId: string) => {
    createRollbackSnapshot()

    setOptimisticState({
      [updateType]: data,
      pendingUpdate: true,
      updateId
    })

    // Apply the optimistic update immediately to local state
    if (updateType === 'percentages') {
      setCustomPercentages(prev => ({ ...prev, ...data }))
    } else if (updateType === 'amounts') {
      setCustomAmounts(prev => ({ ...prev, ...data }))
    } else if (updateType === 'itemAssignments') {
      setItemAssignments(prev => ({ ...prev, ...data }))
    }
  }

  const confirmOptimisticUpdate = (updateId: string) => {
    if (optimisticState.updateId === updateId) {
      setOptimisticState({})
      setRollbackState(null)
    }
  }

  const rejectOptimisticUpdate = (updateId: string, error?: string) => {
    if (optimisticState.updateId === updateId) {
      rollbackToSnapshot()
      if (error) {
        console.error('[SplitBillPayment] Optimistic update rejected:', error)
      }
    }
  }

  // Conflict resolution functions
  const handleConcurrentUpdateConflict = (remoteData: any, remoteSplitCalculation: any) => {
    const updatedByUser = users.find(u => u.guestSessionId === remoteData.updatedBy)
    const updatedByName = updatedByUser?.userName || 'Another user'

    setConflictResolution({
      showDialog: true,
      conflictType: 'concurrent_update',
      conflictData: {
        remoteUpdate: remoteSplitCalculation,
        localUpdate: optimisticState,
        updatedBy: updatedByName,
        timestamp: remoteData.timestamp || new Date().toISOString()
      },
      resolutionOptions: [
        {
          id: 'keep_local',
          label: 'Keep My Changes',
          description: 'Continue with your changes and discard the remote update',
          action: () => resolveConflict('keep_local', remoteData, remoteSplitCalculation)
        },
        {
          id: 'accept_remote',
          label: `Accept ${updatedByName}'s Changes`,
          description: 'Discard your changes and accept the remote update',
          action: () => resolveConflict('accept_remote', remoteData, remoteSplitCalculation)
        },
        {
          id: 'merge_changes',
          label: 'Merge Changes',
          description: 'Try to combine both changes intelligently',
          action: () => resolveConflict('merge_changes', remoteData, remoteSplitCalculation)
        }
      ]
    })
  }

  const resolveConflict = (resolution: string, remoteData: any, remoteSplitCalculation: any) => {
    setSyncingWithOtherUsers(false)

    switch (resolution) {
      case 'keep_local':
        // Continue with local optimistic update, ignore remote
        toast.info('Continuing with your changes', {
          description: 'Remote changes have been ignored',
          duration: 3000
        })
        break

      case 'accept_remote':
        // Accept remote changes and cancel local optimistic update
        if (optimisticState.updateId) {
          rejectOptimisticUpdate(optimisticState.updateId)
        }
        applyRemoteUpdate(remoteSplitCalculation)
        toast.info('Applied remote changes', {
          description: 'Your changes have been discarded',
          duration: 3000
        })
        break

      case 'merge_changes':
        // Attempt intelligent merge
        if (optimisticState.updateId) {
          rejectOptimisticUpdate(optimisticState.updateId)
        }
        attemptMergeChanges(remoteSplitCalculation)
        toast.info('Merged changes', {
          description: 'Combined both sets of changes where possible',
          duration: 3000
        })
        break
    }

    setConflictResolution({
      showDialog: false,
      conflictType: null
    })
  }

  const applyRemoteUpdate = (remoteSplitCalculation: any) => {
    setBackendSplitAmounts(remoteSplitCalculation.splitAmounts || {})

    if (remoteSplitCalculation.percentages) {
      setCustomPercentages(remoteSplitCalculation.percentages)
    }
    if (remoteSplitCalculation.amounts) {
      setCustomAmounts(remoteSplitCalculation.amounts)
    }
    if (remoteSplitCalculation.itemAssignments) {
      setItemAssignments(remoteSplitCalculation.itemAssignments)
    }
  }

  const attemptMergeChanges = (remoteSplitCalculation: any) => {
    // Simple merge strategy: accept remote changes for other users, keep local changes for current user
    const mergedPercentages = { ...remoteSplitCalculation.percentages }
    const mergedAmounts = { ...remoteSplitCalculation.amounts }

    if (optimisticState.percentages && optimisticState.percentages[currentUser.guestSessionId]) {
      mergedPercentages[currentUser.guestSessionId] = optimisticState.percentages[currentUser.guestSessionId]
    }
    if (optimisticState.amounts && optimisticState.amounts[currentUser.guestSessionId]) {
      mergedAmounts[currentUser.guestSessionId] = optimisticState.amounts[currentUser.guestSessionId]
    }

    setBackendSplitAmounts(remoteSplitCalculation.splitAmounts || {})
    setCustomPercentages(mergedPercentages)
    setCustomAmounts(mergedAmounts)

    if (remoteSplitCalculation.itemAssignments) {
      setItemAssignments(remoteSplitCalculation.itemAssignments)
    }
  }

  // Get split amounts from backend calculation or fallback to empty
  const getSplitAmounts = (): { [guestSessionId: string]: number } => {
    return backendSplitAmounts
  }

  // Tip calculation functions - Fixed to calculate on user's split amount from backend
  const getTipOptions = (): TipOption[] => {
    // SECURE: Use backend-calculated split amount as base for tip calculation
    const splitAmounts = getSplitAmounts()
    const userSplitAmount = splitAmounts[currentUser.guestSessionId] || 0

    const percentages = [15, 18, 20, 25]
    return percentages.map(percentage => ({
      percentage,
      label: `${percentage}%`,
      amount: Math.round(userSplitAmount * (percentage / 100) * 100) / 100 // Round to 2 decimal places
    }))
  }

  const getCustomTipAmount = (): number => {
    const amount = parseFloat(customTip)
    return isNaN(amount) ? 0 : amount
  }

  const handleTipSelection = async (amount: number) => {
    setSelectedTip(amount)
    setCustomTip('')

    // Update tip for split bill payment intent if exists
    if (clientSecret && paymentId) {
      try {
        setUpdatingTip(true)

        const response = await api.tableSession.updatePaymentTip(actualSessionId!, paymentId, {
          tipAmount: Math.round(amount * 100) / 100  // Round to 2 decimal places
        })

        if (response.success && response.data) {
          setPaymentBreakdown(response.data.breakdown)
          toast.success('Tip updated successfully!', {
            description: `Payment amount updated to $${response.data.amount.toFixed(2)}`,
            duration: 2000
          })
        } else {
          throw new Error(response.error?.message || 'Failed to update tip')
        }
      } catch (error: any) {
        console.error('Failed to update tip:', error)
        toast.error('Failed to update tip. Please try again.')
        setSelectedTip(0) // Reset tip selection on error
      } finally {
        setUpdatingTip(false)
      }
    }
  }

  // SECURE: Create split calculation using backend API
  const createSplitCalculation = async (): Promise<void> => {
    if (!actualSessionId) return

    try {
      setSplitCalculationLoading(true)
      setSplitCalculationError(null)

      const response = await api.tableSession.createSplitCalculation(
        actualSessionId,
        {
          splitType: splitOption.type,
          participants: splitOption.participants,
          percentages: splitOption.type === SplitBillType.BY_PERCENTAGE ? customPercentages : undefined,
          amounts: splitOption.type === SplitBillType.BY_AMOUNT ? customAmounts : undefined,
          itemAssignments: splitOption.type === SplitBillType.BY_ITEMS ? itemAssignments : undefined
        },
        { guestSessionId: currentUser.guestSessionId }
      )

      if (response.success && response.data) {
        setBackendSplitAmounts(response.data.splitAmounts)
        console.log('[SplitBillPayment] Split calculation created successfully:', response.data)
      } else {
        throw new Error(response.error?.message || 'Failed to create split calculation')
      }
    } catch (error: any) {
      console.error('[SplitBillPayment] Error creating split calculation:', error)
      setSplitCalculationError(error.message)
      toast.error('Failed to calculate split amounts. Please try again.')
    } finally {
      setSplitCalculationLoading(false)
    }
  }

  // SECURE: Update split calculation using backend API with optimistic updates
  const updateSplitCalculation = async (userId: string, percentage?: number, amount?: number, itemAssignments?: { [itemId: string]: string }): Promise<void> => {
    if (!actualSessionId) return

    const updateId = `update_${Date.now()}_${Math.random().toString(36).substring(2)}`

    try {
      setSplitCalculationLoading(true)
      setSplitCalculationError(null)

      const response = await api.tableSession.updateSplitCalculation(
        actualSessionId,
        userId,
        { percentage, amount, itemAssignments },
        { guestSessionId: currentUser.guestSessionId }
      )

      if (response.success && response.data) {
        setBackendSplitAmounts(response.data.splitAmounts)
        console.log('[SplitBillPayment] Split calculation updated successfully:', response.data)

        // Confirm the optimistic update was successful
        confirmOptimisticUpdate(updateId)

        // Update local state to reflect backend changes (in case backend auto-adjusted)
        if (response.data.percentages) {
          setCustomPercentages(response.data.percentages)
        }
        if (response.data.amounts) {
          setCustomAmounts(response.data.amounts)
        }
      } else {
        throw new Error(response.error?.message || 'Failed to update split calculation')
      }
    } catch (error: any) {
      console.error('[SplitBillPayment] Error updating split calculation:', error)
      setSplitCalculationError(error.message)

      // Reject the optimistic update and rollback
      rejectOptimisticUpdate(updateId, error.message)

      toast.error('Failed to update split amounts. Please try again.')
    } finally {
      setSplitCalculationLoading(false)
    }
  }

  // Validate split amounts
  const validateSplitAmounts = (amounts: { [guestSessionId: string]: number }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    const totalSplit = Object.values(amounts).reduce((sum, amt) => sum + amt, 0)
    const userAmount = amounts[currentUser.guestSessionId] || 0

    // Check if user amount is valid
    if (userAmount <= 0) {
      errors.push('Your payment amount must be greater than $0')
    }

    if (userAmount < 0.01) {
      errors.push('Payment amount must be at least $0.01')
    }

    // Check if total split doesn't exceed remaining balance (with small tolerance)
    if (totalSplit > bill.summary.remainingBalance + 0.01) {
      errors.push(`Total split amount ($${totalSplit.toFixed(2)}) exceeds remaining balance ($${bill.summary.remainingBalance.toFixed(2)})`)
    }

    // Check for unreasonably large amounts
    if (userAmount > bill.summary.grandTotal) {
      errors.push('Payment amount cannot exceed the total bill')
    }

    // Check percentage validation for by_percentage
    if (splitOption.type === SplitBillType.BY_PERCENTAGE) {
      const totalPercentage = Object.values(customPercentages).reduce((sum, pct) => sum + (parseFloat(pct) || 0), 0)
      if (totalPercentage > 100.01) {
        errors.push(`Total percentage (${totalPercentage.toFixed(1)}%) exceeds 100%`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // SECURE: Handle split option change with backend calculation
  const handleSplitOptionChange = async (type: SplitPaymentOption['type']) => {
    setSplitOption({
      type,
      participants: type === SplitBillType.EQUAL ? uniqueUsers.map(u => u.guestSessionId) : splitOption.participants,
      amounts: type === SplitBillType.BY_AMOUNT ? customAmounts : undefined,
      percentages: type === SplitBillType.BY_PERCENTAGE ? customPercentages : undefined,
      itemAssignments: type === SplitBillType.BY_ITEMS ? itemAssignments : undefined
    })

    // Create new backend split calculation when split type changes
    await createSplitCalculation()
  }

  // Initialize backend split calculation on mount and when split option changes
  useEffect(() => {
    if (actualSessionId && splitOption.participants.length > 0) {
      createSplitCalculation()
    }
  }, [actualSessionId, splitOption.type])

  // Handle participant selection
  const toggleParticipant = (userId: string) => {
    setSplitOption(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }))
  }

  // SECURE: Handle custom amount change with backend API and optimistic updates
  const handleAmountChange = async (userId: string, value: string) => {
    if (splitOption.type === SplitBillType.BY_AMOUNT) {
      const updateId = `amount_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`

      // Apply optimistic update immediately
      applyOptimisticUpdate('amounts', { [userId]: value }, updateId)

      setSplitOption(prev => ({
        ...prev,
        amounts: {
          ...prev.amounts,
          [userId]: parseFloat(value) || 0
        }
      }))

      // Call backend API to recalculate split amounts securely
      await updateSplitCalculation(userId, undefined, parseFloat(value) || 0)
    } else {
      // For non-BY_AMOUNT modes, just update local state
      setCustomAmounts(prev => ({
        ...prev,
        [userId]: value
      }))
    }
  }

  // SECURE: Handle custom percentage change with backend API and optimistic updates
  const handlePercentageChange = async (userId: string, value: string) => {
    if (splitOption.type === SplitBillType.BY_PERCENTAGE) {
      const updateId = `percentage_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`

      // Apply optimistic update immediately
      applyOptimisticUpdate('percentages', { [userId]: value }, updateId)

      setSplitOption(prev => ({
        ...prev,
        percentages: {
          ...prev.percentages,
          [userId]: parseFloat(value) || 0
        }
      }))

      // Call backend API to recalculate split amounts securely
      await updateSplitCalculation(userId, parseFloat(value) || 0)
    } else {
      // For non-BY_PERCENTAGE modes, just update local state
      setCustomPercentages(prev => ({
        ...prev,
        [userId]: value
      }))
    }
  }

  // Handle item assignment
  const handleItemAssignment = (itemId: string, userId: string) => {
    setItemAssignments(prev => ({
      ...prev,
      [itemId]: userId
    }))

    if (splitOption.type === SplitBillType.BY_ITEMS) {
      setSplitOption(prev => ({
        ...prev,
        itemAssignments: {
          ...prev.itemAssignments,
          [itemId]: userId
        }
      }))
    }
  }

  // Handle session expiry during split payment
  const handleSessionExpiry = async (): Promise<boolean> => {
    try {
      // Attempt to recover session (simplified - in real implementation, use SessionManager recovery)
      console.log('[SplitBillPayment] Attempting session recovery...')
      toast.info('Session expired. Attempting to recover...', { duration: 3000 })

      // In a real implementation, this would call SessionManager recovery
      // For now, return false to indicate recovery failed
      return false
    } catch (error) {
      console.error('[SplitBillPayment] Session recovery failed:', error)
      return false
    }
  }

  // Enhanced concurrent payment handling functions
  const acquirePaymentLock = async (): Promise<string | null> => {
    try {
      const lockId = `payment_lock_${currentUser.guestSessionId}_${Date.now()}`
      // This would ideally call a backend endpoint to acquire a lock
      // For now, we'll use optimistic locking with bill version checking
      setPaymentLock(lockId)
      return lockId
    } catch (error) {
      console.error('[SplitBillPayment] Failed to acquire payment lock:', error)
      return null
    }
  }

  const releasePaymentLock = async (lockId: string) => {
    try {
      if (paymentLock === lockId) {
        setPaymentLock(null)
      }
      // This would ideally call a backend endpoint to release the lock
    } catch (error) {
      console.error('[SplitBillPayment] Failed to release payment lock:', error)
    }
  }

  const checkForBillUpdates = async (): Promise<{ updated: boolean; newBill?: TableSessionBill }> => {
    try {
      const billResponse = await api.tableSession.getBill(actualSessionId!)
      if (!billResponse.success || !billResponse.data) {
        return { updated: false }
      }

      const newBill = billResponse.data
      const hasUpdate = newBill.summary.updatedAt !== lastBillUpdate ||
                       Math.abs(newBill.summary.remainingBalance - bill.summary.remainingBalance) > 0.01

      if (hasUpdate) {
        setLastBillUpdate(newBill.summary.updatedAt || new Date().toISOString())
        return { updated: true, newBill }
      }

      return { updated: false }
    } catch (error) {
      console.error('[SplitBillPayment] Failed to check for bill updates:', error)
      return { updated: false }
    }
  }

  const handlePaymentRetry = async (originalError: any, currentLockId: string): Promise<boolean> => {
    const maxRetries = 3

    if (retryCount >= maxRetries) {
      toast.error('Payment failed after multiple attempts. Please try again later.', {
        duration: 8000
      })
      return false
    }

    setRetryCount(prev => prev + 1)

    // Check for bill updates before retry
    const updateCheck = await checkForBillUpdates()
    if (updateCheck.updated) {
      toast.warning(
        'The bill has been updated by another user during your payment attempt. Please review the changes and try again.',
        { duration: 8000 }
      )
      return false
    }

    // Wait with exponential backoff
    const waitTime = Math.min(1000 * Math.pow(2, retryCount), 5000)
    await new Promise(resolve => setTimeout(resolve, waitTime))

    toast.info(`Retrying payment (attempt ${retryCount + 1}/${maxRetries})...`)

    try {
      return await processPaymentWithLock(currentLockId, true)
    } catch (retryError) {
      console.error('[SplitBillPayment] Retry failed:', retryError)
      return false
    }
  }

  const processPaymentWithLock = async (lockId: string, isRetry: boolean = false): Promise<boolean> => {
    const splitAmounts = getSplitAmounts()
    const validation = validateSplitAmounts(splitAmounts)

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error(error, { duration: 5000 })
      })
      return false
    }

    const userAmount = splitAmounts[currentUser.guestSessionId] || 0

    try {
      // Double-check bill status before processing
      const billRefreshResponse = await api.tableSession.getBill(actualSessionId!)
      if (!billRefreshResponse.success || !billRefreshResponse.data) {
        throw new Error('Unable to verify current bill status')
      }

      const currentBill = billRefreshResponse.data

      // Enhanced concurrent conflict detection
      if (Math.abs(currentBill.summary.remainingBalance - bill.summary.remainingBalance) > 0.01) {
        if (!isRetry) {
          const shouldContinue = await new Promise<boolean>((resolve) => {
            toast.warning(
              `Bill updated during payment (${bill.summary.remainingBalance.toFixed(2)} → ${currentBill.summary.remainingBalance.toFixed(2)}). Continue anyway?`,
              {
                duration: 10000,
                action: {
                  label: 'Continue',
                  onClick: () => resolve(true),
                },
                cancel: {
                  label: 'Cancel',
                  onClick: () => resolve(false),
                }
              }
            )
          })

          if (!shouldContinue) {
            return false
          }
        }
      }

      // Check if another user is already processing a payment
      const paymentStatusResponse = await api.tableSession.getPaymentStatus(actualSessionId!)
      if (paymentStatusResponse.success && paymentStatusResponse.data) {
        const paymentStatus = paymentStatusResponse.data
        if (!paymentStatus.canAcceptNewPayment) {
          toast.warning('Another payment is currently being processed. Please wait a moment and try again.')
          return false
        }
      }

      // Create payment with enhanced metadata
      const paymentResponse = await api.tableSession.createPayment(
        actualSessionId!,
        {
          paymentMethod: selectedPaymentMethod,
          amount: userAmount,
          tipAmount: tipAmount,
          splitDetails: {
            splitType: splitOption.type,
            lockId: lockId,
            participantCount: splitOption.participants.length,
            retryAttempt: isRetry ? retryCount : 0
          }
        },
        { guestSessionId: currentUser.guestSessionId }
      )

      if (paymentResponse.success && paymentResponse.data) {
        // Reset retry count on success
        setRetryCount(0)

        // Store payment info for recovery
        const paymentData = paymentResponse.data
        localStorage.setItem('tabsy_payment_recovery', JSON.stringify({
          paymentId: paymentData.id,
          tableSessionId: actualSessionId,
          amount: userAmount,
          timestamp: new Date().toISOString()
        }))

        toast.success('Payment processed successfully!', { duration: 5000 })
        onPaymentComplete?.(paymentData.id)
        return true
      } else {
        throw new Error(paymentResponse.error?.message || 'Payment failed')
      }
    } catch (error: any) {
      console.error('[SplitBillPayment] Payment processing failed:', error)

      // Enhanced error handling with retry logic
      if (error.message?.includes('conflict') ||
          error.message?.includes('concurrent') ||
          error.message?.includes('locked') ||
          error.status === 409) {
        return await handlePaymentRetry(error, lockId)
      }

      // Network errors - attempt retry
      if (error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.status >= 500) {
        return await handlePaymentRetry(error, lockId)
      }

      // Client errors - don't retry
      toast.error(`Payment failed: ${error.message}`, { duration: 8000 })
      return false
    }
  }

  // Handle Stripe payment intent creation (same as PaymentView)
  const createPaymentIntent = async () => {
    if (selectedPaymentMethod !== PaymentMethod.CREDIT_CARD) return

    try {
      setIsProcessing(true)
      const splitAmounts = getSplitAmounts()
      const userAmount = splitAmounts[currentUser.guestSessionId] || 0
      const finalTipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()

      const response = await api.tableSession.createPayment(
        actualSessionId!,
        {
          paymentMethod: PaymentMethod.CREDIT_CARD,
          amount: userAmount,
          tipAmount: finalTipAmount,
          splitDetails: {
            splitType: splitOption.type,
            participantCount: splitOption.participants.length
          }
        }
      )

      if (response?.success && response.data?.clientSecret) {
        setClientSecret(response.data.clientSecret)
        setPaymentId(response.data.id || response.data.paymentId)

        if (response.data.breakdown) {
          setPaymentBreakdown(response.data.breakdown)
        }

        toast.success('Payment intent created. Please complete payment with your card.')
      } else {
        throw new Error(response?.error?.message || 'Failed to create payment intent')
      }
    } catch (error: any) {
      console.error('Payment intent creation error:', error)
      toast.error(error.message || 'Failed to create payment intent')
    } finally {
      setIsProcessing(false)
    }
  }

  // Stripe payment success handler (same as PaymentView)
  const handlePaymentSuccess = (stripePaymentIntentId: string) => {
    toast.success('Split payment completed successfully!', {
      description: 'Thank you for your payment',
      duration: 4000
    })

    if (!paymentId) {
      console.error('Internal payment ID not found')
      toast.error('Payment completed but unable to show details')
      return
    }

    // Call the parent success handler
    onPaymentComplete?.(paymentId)
  }

  // Stripe payment error handler (same as PaymentView)
  const handlePaymentError = (error: string) => {
    toast.error('Payment failed', {
      description: error
    })
    // Reset payment intent to allow retry
    setClientSecret(null)
    setPaymentId(null)
  }

  // Process payment with enhanced concurrent handling
  const processPayment = async () => {
    if (isProcessing) {
      toast.warning('Payment is already being processed. Please wait.')
      return
    }

    // For credit card payments, create payment intent instead
    if (selectedPaymentMethod === PaymentMethod.CREDIT_CARD) {
      await createPaymentIntent()
      return
    }

    // For cash payments, use the existing flow
    setIsProcessing(true)

    // Acquire payment lock
    const lockId = await acquirePaymentLock()
    if (!lockId) {
      toast.error('Unable to acquire payment lock. Please try again.')
      setIsProcessing(false)
      return
    }

    try {
      const success = await processPaymentWithLock(lockId)
      if (!success) {
        console.log('[SplitBillPayment] Payment processing failed')
      }
    } catch (error: any) {
      console.error('[SplitBillPayment] Unexpected error during payment:', error)
      toast.error(`Unexpected error: ${error.message}`)
    } finally {
      await releasePaymentLock(lockId)
      setIsProcessing(false)
    }
  }

  // Auto-refresh bill data to handle concurrent payments
  const refreshBillData = async () => {
    try {
      const billResponse = await api.tableSession.getBill(actualSessionId!)
      if (billResponse.success && billResponse.data) {
        // In a real implementation, you'd update the parent component's bill state
        console.log('[SplitBillPayment] Bill refreshed:', billResponse.data)

        // Check if remaining balance changed significantly
        const currentRemaining = billResponse.data.summary.remainingBalance
        if (Math.abs(currentRemaining - bill.summary.remainingBalance) > 0.01) {
          toast.info('Bill updated - another payment may have been completed', {
            duration: 4000
          })
        }
      }
    } catch (error) {
      console.warn('[SplitBillPayment] Failed to refresh bill data:', error)
    }
  }

  // Set up periodic bill refresh during split payment to handle concurrent payments
  useEffect(() => {
    const interval = setInterval(refreshBillData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [actualSessionId])

  const splitAmounts = getSplitAmounts()
  const userAmount = splitAmounts[currentUser.guestSessionId] || 0
  const totalSplitAmount = Object.values(splitAmounts).reduce((sum, amount) => sum + amount, 0)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="p-2"
                disabled={isProcessing}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold">Split Bill Payment</h1>
              <p className="text-sm text-content-tertiary">
                Remaining: ${bill.summary.remainingBalance.toFixed(2)} of ${bill.summary.grandTotal.toFixed(2)}
              </p>
              <p className="text-xs text-content-secondary">
                {uniqueUsers.length} people dining
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bill Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-xl border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-content-primary flex items-center space-x-2">
                  <Receipt className="w-5 h-5" />
                  <span>Bill Summary</span>
                </h3>
                <div className="flex items-center space-x-2 text-sm text-content-secondary">
                  <Users className="w-4 h-4" />
                  <span>{uniqueUsers.length} people dining</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-content-secondary">
                  <span>Total Bill</span>
                  <span>${bill.summary.grandTotal.toFixed(2)}</span>
                </div>
                {bill.summary.totalPaid > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Already Paid</span>
                    <span>-${bill.summary.totalPaid.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-content-primary border-t pt-2">
                  <span>Amount to Split</span>
                  <span>${bill.summary.remainingBalance.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>

            {/* Split Method Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                <Split className="w-5 h-5" />
                <span>Split Method</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant={splitOption.type === SplitBillType.EQUAL ? 'default' : 'outline'}
                  onClick={() => handleSplitOptionChange(SplitBillType.EQUAL)}
                  className="h-16 flex-col"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-semibold">Split Equally</span>
                  <span className="text-xs opacity-75">
                    ${(bill.summary.remainingBalance / uniqueUsers.length).toFixed(2)} per person
                  </span>
                </Button>

                <Button
                  variant={splitOption.type === SplitBillType.BY_ITEMS ? 'default' : 'outline'}
                  onClick={() => totalUniqueItems > 1 ? handleSplitOptionChange(SplitBillType.BY_ITEMS) : null}
                  disabled={totalUniqueItems <= 1}
                  className="h-16 flex-col"
                  title={totalUniqueItems <= 1 ? "Split by items requires multiple items in the order" : ""}
                >
                  <Calculator className="w-5 h-5" />
                  <span className="text-sm font-semibold">By Items</span>
                  <span className="text-xs opacity-75">
                    {totalUniqueItems <= 1 ? 'Requires multiple items' : 'Assign items to people'}
                  </span>
                </Button>

                <Button
                  variant={splitOption.type === SplitBillType.BY_PERCENTAGE ? 'default' : 'outline'}
                  onClick={() => handleSplitOptionChange(SplitBillType.BY_PERCENTAGE)}
                  className="h-16 flex-col"
                >
                  <Percent className="w-5 h-5" />
                  <span className="text-sm font-semibold">By Percentage</span>
                  <span className="text-xs opacity-75">Custom percentages</span>
                </Button>

                <Button
                  variant={splitOption.type === SplitBillType.BY_AMOUNT ? 'default' : 'outline'}
                  onClick={() => handleSplitOptionChange(SplitBillType.BY_AMOUNT)}
                  className="h-16 flex-col"
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-semibold">Custom Amount</span>
                  <span className="text-xs opacity-75">Specify exact amounts</span>
                </Button>
              </div>
            </motion.div>

            {/* Split Details */}
            {splitOption.type === SplitBillType.BY_ITEMS && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface rounded-xl border p-6"
              >
                <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                  <Calculator className="w-5 h-5" />
                  <span>Assign Items</span>
                </h3>
                <div className="space-y-4">
                  {Object.values(bill.billByRound).map(round => (
                    <div key={round.roundNumber} className="border rounded-lg p-3">
                      <h4 className="font-medium text-content-primary mb-2">
                        Round {round.roundNumber}
                      </h4>
                      {round.orders.map(order => (
                        <div key={order.orderId} className="space-y-1">
                          <div className="text-xs text-content-tertiary mb-1">
                            Order by {order.placedBy || `Order ${order.orderId?.slice(-4) || ''}`}
                          </div>
                          {order.items.map((item: any, idx: number) => (
                            <div key={`${order.orderId}-item-${idx}-${item.id || item.name || idx}`} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded">
                              <div className="flex-1">
                                <span className="font-medium text-content-primary">
                                  {item.quantity}x {item.name}
                                </span>
                                <div className="text-content-primary font-semibold">
                                  ${(parseFloat(item.subtotal) || 0).toFixed(2)}
                                </div>
                              </div>
                              <select
                                value={itemAssignments[item.id || `${order.orderId}-item-${idx}`] || currentUser.guestSessionId}
                                onChange={(e) => handleItemAssignment(item.id || `${order.orderId}-item-${idx}`, e.target.value)}
                                className="ml-3 px-3 py-2 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                              >
                                {uniqueUsers.map((user, userIdx) => (
                                  <option key={user.guestSessionId || `select-user-${userIdx}`} value={user.guestSessionId}>
                                    {user.userName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {splitOption.type === SplitBillType.BY_PERCENTAGE && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface rounded-xl border p-6"
              >
                <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                  <Percent className="w-5 h-5" />
                  <span>Set Percentages</span>
                </h3>
                <div className="space-y-4">
                  {uniqueUsers.map((user, userIdx) => (
                    <div key={user.guestSessionId || `user-perc-${userIdx}`} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-content-primary">{user.userName}</span>
                        <span className="text-lg font-bold text-content-primary">
                          ${((parseFloat(customPercentages[user.guestSessionId]) || 0) * bill.summary.remainingBalance / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Percent className="w-4 h-4 text-content-tertiary" />
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={customPercentages[user.guestSessionId] || ''}
                            onChange={(e) => handlePercentageChange(user.guestSessionId, e.target.value)}
                            className={`w-full p-3 pr-8 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                              optimisticState.pendingUpdate && optimisticState.percentages?.[user.guestSessionId]
                                ? 'ring-1 ring-yellow-400 bg-yellow-50'
                                : ''
                            }`}
                            placeholder="0.0"
                            disabled={splitCalculationLoading}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-content-secondary font-medium">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {splitOption.type === SplitBillType.BY_AMOUNT && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface rounded-xl border p-6"
              >
                <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Set Amounts</span>
                </h3>
                <div className="space-y-4">
                  {uniqueUsers.map((user, userIdx) => (
                    <div key={user.guestSessionId || `user-amt-${userIdx}`} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-content-primary">{user.userName}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <DollarSign className="w-4 h-4 text-content-tertiary" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={customAmounts[user.guestSessionId] || ''}
                          onChange={(e) => handleAmountChange(user.guestSessionId, e.target.value)}
                          className={`flex-1 p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                            optimisticState.pendingUpdate && optimisticState.amounts?.[user.guestSessionId]
                              ? 'ring-1 ring-yellow-400 bg-yellow-50'
                              : ''
                          }`}
                          placeholder="0.00"
                          disabled={splitCalculationLoading}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Split Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Split Summary</span>
                {syncingWithOtherUsers && (
                  <div className="flex items-center space-x-1 text-sm text-content-secondary">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    <span className="text-xs">Syncing...</span>
                  </div>
                )}
              </h3>
              <div className="space-y-3">
                {uniqueUsers.map((user, userIdx) => {
                  const amount = splitAmounts[user.guestSessionId] || 0
                  const uniqueKey = user.guestSessionId || `user-${userIdx}`
                  const isCurrentUser = user.guestSessionId === currentUser.guestSessionId
                  return (
                    <div
                      key={uniqueKey}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`font-medium ${
                          isCurrentUser ? 'text-primary' : 'text-content-primary'
                        }`}>
                          {user.userName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <span className={`text-lg font-bold ${
                        isCurrentUser ? 'text-primary' : 'text-content-primary'
                      }`}>
                        ${amount.toFixed(2)}
                      </span>
                    </div>
                  )
                })}

              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between font-semibold text-content-primary border-t pt-2">
                  <span>Total Split</span>
                  <span>${totalSplitAmount.toFixed(2)}</span>
                </div>

                {Math.abs(totalSplitAmount - bill.summary.remainingBalance) > 0.01 && (
                  <div className="p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-status-warning">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Split total doesn't match remaining balance</span>
                    </div>
                    <div className="text-sm text-status-warning/80 mt-1">
                      Expected: ${bill.summary.remainingBalance.toFixed(2)} | Current: ${totalSplitAmount.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Method</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant={selectedPaymentMethod === PaymentMethod.CREDIT_CARD ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod(PaymentMethod.CREDIT_CARD)}
                  className="h-16 flex-col"
                  disabled={isProcessing || updatingTip}
                >
                  <CreditCard className="w-6 h-6 mb-1" />
                  <span className="text-sm">Card</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.MOBILE_PAYMENT ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod(PaymentMethod.MOBILE_PAYMENT)}
                  className="h-16 flex-col"
                  disabled={isProcessing || updatingTip}
                >
                  <Smartphone className="w-6 h-6 mb-1" />
                  <span className="text-sm">Apple Pay</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.CASH ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod('CASH' as PaymentMethod)}
                  className="h-16 flex-col"
                  disabled={isProcessing || updatingTip}
                >
                  <Banknote className="w-6 h-6 mb-1" />
                  <span className="text-sm">Cash</span>
                </Button>
              </div>
            </motion.div>

            {/* Tip Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Add Tip</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {getTipOptions().map((tip) => (
                  <Button
                    key={tip.percentage}
                    variant={selectedTip === tip.amount ? 'default' : 'outline'}
                    onClick={() => handleTipSelection(tip.amount)}
                    className="h-12 flex-col"
                    disabled={isProcessing || updatingTip}
                  >
                    <span className="text-sm font-semibold">{tip.label}</span>
                    <span className="text-xs">${tip.amount.toFixed(2)}</span>
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-4 h-4 text-content-tertiary" />
                  <input
                    type="number"
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value)
                      setSelectedTip(0)
                    }}
                    placeholder="Custom tip amount"
                    className="flex-1 p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    min="0"
                    step="0.01"
                    disabled={isProcessing || updatingTip}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleTipSelection(0)}
                  className="w-full"
                  disabled={isProcessing || updatingTip}
                >
                  No Tip
                </Button>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-content-secondary">
                  <Info className="w-4 h-4" />
                  <span>
                    Tips go directly to your server and kitchen staff
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-surface rounded-xl border p-6 sticky top-24"
            >
              <h3 className="text-xl font-semibold text-content-primary mb-6">
                Payment Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-content-secondary">
                  <span>Your Share</span>
                  <span>${userAmount.toFixed(2)}</span>
                </div>

                {(selectedTip > 0 || getCustomTipAmount() > 0) && (
                  <div className="flex justify-between text-content-secondary">
                    <span>Tip</span>
                    <span>${(selectedTip > 0 ? selectedTip : getCustomTipAmount()).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between text-xl font-bold text-content-primary">
                    <span>Total</span>
                    <span>${(userAmount + (selectedTip > 0 ? selectedTip : getCustomTipAmount())).toFixed(2)}</span>
                  </div>
                </div>
              </div>


              {/* Stripe Payment Form for Credit Card */}
              {selectedPaymentMethod === PaymentMethod.CREDIT_CARD && clientSecret && (
                <div className="space-y-4">
                  <StripeProvider>
                    <PaymentForm
                      amount={Math.round((userAmount + (selectedTip > 0 ? selectedTip : getCustomTipAmount())) * 100)}
                      tableSessionId={actualSessionId}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      clientSecret={clientSecret}
                    />
                  </StripeProvider>
                </div>
              )}

              {/* Payment Actions */}
              {selectedPaymentMethod === PaymentMethod.CREDIT_CARD && !clientSecret && (
                <Button
                  onClick={createPaymentIntent}
                  size="lg"
                  className="w-full"
                  disabled={isProcessing || userAmount <= 0}
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Preparing Payment...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Continue with Card</span>
                    </div>
                  )}
                </Button>
              )}

              {selectedPaymentMethod === PaymentMethod.CASH && (
                <Button
                  onClick={processPayment}
                  size="lg"
                  className="w-full"
                  disabled={isProcessing || userAmount <= 0}
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Requesting Payment...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Banknote className="w-4 h-4" />
                      <span>Pay ${(userAmount + (selectedTip > 0 ? selectedTip : getCustomTipAmount())).toFixed(2)} with Cash</span>
                    </div>
                  )}
                </Button>
              )}

              {selectedPaymentMethod === PaymentMethod.MOBILE_PAYMENT && (
                <Button
                  onClick={createPaymentIntent}
                  size="lg"
                  className="w-full"
                  disabled={isProcessing || userAmount <= 0}
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Preparing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4" />
                      <span>Pay ${(userAmount + (selectedTip > 0 ? selectedTip : getCustomTipAmount())).toFixed(2)}</span>
                    </div>
                  )}
                </Button>
              )}

              <div className="mt-4 text-xs text-content-tertiary text-center">
                <p>Your payment is secured by Stripe</p>
                <p className="mt-1">Card details are never stored on our servers</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      <AnimatePresence>
        {conflictResolution.showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              // Allow clicking outside to dismiss for non-critical conflicts
              if (conflictResolution.conflictType !== 'concurrent_update') {
                setConflictResolution({ showDialog: false, conflictType: null })
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl border max-w-md w-full p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-status-warning/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-status-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-content-primary">
                    Split Update Conflict
                  </h3>
                  <p className="text-sm text-content-secondary">
                    {conflictResolution.conflictData?.updatedBy} made changes while you were editing
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-content-secondary mb-4">
                  Both you and {conflictResolution.conflictData?.updatedBy} have made changes to the split calculation.
                  Choose how to resolve this conflict:
                </p>

                <div className="space-y-3">
                  {conflictResolution.resolutionOptions?.map((option) => (
                    <button
                      key={option.id}
                      onClick={option.action}
                      className="w-full text-left p-4 border border-default rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-colors"
                    >
                      <div className="font-medium text-content-primary mb-1">
                        {option.label}
                      </div>
                      <div className="text-sm text-content-secondary">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-xs text-content-tertiary">
                  Updated: {conflictResolution.conflictData?.timestamp
                    ? new Date(conflictResolution.conflictData.timestamp).toLocaleTimeString()
                    : 'Just now'
                  }
                </div>
                {conflictResolution.conflictType !== 'concurrent_update' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConflictResolution({ showDialog: false, conflictType: null })}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}