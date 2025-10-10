'use client'

import { createLogger } from '@/lib/logger'

const log = createLogger('SplitBillPayment')

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  ReceiptText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Star,
  Percent,
  Banknote,
  Users,
  User,
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
  bill: initialBill,
  currentUser,
  users,
  api,
  sessionId,
  restaurantId,
  tableId,
  onPaymentComplete,
  onCancel
}: SplitBillPaymentProps) {
  // Use state for bill to allow updates when other users complete payments
  const [bill, setBill] = useState<TableSessionBill>(initialBill)

  // Get the actual sessionId, with fallback to prop if bill.sessionId is undefined
  const actualSessionId = bill.sessionId || sessionId
  if (!actualSessionId) {
    log.error('[SplitBillPayment] No sessionId available:', { billSessionId: bill.sessionId, propSessionId: sessionId })
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
  // Track recent local split method changes to prevent WebSocket double-updates (now using update ID)
  const [recentLocalSplitChange, setRecentLocalSplitChange] = useState<{
    type: SplitBillType
    updateId: string
    timestamp: number
  } | null>(null)
  // Track last update metadata for conflict resolution
  const [lastUpdateMetadata, setLastUpdateMetadata] = useState<{
    updateId: string
    timestamp: number
    updatedBy: string
  } | null>(null)
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

  // FIXED: Add in-flight request tracking to prevent duplicate API calls
  const inFlightRequestsRef = useRef<Set<string>>(new Set())

  // FIXED: Track if we're currently creating split calculation to prevent loops
  const isCreatingSplitRef = useRef(false)

  // Split calculation lock state
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false)
  const [splitLockStatus, setSplitLockStatus] = useState<{
    isLocked: boolean
    lockedBy?: string
    lockReason?: string
    lockedAt?: string
  }>({ isLocked: false })
  const [lockingPayment, setLockingPayment] = useState(false)

  // Editing status for split method changes
  const [editingStatus, setEditingStatus] = useState<{
    isBeingEdited: boolean
    editingBy?: string
    editingUser?: string
  }>({ isBeingEdited: false })

  // Initial split state for proper loading order (moved here to avoid hoisting issues)
  const [initialSplitLoaded, setInitialSplitLoaded] = useState(false)
  const [loadingInitialSplit, setLoadingInitialSplit] = useState(true)

  // Backend-calculated split amounts state (moved here to avoid hoisting issues)
  const [backendSplitAmounts, setBackendSplitAmounts] = useState<{ [guestSessionId: string]: number }>({})
  const [splitCalculationLoading, setSplitCalculationLoading] = useState(false)
  const [splitCalculationError, setSplitCalculationError] = useState<string | null>(null)
  const [syncingWithOtherUsers, setSyncingWithOtherUsers] = useState(false)

  // Debouncing state (moved here to avoid hoisting issues)
  const debounceTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const pendingUpdatesRef = useRef<{ [key: string]: any }>({})
  const [debouncingUpdates, setDebouncingUpdates] = useState<{ [key: string]: boolean }>({})

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

  // Fetch existing split calculation on component mount
  useEffect(() => {
    const fetchInitialSplitCalculation = async () => {
      if (!actualSessionId) {
        setLoadingInitialSplit(false)
        return
      }

      try {
        setLoadingInitialSplit(true)
        log.debug('[SplitBillPayment] Fetching initial split calculation for session:', actualSessionId)

        const response = await api.tableSession.getSplitCalculation(actualSessionId)

        if (response.success && response.data) {
          const splitCalc = response.data
          log.debug('[SplitBillPayment] Found existing split calculation:', splitCalc)

          // Set the split type from existing calculation
          setSplitOption(prev => ({
            ...prev,
            type: splitCalc.splitType as SplitBillType,
            participants: splitCalc.participants || prev.participants
          }))

          // Set backend split amounts
          setBackendSplitAmounts(splitCalc.splitAmounts || {})

          // Update local state with existing data
          if (splitCalc.percentages) {
            setCustomPercentages(
              Object.fromEntries(
                Object.entries(splitCalc.percentages).map(([userId, percentage]) => [
                  userId,
                  percentage.toString()
                ])
              )
            )
          }

          if (splitCalc.amounts) {
            setCustomAmounts(
              Object.fromEntries(
                Object.entries(splitCalc.amounts).map(([userId, amount]) => [
                  userId,
                  amount.toString()
                ])
              )
            )
          }

          if (splitCalc.itemAssignments) {
            setItemAssignments(splitCalc.itemAssignments)
          }

          setInitialSplitLoaded(true)
          log.debug('[SplitBillPayment] Successfully loaded existing split calculation')
        } else {
          log.debug('[SplitBillPayment] No existing split calculation found, using defaults')
          setInitialSplitLoaded(false)
        }
      } catch (error) {
        log.error('[SplitBillPayment] Error fetching initial split calculation:', error)
        setInitialSplitLoaded(false)
        // Don't show error to user for missing split calculation - it's expected for new sessions
      } finally {
        setLoadingInitialSplit(false)
      }
    }

    fetchInitialSplitCalculation()
  }, [actualSessionId, api]) // Only run once when sessionId is available

  // Initialize split option participants when users change
  useEffect(() => {
    if (uniqueUsers.length > 0) {
      setSplitOption(prev => ({
        ...prev,
        participants: uniqueUsers.map(user => user.guestSessionId)
      }))
    }
  }, [uniqueUsers])

  // Initialize default split amounts and percentages
  useEffect(() => {
    // CRITICAL FIX: Added initialSplitLoaded guard to prevent re-initialization
    // This prevents the bug where backendSplitAmounts updates would reset all percentages
    if (uniqueUsers.length > 0 && bill.summary.remainingBalance > 0 && !loadingInitialSplit && !initialSplitLoaded) {
      // Initialize equal percentages for all users
      const equalPercentage = (100 / uniqueUsers.length).toFixed(2)
      const percentages: { [userId: string]: string } = {}
      const amounts: { [userId: string]: string } = {}
      const equalAmount = (bill.summary.remainingBalance / uniqueUsers.length).toFixed(2)

      uniqueUsers.forEach(user => {
        percentages[user.guestSessionId] = equalPercentage
        amounts[user.guestSessionId] = equalAmount
      })

      log.debug('[SplitBillPayment] Initializing split amounts:', {
        percentages,
        amounts,
        remainingBalance: bill.summary.remainingBalance,
        userCount: uniqueUsers.length
      })

      setCustomPercentages(percentages)
      setCustomAmounts(amounts)

      // Create initial split calculation if we don't have backend amounts
      if (actualSessionId && Object.keys(backendSplitAmounts).length === 0) {
        log.debug('[SplitBillPayment] Creating initial split calculation...')
        createSplitCalculation()
      }
    }
  }, [uniqueUsers, bill.summary.remainingBalance, loadingInitialSplit, initialSplitLoaded, actualSessionId])

  // Auto-switch from BY_ITEMS if only one item remains
  useEffect(() => {
    if (splitOption.type === SplitBillType.BY_ITEMS && totalUniqueItems <= 1) {
      log.debug('[SplitBillPayment] Auto-switching from BY_ITEMS to EQUAL due to single item')
      setSplitOption(prev => ({
        ...prev,
        type: SplitBillType.EQUAL
      }))
    }
  }, [totalUniqueItems, splitOption.type])


  // REMOVED: Duplicate initialization effect - consolidated into the first initialization effect above



  // Input field activity tracking to prevent cross-user interference
  const [activeInputs, setActiveInputs] = useState<{
    [userId: string]: {
      field: 'percentage' | 'amount'
      lastActivity: number
    }
  }>({})

  // WebSocket update debouncing to reduce flickering
  const webSocketUpdateTimeoutRef = useRef<NodeJS.Timeout>()
  const [pendingWebSocketUpdate, setPendingWebSocketUpdate] = useState<any>(null)

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

  // Helper functions for input activity tracking
  const markInputActive = useCallback((userId: string, field: 'percentage' | 'amount') => {
    setActiveInputs(prev => ({
      ...prev,
      [userId]: {
        field,
        lastActivity: Date.now()
      }
    }))
  }, [])

  const isInputRecentlyActive = useCallback((userId: string, field: 'percentage' | 'amount') => {
    const input = activeInputs[userId]
    if (!input || input.field !== field) return false
    return Date.now() - input.lastActivity < 800 // REDUCED: 800ms protection for faster updates
  }, [activeInputs])

  // Helper function to check if state has actually changed (prevents unnecessary re-renders)
  const hasStateChanged = useCallback((
    incomingSplitCalculation: any,
    currentSplitType: SplitBillType,
    currentPercentages: { [userId: string]: string },
    currentAmounts: { [userId: string]: string },
    currentBackendAmounts: { [userId: string]: number },
    currentItemAssignments: { [itemId: string]: string }
  ): boolean => {
    // Check if split type changed
    if (incomingSplitCalculation.splitType && incomingSplitCalculation.splitType !== currentSplitType) {
      return true
    }

    // Check if backend amounts changed (with tolerance for floating point)
    if (incomingSplitCalculation.splitAmounts) {
      const incomingAmounts = incomingSplitCalculation.splitAmounts
      const currentKeys = Object.keys(currentBackendAmounts)
      const incomingKeys = Object.keys(incomingAmounts)

      if (currentKeys.length !== incomingKeys.length) return true

      for (const key of incomingKeys) {
        const incoming = incomingAmounts[key]
        const current = currentBackendAmounts[key]
        if (Math.abs(incoming - (current || 0)) > 0.01) {
          return true
        }
      }
    }

    // Check if percentages changed
    if (incomingSplitCalculation.percentages) {
      const incomingPercentages = incomingSplitCalculation.percentages
      for (const userId in incomingPercentages) {
        const incomingValue = incomingPercentages[userId].toString()
        const currentValue = currentPercentages[userId] || '0'
        // Increased tolerance from 0.1 to 0.5 to handle rounding differences
        if (Math.abs(parseFloat(incomingValue) - parseFloat(currentValue)) > 0.5) {
          return true
        }
      }
    }

    // Check if amounts changed
    if (incomingSplitCalculation.amounts) {
      const incomingAmounts = incomingSplitCalculation.amounts
      for (const userId in incomingAmounts) {
        const incomingValue = incomingAmounts[userId].toString()
        const currentValue = currentAmounts[userId] || '0'
        if (Math.abs(parseFloat(incomingValue) - parseFloat(currentValue)) > 0.01) {
          return true
        }
      }
    }

    // Check if item assignments changed
    if (incomingSplitCalculation.itemAssignments) {
      const incomingAssignments = incomingSplitCalculation.itemAssignments
      const currentKeys = Object.keys(currentItemAssignments)
      const incomingKeys = Object.keys(incomingAssignments)

      if (currentKeys.length !== incomingKeys.length) return true

      for (const itemId in incomingAssignments) {
        if (incomingAssignments[itemId] !== currentItemAssignments[itemId]) {
          return true
        }
      }
    }

    return false
  }, [])

  // Smart WebSocket update handler - IMPROVED with batching and state diffing
  const applySmartWebSocketUpdate = useCallback((data: any) => {
    const splitCalculation = data.splitCalculation
    if (!splitCalculation) return

    // Use timestamp-based deduplication (updateId not available in backend events)
    const incomingTimestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now()

    // Check if update is stale (older than last processed update)
    if (lastUpdateMetadata && lastUpdateMetadata.timestamp && incomingTimestamp <= lastUpdateMetadata.timestamp) {
      log.debug('[SplitBillPayment] ⏭️ Skipping stale/duplicate update:', {
        incomingTimestamp: new Date(incomingTimestamp).toISOString(),
        lastTimestamp: new Date(lastUpdateMetadata.timestamp).toISOString()
      })
      return
    }

    // Check if state has actually changed - prevents unnecessary re-renders
    const stateChanged = hasStateChanged(
      splitCalculation,
      splitOption.type,
      customPercentages,
      customAmounts,
      backendSplitAmounts,
      itemAssignments
    )

    if (!stateChanged) {
      log.debug('[SplitBillPayment] Skipping WebSocket update - no state changes detected')
      // Still update metadata to track we saw this update
      if (data.updateId && data.timestamp) {
        setLastUpdateMetadata({
          updateId: data.updateId,
          timestamp: new Date(data.timestamp).getTime(),
          updatedBy: data.updatedBy
        })
      }
      return
    }

    // CRITICAL: Determine if this is a split method change
    // Check against current state and trust server's isTypeChange flag
    const isSplitMethodChange = data.isTypeChange ||
                                (splitCalculation.splitType &&
                                 splitCalculation.splitType !== splitOption.type)

    // Don't skip split type changes even if they match recent local changes
    // Server is the source of truth for split type changes
    if (!isSplitMethodChange && recentLocalSplitChange &&
        recentLocalSplitChange.type === splitCalculation.splitType &&
        Date.now() - recentLocalSplitChange.timestamp < 1000) {
      log.debug('[SplitBillPayment] ⏭️ Skipping WebSocket value update - matches recent local change')
      return
    }

    log.debug('[SplitBillPayment] ✅ Applying WebSocket update:', {
      isSplitMethodChange,
      currentType: splitOption.type,
      incomingType: splitCalculation.splitType,
      timestamp: new Date(incomingTimestamp).toISOString(),
      updatedBy: data.updatedBy,
      hasSplitAmounts: !!splitCalculation.splitAmounts
    })

    // BATCH ALL STATE UPDATES TOGETHER to prevent flickering
    // Use functional updates to ensure we work with latest state

    // CRITICAL FIX: Always update backend split amounts when provided
    if (splitCalculation.splitAmounts) {
      log.debug('[SplitBillPayment] 🔄 Updating backend split amounts:', splitCalculation.splitAmounts)
      setBackendSplitAmounts(splitCalculation.splitAmounts)
    }

    // Handle split type change
    if (isSplitMethodChange) {
      log.debug('[SplitBillPayment] 🔄 Split method changed from', splitOption.type, 'to', splitCalculation.splitType)

      // Show notification about split method change
      const updatedByUser = users.find(u => u.guestSessionId === data.updatedBy)
      const updatedByName = updatedByUser?.userName || 'Another user'
      toast.info(`${updatedByName} changed split method to ${splitCalculation.splitType.replace('BY_', '').toLowerCase()}`, {
        duration: 3000
      })

      // Update split option with new type - server is the source of truth
      setSplitOption(prev => ({
        ...prev,
        type: splitCalculation.splitType
      }))

      // CRITICAL: Clear input values when switching methods to prevent flickering
      // This ensures UI shows backend-calculated values immediately
      if (splitCalculation.splitType === SplitBillType.EQUAL) {
        // Clear percentages and amounts for equal split
        setCustomPercentages({})
        setCustomAmounts({})
      } else if (splitCalculation.splitType === SplitBillType.BY_PERCENTAGE) {
        // Initialize percentages from backend, clear amounts
        if (splitCalculation.percentages) {
          const newPercentages: { [userId: string]: string } = {}
          Object.entries(splitCalculation.percentages).forEach(([userId, pct]: [string, any]) => {
            newPercentages[userId] = pct.toString()
          })
          setCustomPercentages(newPercentages)
        }
        setCustomAmounts({})
      } else if (splitCalculation.splitType === SplitBillType.BY_AMOUNT) {
        // Initialize amounts from backend, clear percentages
        if (splitCalculation.amounts) {
          const newAmounts: { [userId: string]: string } = {}
          Object.entries(splitCalculation.amounts).forEach(([userId, amt]: [string, any]) => {
            newAmounts[userId] = amt.toString()
          })
          setCustomAmounts(newAmounts)
        }
        setCustomPercentages({})
      }
    } else {
      // NOT a split method change - only update values for other users
      // Preserve current user's input to prevent interference

      if (splitCalculation.percentages) {
        const newPercentages: { [userId: string]: string } = {}
        Object.entries(splitCalculation.percentages).forEach(([userId, percentage]: [string, any]) => {
          // Only update if user isn't actively editing this field
          if (!isInputRecentlyActive(userId, 'percentage')) {
            newPercentages[userId] = percentage.toString()
          } else {
            // Preserve current value for actively editing user
            newPercentages[userId] = customPercentages[userId] || percentage.toString()
          }
        })

        // Preserve current user's optimistic update if it exists
        if (optimisticState.percentages && optimisticState.percentages[currentUser.guestSessionId]) {
          newPercentages[currentUser.guestSessionId] = optimisticState.percentages[currentUser.guestSessionId]
        }

        setCustomPercentages(prev => ({ ...prev, ...newPercentages }))
      }

      if (splitCalculation.amounts) {
        const newAmounts: { [userId: string]: string } = {}
        Object.entries(splitCalculation.amounts).forEach(([userId, amount]: [string, any]) => {
          // Only update if user isn't actively editing this field
          if (!isInputRecentlyActive(userId, 'amount')) {
            newAmounts[userId] = amount.toString()
          }
        })

        setCustomAmounts(prev => ({ ...prev, ...newAmounts }))
      }
    }

    // Handle item assignments (only for BY_ITEMS mode)
    if (splitCalculation.itemAssignments) {
      setItemAssignments(splitCalculation.itemAssignments)
    }

    // Update metadata after successful application (using timestamp for deduplication)
    setLastUpdateMetadata({
      updateId: `ws_${incomingTimestamp}`, // Generate consistent ID from timestamp
      timestamp: incomingTimestamp,
      updatedBy: data.updatedBy
    })

    // Show brief sync indicator only for meaningful changes
    if (!syncingWithOtherUsers && data.updatedBy !== currentUser.guestSessionId) {
      setSyncingWithOtherUsers(true)
      setTimeout(() => {
        setSyncingWithOtherUsers(false)
      }, 400) // Reduced from 600ms to 400ms for faster feedback
    }
  }, [splitOption.type, users, optimisticState, currentUser.guestSessionId, isInputRecentlyActive, recentLocalSplitChange, lastUpdateMetadata, customPercentages, customAmounts, backendSplitAmounts, itemAssignments, hasStateChanged, syncingWithOtherUsers])

  // Helper function to check for bill updates (moved before handleTableSessionUpdate to avoid initialization error)
  const checkForBillUpdates = useCallback(async (): Promise<{ updated: boolean; newBill?: TableSessionBill }> => {
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
      log.error('[SplitBillPayment] Failed to check for bill updates:', error)
      return { updated: false }
    }
  }, [actualSessionId, api.tableSession, lastBillUpdate, bill.summary.remainingBalance])

  // WebSocket integration for real-time split updates
  const handleTableSessionUpdate = useCallback((data: any) => {
    // CRITICAL FIX: Correct event type is 'split:calculation_updated' (with colon)
    if (data.type === 'split:calculation_updated') {
      log.debug('[SplitBillPayment] ✅ Received split calculation update:', data)

      // CRITICAL: Check if this is a split type change from server
      // Trust isTypeChange flag from backend or detect type mismatch
      const isSplitMethodChange = data.isTypeChange ||
                                  (data.splitCalculation?.splitType &&
                                   data.splitCalculation.splitType !== splitOption.type)

      // For split method changes: ALL users must see the update (server is source of truth)
      // For value changes: Skip only if it's the same user's own value update echo
      if (!isSplitMethodChange) {
        // Only skip if it's a value update from the same user for their own value
        const isOwnValueEcho = data.isValueUpdate &&
                               data.updatedBy === currentUser.guestSessionId &&
                               data.updatedUser === currentUser.guestSessionId

        if (isOwnValueEcho) {
          log.debug('[SplitBillPayment] ⏭️ Skipping own value update echo')
          return
        }

        // Check for concurrent update conflicts
        if (optimisticState.pendingUpdate) {
          handleConcurrentUpdateConflict(data, data.splitCalculation)
          return
        }
      }

      // Apply the update - always trust server state for split type changes
      applySmartWebSocketUpdate(data)

      // Show brief sync indicator only for meaningful changes
      if (!syncingWithOtherUsers) {
        setSyncingWithOtherUsers(true)
        setTimeout(() => {
          setSyncingWithOtherUsers(false)
        }, 600) // Optimized to 600ms for faster visual feedback
      }
    }

    // Handle editing status events
    if (data.type === 'split:being_edited') {
      log.debug('[SplitBillPayment] Someone is editing the split:', data)
      setEditingStatus({
        isBeingEdited: true,
        editingBy: data.editingBy,
        editingUser: data.editingUser
      })
    }

    if (data.type === 'split:editing_done') {
      log.debug('[SplitBillPayment] Editing done:', data)
      setEditingStatus({
        isBeingEdited: false,
        editingBy: undefined,
        editingUser: undefined
      })
    }

    // Handle split calculation lock events
    if (data.type === 'split:calculation_locked') {
      log.debug('[SplitBillPayment] Split calculation locked:', data)
      setSplitLockStatus({
        isLocked: true,
        lockedBy: data.lockedBy,
        lockReason: data.lockReason,
        lockedAt: data.lockedAt
      })

      const lockedByUser = users.find(u => u.guestSessionId === data.lockedBy)
      const lockedByName = lockedByUser?.userName || 'Another user'

      if (data.lockedBy !== currentUser.guestSessionId) {
        toast.info(`${lockedByName} is also making a payment`, {
          description: 'You can both pay simultaneously',
          duration: 5000
        })
      }
    }

    if (data.type === 'split:calculation_unlocked') {
      log.debug('[SplitBillPayment] Split calculation unlocked:', data)
      setSplitLockStatus({ isLocked: false })

      if (data.unlockedBy !== currentUser.guestSessionId) {
        toast.info('Split calculation is now available for changes', {
          duration: 3000
        })
      }
    }

    // Handle user join events for proper sync status display
    if (data.type === 'user_joined_table_session') {
      log.debug('[SplitBillPayment] User joined table session:', data)

      // If someone else joined, show sync indicator briefly for existing users
      if (data.guestSessionId !== currentUser.guestSessionId) {
        setSyncingWithOtherUsers(true)

        const joinedUser = data.userName || 'Someone'
        toast.info(`${joinedUser} joined the table`, {
          description: 'Split calculation synced with new participant',
          duration: 3000
        })

        // Clear sync indicator after brief delay
        setTimeout(() => {
          setSyncingWithOtherUsers(false)
        }, 1500)
      }
    }

    // Handle user leave events
    if (data.type === 'user_left_table_session') {
      log.debug('[SplitBillPayment] User left table session:', data)

      if (data.guestSessionId !== currentUser.guestSessionId) {
        const leftUser = data.userName || 'Someone'
        toast.info(`${leftUser} left the table`, {
          description: 'Split calculation updated',
          duration: 3000
        })
      }
    }

    // Handle payment completion events to refresh bill
    if (data.type === 'payment_completed') {
      log.debug('[SplitBillPayment] Payment completed event received:', data)

      // If someone else completed a payment, refresh the bill
      if (data.guestSessionId !== currentUser.guestSessionId) {
        const payerName = users.find(u => u.guestSessionId === data.guestSessionId)?.userName || 'Another user'
        toast.success(`${payerName} completed their payment`, {
          description: 'Updating bill with new balance...',
          duration: 5000
        })

        // Fetch the updated bill after a short delay
        setTimeout(async () => {
          try {
            const billResponse = await api.tableSession.getBill(actualSessionId!)
            if (billResponse.success && billResponse.data) {
              const newBill = billResponse.data
              log.info('[SplitBillPayment] Bill updated after payment completion, new remaining balance:', newBill.summary.remainingBalance)

              // Update the bill state with the new data
              setBill(newBill)

              // Clear backend split amounts to force recalculation based on new remaining balance
              setBackendSplitAmounts({})

              // If remaining balance is 0, bill is fully paid
              if (newBill.summary.remainingBalance <= 0.01) {
                toast.success('Bill has been fully paid!', {
                  description: 'Thank you for your payment',
                  duration: 5000
                })
                // Call onPaymentComplete to notify parent
                if (onPaymentComplete) {
                  onPaymentComplete('bill_fully_paid')
                }
              } else {
                toast.info(`Remaining balance: $${newBill.summary.remainingBalance.toFixed(2)}`, {
                  description: 'You can now proceed with your payment',
                  duration: 5000
                })
              }
            }
          } catch (error) {
            log.error('[SplitBillPayment] Failed to fetch updated bill after payment:', error)
            toast.error('Failed to update bill. Please refresh the page.')
          }
        }, 2000) // Wait 2 seconds for backend to fully process
      }
    }

    // Handle payment status updates
    if (data.type === 'payment_status_update') {
      log.debug('[SplitBillPayment] Payment status updated:', data)

      // If payment is processing or completed by another user, show status
      if (data.guestSessionId !== currentUser.guestSessionId) {
        if (data.status === 'PROCESSING') {
          const processingUser = users.find(u => u.guestSessionId === data.guestSessionId)?.userName || 'Another user'
          toast.info(`${processingUser} is processing payment...`, {
            duration: 3000
          })
        }
      }
    }
  }, [currentUser.guestSessionId, users, onPaymentComplete, checkForBillUpdates, actualSessionId, api.tableSession, setBill])

  // Set up WebSocket connection for real-time updates
  useTableSessionWebSocket(
    actualSessionId || '',
    restaurantId || '',
    tableId || '',
    currentUser.guestSessionId,
    handleTableSessionUpdate
  )

  // Split calculation lock management
  const checkSplitLockStatus = async (): Promise<boolean> => {
    if (!actualSessionId) return false

    try {
      const response = await api.tableSession.getSplitCalculationLockStatus(actualSessionId)
      if (response.success && response.data) {
        setSplitLockStatus({
          isLocked: response.data.isLocked,
          lockedBy: response.data.lockedBy,
          lockReason: response.data.lockReason,
          lockedAt: response.data.lockedAt
        })
        return response.data.isLocked
      }
    } catch (error) {
      log.error('[SplitBillPayment] Error checking lock status:', error)
    }
    return false
  }

  const lockSplitCalculation = async (paymentIntentId: string): Promise<boolean> => {
    if (!actualSessionId) return false

    try {
      setLockingPayment(true)
      const response = await api.tableSession.lockSplitCalculation(actualSessionId, {
        lockReason: 'PAYMENT_CREATED'
      }, { guestSessionId: currentUser.guestSessionId })

      if (response.success) {
        setSplitLockStatus({
          isLocked: true,
          lockedBy: currentUser.guestSessionId,
          lockReason: 'PAYMENT_CREATED',
          lockedAt: new Date().toISOString()
        })

        log.debug('[SplitBillPayment] Split calculation locked successfully')

        // Show notification to other users via WebSocket (handled by backend)
        const lockMessage = `${currentUser.userName || 'Someone'} is processing payment - split method is now locked`
        log.debug('[SplitBillPayment] Lock notification:', lockMessage)

        return true
      }
    } catch (error) {
      log.error('[SplitBillPayment] Error locking split calculation:', error)
      toast.error('Failed to lock payment. Please try again.')
    } finally {
      setLockingPayment(false)
    }
    return false
  }

  const unlockSplitCalculation = async (paymentIntentId?: string): Promise<boolean> => {
    if (!actualSessionId) return false

    try {
      const response = await api.tableSession.unlockSplitCalculation(actualSessionId, {
        paymentIntentId
      })

      if (response.success) {
        setSplitLockStatus({ isLocked: false })
        return true
      }
    } catch (error) {
      log.error('[SplitBillPayment] Error unlocking split calculation:', error)
    }
    return false
  }

  // Check lock status and recover if needed on component mount
  useEffect(() => {
    if (actualSessionId) {
      recoverSplitLockIfNeeded()
      // Also check lock status immediately on mount
      checkSplitLockStatus()

      // Fetch the latest bill data on mount to ensure we have current remaining balance
      const fetchLatestBill = async () => {
        try {
          const billResponse = await api.tableSession.getBill(actualSessionId)
          if (billResponse.success && billResponse.data) {
            log.info('[SplitBillPayment] Fetched latest bill on mount, remaining balance:', billResponse.data.summary.remainingBalance)
            setBill(billResponse.data)

            // If remaining balance has changed, clear backend split amounts
            if (Math.abs(billResponse.data.summary.remainingBalance - initialBill.summary.remainingBalance) > 0.01) {
              log.info('[SplitBillPayment] Remaining balance changed, clearing backend split amounts')
              setBackendSplitAmounts({})
            }
          }
        } catch (error) {
          log.error('[SplitBillPayment] Failed to fetch latest bill on mount:', error)
        }
      }
      fetchLatestBill()
    }
  }, [actualSessionId])

  // Payment intent recovery function
  const recoverExistingPaymentIntent = async (): Promise<void> => {
    if (!actualSessionId) return

    try {
      // Check if there are any existing payment intents for this user
      const paymentStatusResponse = await api.tableSession.getPaymentStatus(actualSessionId)

      if (paymentStatusResponse.success && paymentStatusResponse.data?.payments) {
        // Look for pending/processing payment intents created by this user
        const existingPayment = paymentStatusResponse.data.payments.find((payment: any) =>
          payment.paidBy === currentUser.guestSessionId &&
          (payment.status === 'PENDING' || payment.status === 'PROCESSING') &&
          payment.clientSecret
        )

        if (existingPayment) {
          log.debug('[SplitBillPayment] Recovering existing payment intent:', existingPayment.id)

          // Restore payment state
          setClientSecret(existingPayment.clientSecret)
          setPaymentId(existingPayment.id)

          // Restore payment method if available
          if (existingPayment.paymentMethod) {
            setSelectedPaymentMethod(existingPayment.paymentMethod)
          }

          log.debug('[SplitBillPayment] Payment intent recovered successfully')
        }
      }
    } catch (error) {
      log.error('[SplitBillPayment] Error recovering payment intent:', error)
      // Don't show error to user, just log it
    }
  }

  // Lock recovery function
  const recoverSplitLockIfNeeded = async (): Promise<void> => {
    if (!actualSessionId) return

    try {
      // First try to recover any orphaned locks
      const recoveryResponse = await api.tableSession.recoverSplitLock(actualSessionId)

      if (recoveryResponse.success && recoveryResponse.data) {
        const { recovered, cleaned, lockStatus } = recoveryResponse.data

        if (recovered && cleaned) {
          toast.info('Stale payment lock was automatically cleaned up', {
            duration: 4000
          })
        } else if (recovered && lockStatus?.isLocked) {
          // User reconnected and still has the lock
          setSplitLockStatus({
            isLocked: true,
            lockedBy: lockStatus.lockedBy,
            lockReason: lockStatus.lockReason,
            lockedAt: lockStatus.lockedAt
          })

          // Also try to recover any existing payment intent for this user
          await recoverExistingPaymentIntent()

          toast.info('Your payment session was recovered', {
            description: 'You can continue with your payment',
            duration: 4000
          })
        }

        // If not recovered, just check normal lock status
        if (!recovered) {
          await checkSplitLockStatus()
        }
      } else {
        // Fallback to normal lock status check
        await checkSplitLockStatus()
      }
    } catch (error) {
      log.error('[SplitBillPayment] Error during lock recovery:', error)
      // Fallback to normal lock status check
      await checkSplitLockStatus()
    }
  }

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
    log.debug(`[SplitBillPayment] ⚡ Applying optimistic ${updateType} update:`, {
      updateId,
      data,
      currentState: updateType === 'percentages' ? customPercentages : updateType === 'amounts' ? customAmounts : itemAssignments
    })

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
      log.debug(`[SplitBillPayment] ✅ Confirming optimistic update (delayed clear):`, {
        updateId,
        optimisticState
      })
      // Delay clearing optimistic state to protect against WebSocket echo
      // This prevents race condition where WebSocket event arrives after API response
      setTimeout(() => {
        log.debug(`[SplitBillPayment] 🧹 Clearing optimistic state after delay:`, updateId)
        setOptimisticState(prev => {
          // Only clear if the updateId still matches (no new updates)
          if (prev.updateId === updateId) {
            return {}
          }
          log.debug(`[SplitBillPayment] ⚠️ Not clearing - new update exists:`, prev.updateId)
          return prev
        })
        setRollbackState(null)
      }, 1500) // 1.5 seconds should be enough for WebSocket echo to arrive
    }
  }

  const rejectOptimisticUpdate = (updateId: string, error?: string) => {
    if (optimisticState.updateId === updateId) {
      rollbackToSnapshot()
      if (error) {
        log.error('[SplitBillPayment] Optimistic update rejected:', error)
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
    // Enhanced merge strategy: properly handle undefined remote data and preserve current state
    const currentPercentages = customPercentages
    const currentAmounts = customAmounts

    // Start with current local state, then apply remote changes for other users
    const mergedPercentages = { ...currentPercentages }
    const mergedAmounts = { ...currentAmounts }

    // Apply remote percentages for other users only
    if (remoteSplitCalculation.percentages) {
      Object.entries(remoteSplitCalculation.percentages).forEach(([userId, percentage]: [string, any]) => {
        if (userId !== currentUser.guestSessionId) {
          mergedPercentages[userId] = percentage.toString()
        }
      })
    }

    // Apply remote amounts for other users only
    if (remoteSplitCalculation.amounts) {
      Object.entries(remoteSplitCalculation.amounts).forEach(([userId, amount]: [string, any]) => {
        if (userId !== currentUser.guestSessionId) {
          mergedAmounts[userId] = amount.toString()
        }
      })
    }

    // Only override current user's values if they have active optimistic state
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
    log.debug('[SplitBillPayment] getSplitAmounts called, backendSplitAmounts:', backendSplitAmounts)

    // If backend amounts are empty or invalid, calculate fallback amounts
    if (!backendSplitAmounts || Object.keys(backendSplitAmounts).length === 0) {
      log.debug('[SplitBillPayment] Backend split amounts empty, calculating fallback')

      // Fallback calculation based on split type
      const fallbackAmounts: { [guestSessionId: string]: number } = {}
      const remainingBalance = bill.summary.remainingBalance || 0

      if (splitOption.type === SplitBillType.EQUAL) {
        const amountPerUser = remainingBalance / uniqueUsers.length
        uniqueUsers.forEach(user => {
          fallbackAmounts[user.guestSessionId] = Math.round(amountPerUser * 100) / 100
        })
      } else if (splitOption.type === SplitBillType.BY_PERCENTAGE) {
        uniqueUsers.forEach(user => {
          const percentage = parseFloat(customPercentages[user.guestSessionId] || '0')
          fallbackAmounts[user.guestSessionId] = Math.round((remainingBalance * percentage / 100) * 100) / 100
        })
      } else if (splitOption.type === SplitBillType.BY_AMOUNT) {
        uniqueUsers.forEach(user => {
          fallbackAmounts[user.guestSessionId] = parseFloat(customAmounts[user.guestSessionId] || '0')
        })
      }

      log.debug('[SplitBillPayment] Fallback amounts calculated:', fallbackAmounts)
      return fallbackAmounts
    }

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
        log.error('Failed to update tip:', error)
        toast.error('Failed to update tip. Please try again.')
        setSelectedTip(0) // Reset tip selection on error
      } finally {
        setUpdatingTip(false)
      }
    }
  }

  // SECURE: Create split calculation using backend API
  const createSplitCalculation = useCallback(async (): Promise<void> => {
    if (!actualSessionId) return

    // FIXED: Prevent duplicate simultaneous requests
    const requestKey = `create_${actualSessionId}_${splitOption.type}`
    if (inFlightRequestsRef.current.has(requestKey)) {
      log.debug('[SplitBillPayment] ⏭️ Skipping duplicate createSplitCalculation request')
      return
    }

    // FIXED: Prevent infinite loops from useEffect
    if (isCreatingSplitRef.current) {
      log.debug('[SplitBillPayment] ⏭️ Already creating split calculation, skipping')
      return
    }

    // FIXED: Track if rate limited to manage cleanup properly
    let isRateLimited = false

    try {
      isCreatingSplitRef.current = true
      inFlightRequestsRef.current.add(requestKey)
      setSplitCalculationLoading(true)
      setSplitCalculationError(null)

      log.debug('[SplitBillPayment] 📤 Creating split calculation:', {
        splitType: splitOption.type,
        participants: splitOption.participants.length
      })

      // CRITICAL FIX: Convert string amounts and percentages to numbers before sending to backend
      let numericAmounts: { [key: string]: number } | undefined
      if (splitOption.type === SplitBillType.BY_AMOUNT && customAmounts) {
        numericAmounts = {}
        Object.entries(customAmounts).forEach(([userId, amount]) => {
          // Convert string to number, default to 0 if invalid
          numericAmounts![userId] = parseFloat(amount) || 0
        })
      }

      let numericPercentages: { [key: string]: number } | undefined
      if (splitOption.type === SplitBillType.BY_PERCENTAGE && customPercentages) {
        numericPercentages = {}
        Object.entries(customPercentages).forEach(([userId, percentage]) => {
          // Convert string to number, default to 0 if invalid
          numericPercentages![userId] = parseFloat(percentage) || 0
        })
      }

      const response = await api.tableSession.createSplitCalculation(
        actualSessionId,
        {
          splitType: splitOption.type,
          participants: splitOption.participants,
          percentages: numericPercentages,
          amounts: numericAmounts,
          itemAssignments: splitOption.type === SplitBillType.BY_ITEMS ? itemAssignments : undefined
        },
        { guestSessionId: currentUser.guestSessionId }
      )

      if (response.success && response.data) {
        setBackendSplitAmounts(response.data.splitAmounts)
        log.debug('[SplitBillPayment] ✅ Split calculation created successfully:', response.data)

        // Update metadata with the new split calculation (using timestamp for deduplication)
        const timestamp = response.data.timestamp ? new Date(response.data.timestamp).getTime() : Date.now()
        setLastUpdateMetadata({
          updateId: `create_${timestamp}`,
          timestamp,
          updatedBy: currentUser.guestSessionId
        })
      } else {
        throw new Error(response.error?.message || 'Failed to create split calculation')
      }
    } catch (error: any) {
      log.error('[SplitBillPayment] ❌ Error creating split calculation:', error)

      // FIXED: Detect rate limiting
      isRateLimited = error?.message?.includes('Rate limit') ||
                      error?.message?.includes('Too Many Requests') ||
                      error?.message?.includes('429') ||
                      error?.status === 429

      if (isRateLimited) {
        log.error('[SplitBillPayment] 🚫 Rate limited - stopping requests')
        setSplitCalculationError('Too many requests. Please wait a moment.')
        toast.error('Too many requests. Please wait a moment and try again.')
        // Clear in-flight tracking after rate limit to allow retry later
        setTimeout(() => {
          inFlightRequestsRef.current.delete(requestKey)
        }, 5000) // Wait 5 seconds before allowing retry
      } else {
        setSplitCalculationError(error.message)
        toast.error('Failed to calculate split amounts. Please try again.')
      }
    } finally {
      setSplitCalculationLoading(false)
      isCreatingSplitRef.current = false
      // FIXED: Only clear in-flight if not rate limited (rate limit handles its own cleanup)
      if (!isRateLimited) {
        inFlightRequestsRef.current.delete(requestKey)
      }
    }
  }, [actualSessionId, splitOption, customPercentages, customAmounts, itemAssignments, currentUser.guestSessionId, api])

  // Debounced update function to batch API calls for better performance
  const debouncedUpdateSplitCalculation = useCallback((
    userId: string,
    percentage?: number,
    amount?: number,
    itemAssignments?: { [itemId: string]: string },
    debounceMs: number = 500
  ) => {
    const updateKey = `${userId}_${percentage !== undefined ? 'percentage' : amount !== undefined ? 'amount' : 'items'}`

    // Show debouncing indicator
    setDebouncingUpdates(prev => ({ ...prev, [updateKey]: true }))

    // Clear existing timeout for this update key
    if (debounceTimeoutRef.current[updateKey]) {
      clearTimeout(debounceTimeoutRef.current[updateKey])
    }

    // Store the pending update
    pendingUpdatesRef.current[updateKey] = { userId, percentage, amount, itemAssignments }

    // Set new timeout
    debounceTimeoutRef.current[updateKey] = setTimeout(async () => {
      const pendingUpdate = pendingUpdatesRef.current[updateKey]
      if (pendingUpdate) {
        try {
          log.debug(`[SplitBillPayment] Executing debounced update for ${updateKey}:`, pendingUpdate)
          await updateSplitCalculation(
            pendingUpdate.userId,
            pendingUpdate.percentage,
            pendingUpdate.amount,
            pendingUpdate.itemAssignments
          )
        } catch (error) {
          log.error(`[SplitBillPayment] Debounced update failed for ${updateKey}:`, error)
        } finally {
          // Clear debouncing state
          setDebouncingUpdates(prev => {
            const updated = { ...prev }
            delete updated[updateKey]
            return updated
          })
          delete pendingUpdatesRef.current[updateKey]
          delete debounceTimeoutRef.current[updateKey]
        }
      }
    }, debounceMs)
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimeoutRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // SECURE: Update split calculation using backend API with optimistic updates
  const updateSplitCalculation = async (userId: string, percentage?: number, amount?: number, itemAssignments?: { [itemId: string]: string }): Promise<void> => {
    if (!actualSessionId) return

    // FIXED: Prevent duplicate simultaneous update requests
    const requestKey = `update_${actualSessionId}_${userId}_${percentage !== undefined ? 'pct' : amount !== undefined ? 'amt' : 'items'}`
    if (inFlightRequestsRef.current.has(requestKey)) {
      log.debug('[SplitBillPayment] ⏭️ Skipping duplicate updateSplitCalculation request')
      return
    }

    const updateId = `update_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // FIXED: Track if rate limited to manage cleanup properly
    let isRateLimited = false

    try {
      inFlightRequestsRef.current.add(requestKey)
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
        log.debug('[SplitBillPayment] Split calculation updated successfully:', response.data)

        // Confirm the optimistic update was successful
        confirmOptimisticUpdate(updateId)

        // Update local state to reflect backend changes (in case backend auto-adjusted)
        // IMPORTANT: Only update the specific user's value, not all users
        if (response.data.percentages && response.data.percentages[userId] !== undefined) {
          log.debug(`[SplitBillPayment] 📊 API Response updating percentage for user ${userId}:`, {
            oldValue: customPercentages[userId],
            newValue: response.data.percentages[userId],
            allPercentages: response.data.percentages
          })
          setCustomPercentages(prev => ({
            ...prev,
            [userId]: response.data.percentages![userId].toString()
          }))
        }
        if (response.data.amounts && response.data.amounts[userId] !== undefined) {
          log.debug(`[SplitBillPayment] 💰 API Response updating amount for user ${userId}:`, {
            oldValue: customAmounts[userId],
            newValue: response.data.amounts[userId]
          })
          setCustomAmounts(prev => ({
            ...prev,
            [userId]: response.data.amounts![userId].toString()
          }))
        }
      } else {
        throw new Error(response.error?.message || 'Failed to update split calculation')
      }
    } catch (error: any) {
      log.error('[SplitBillPayment] Error updating split calculation:', error)

      // FIXED: Detect rate limiting
      isRateLimited = error?.message?.includes('Rate limit') ||
                      error?.message?.includes('Too Many Requests') ||
                      error?.message?.includes('429') ||
                      error?.status === 429

      if (isRateLimited) {
        log.error('[SplitBillPayment] 🚫 Rate limited on update')
        setSplitCalculationError('Too many requests. Please wait a moment.')
        toast.error('Too many requests. Please slow down.')
        // Clear in-flight tracking after rate limit to allow retry later
        setTimeout(() => {
          inFlightRequestsRef.current.delete(requestKey)
        }, 5000) // Wait 5 seconds before allowing retry
      } else {
        setSplitCalculationError(error.message)
        toast.error('Failed to update split amounts. Please try again.')
      }

      // Reject the optimistic update and rollback
      rejectOptimisticUpdate(updateId, error.message)
    } finally {
      setSplitCalculationLoading(false)
      // FIXED: Only clear in-flight if not rate limited (rate limit handles its own cleanup)
      if (!isRateLimited) {
        inFlightRequestsRef.current.delete(requestKey)
      }
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
  const handleSplitOptionChange = (type: SplitPaymentOption['type']) => {
    setSplitOption({
      type,
      participants: type === SplitBillType.EQUAL ? uniqueUsers.map(u => u.guestSessionId) : splitOption.participants,
      amounts: type === SplitBillType.BY_AMOUNT ? customAmounts : undefined,
      percentages: type === SplitBillType.BY_PERCENTAGE ? customPercentages : undefined,
      itemAssignments: type === SplitBillType.BY_ITEMS ? itemAssignments : undefined
    })

    // Track this local change to prevent WebSocket double-updates
    const changeTimestamp = Date.now()
    setRecentLocalSplitChange({
      type,
      updateId: `local_${changeTimestamp}`,
      timestamp: changeTimestamp
    })

    // The useEffect will handle the API call when splitOption.type changes
    // This prevents duplicate API calls and ensures the correct state is used

    // Clear the tracking after WebSocket event should have arrived
    setTimeout(() => {
      setRecentLocalSplitChange(null)
    }, 1000) // 1 second should be enough for the WebSocket round-trip
  }

  // FIXED: Initialize backend split calculation on mount and when split option changes
  useEffect(() => {
    if (!actualSessionId || splitOption.participants.length === 0) {
      return
    }

    // Debounce API calls to prevent rapid changes from overloading the server
    const timeoutId = setTimeout(() => {
      createSplitCalculation()
    }, 500) // 500ms debounce for better responsiveness

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // CRITICAL FIX: Mark input as active on EVERY change, not just on focus
    markInputActive(userId, 'amount')

    // Always update the customAmounts state for UI consistency
    setCustomAmounts(prev => ({
      ...prev,
      [userId]: value
    }))

    if (splitOption.type === SplitBillType.BY_AMOUNT) {
      const numericValue = parseFloat(value) || 0
      const remainingBalance = bill.summary.remainingBalance

      // Frontend validation: Check if total amount would exceed remaining balance
      const otherAmounts = Object.entries(splitOption.amounts || {})
        .filter(([id]) => id !== userId)
        .reduce((sum, [_, amt]) => sum + (typeof amt === 'number' ? amt : parseFloat(String(amt)) || 0), 0)

      const totalAmount = otherAmounts + numericValue

      if (totalAmount > remainingBalance + 0.01) {
        // Show error message to user
        const maxAllowed = Math.max(0, remainingBalance - otherAmounts)
        setSplitCalculationError(`Cannot set $${numericValue.toFixed(2)}. Maximum allowed is $${maxAllowed.toFixed(2)} (Total cannot exceed bill amount of $${remainingBalance.toFixed(2)})`)

        // Still update local state for UI but don't send to backend
        setSplitOption(prev => ({
          ...prev,
          amounts: {
            ...prev.amounts,
            [userId]: numericValue
          }
        }))
        return // Don't send to backend
      }

      // Clear any previous error if validation passes
      setSplitCalculationError(null)

      const updateId = `amount_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`

      // Apply optimistic update immediately
      applyOptimisticUpdate('amounts', { [userId]: value }, updateId)

      setSplitOption(prev => ({
        ...prev,
        amounts: {
          ...prev.amounts,
          [userId]: numericValue
        }
      }))

      // Call backend API to recalculate split amounts securely (debounced)
      debouncedUpdateSplitCalculation(userId, undefined, numericValue)
    }
  }

  // SECURE: Handle custom percentage change with backend API and optimistic updates
  const handlePercentageChange = async (userId: string, value: string) => {
    log.debug('[SplitBillPayment] Percentage change:', userId, value, 'Current split type:', splitOption.type)

    // CRITICAL FIX: Mark input as active on EVERY change, not just on focus
    // This maintains input protection throughout typing, preventing WebSocket overwrites
    markInputActive(userId, 'percentage')

    // Always update the customPercentages state for UI consistency
    setCustomPercentages(prev => ({
      ...prev,
      [userId]: value
    }))

    if (splitOption.type === SplitBillType.BY_PERCENTAGE) {
      const numericValue = parseFloat(value) || 0

      // Frontend validation: Check if total percentage would exceed 100%
      const otherPercentages = Object.entries(splitOption.percentages || {})
        .filter(([id]) => id !== userId)
        .reduce((sum, [_, pct]) => sum + (typeof pct === 'number' ? pct : parseFloat(String(pct)) || 0), 0)

      const totalPercentage = otherPercentages + numericValue

      if (totalPercentage > 100.01) {
        // Show error message to user
        const maxAllowed = Math.max(0, 100 - otherPercentages)
        setSplitCalculationError(`Cannot set ${numericValue}%. Maximum allowed is ${maxAllowed.toFixed(1)}% (Total cannot exceed 100%)`)

        // Still update local state for UI but don't send to backend
        setSplitOption(prev => ({
          ...prev,
          percentages: {
            ...prev.percentages,
            [userId]: numericValue
          }
        }))
        return // Don't send to backend
      }

      // Clear any previous error if validation passes
      setSplitCalculationError(null)

      const updateId = `percentage_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`

      // Apply optimistic update immediately
      applyOptimisticUpdate('percentages', { [userId]: value }, updateId)

      setSplitOption(prev => ({
        ...prev,
        percentages: {
          ...prev.percentages,
          [userId]: numericValue
        }
      }))

      // Call backend API to recalculate split amounts securely (debounced)
      debouncedUpdateSplitCalculation(userId, numericValue)
    }
  }

  // Handle item assignment - FIXED to sync with backend
  const handleItemAssignment = (itemId: string, userId: string) => {
    const newAssignments = { ...itemAssignments, [itemId]: userId }
    setItemAssignments(newAssignments)

    if (splitOption.type === SplitBillType.BY_ITEMS) {
      setSplitOption(prev => ({
        ...prev,
        itemAssignments: {
          ...prev.itemAssignments,
          [itemId]: userId
        }
      }))

      // CRITICAL FIX: Call backend to sync item assignments with other users
      log.debug('[SplitBillPayment] 📤 Syncing item assignment to backend:', { itemId, userId })
      debouncedUpdateSplitCalculation(
        currentUser.guestSessionId,
        undefined,
        undefined,
        newAssignments,
        300 // Shorter debounce for better UX
      )
    }
  }

  // Handle session expiry during split payment
  const handleSessionExpiry = async (): Promise<boolean> => {
    try {
      // Attempt to recover session (simplified - in real implementation, use SessionManager recovery)
      log.debug('[SplitBillPayment] Attempting session recovery...')
      toast.info('Session expired. Attempting to recover...', { duration: 3000 })

      // In a real implementation, this would call SessionManager recovery
      // For now, return false to indicate recovery failed
      return false
    } catch (error) {
      log.error('[SplitBillPayment] Session recovery failed:', error)
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
      log.error('[SplitBillPayment] Failed to acquire payment lock:', error)
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
      log.error('[SplitBillPayment] Failed to release payment lock:', error)
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
      log.error('[SplitBillPayment] Retry failed:', retryError)
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
      log.error('[SplitBillPayment] Payment processing failed:', error)

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

  // Handle payment confirmation and lock split calculation
  const handlePaymentConfirmation = async () => {
    // Check if split is already locked
    const isLocked = await checkSplitLockStatus()
    if (isLocked && splitLockStatus.lockedBy !== currentUser.guestSessionId) {
      const lockedByUser = users.find(u => u.guestSessionId === splitLockStatus.lockedBy)
      const lockedByName = lockedByUser?.userName || 'Another user'
      toast.error(`Payment is already being processed by ${lockedByName}`, {
        description: 'Please wait for them to complete their payment',
        duration: 5000
      })
      return
    }

    // If current user already owns the lock, skip confirmation and proceed directly
    if (isLocked && splitLockStatus.lockedBy === currentUser.guestSessionId) {
      log.debug('[SplitBillPayment] User already owns the lock, proceeding directly to payment')
      await confirmPaymentAndLock()
      return
    }

    // Show confirmation dialog for first-time lock
    setShowPaymentConfirmDialog(true)
  }

  const confirmPaymentAndLock = async () => {
    setShowPaymentConfirmDialog(false)

    try {
      setLockingPayment(true)

      // First, ensure split calculation is up to date and verify amounts
      log.debug('[SplitBillPayment] Creating/updating split calculation before payment...')
      await createSplitCalculation()

      // Wait a moment for the calculation to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify we have valid split amounts
      const splitAmounts = getSplitAmounts()
      const userAmount = splitAmounts[currentUser.guestSessionId] || 0
      log.debug('[SplitBillPayment] Split amounts after creation:', splitAmounts)
      log.debug('[SplitBillPayment] User amount:', userAmount)

      if (userAmount <= 0) {
        toast.error('Unable to calculate your payment amount. Please check the split settings and try again.')
        return
      }

      log.debug('[SplitBillPayment] Attempting to lock split calculation...')
      // Lock the split calculation to prevent configuration changes (but allow concurrent payments)
      const lockSuccess = await lockSplitCalculation('pending_payment_intent')
      if (!lockSuccess) {
        // If we can't get the lock, it means someone else is already processing
        // But this is OK - multiple users can pay simultaneously
        log.info('[SplitBillPayment] Split already locked by another user - proceeding with concurrent payment')

        // Optional: Show info that another user is also paying
        const currentLockStatus = await checkSplitLockStatus()
        if (splitLockStatus.isLocked && splitLockStatus.lockedBy !== currentUser.guestSessionId) {
          const lockedByUser = users.find(u => u.guestSessionId === splitLockStatus.lockedBy)
          toast.info(`${lockedByUser?.userName || 'Another user'} is also processing payment. Both payments will be handled.`, {
            duration: 3000
          })
        }
        // Continue with payment even without the lock
      }

      log.debug('[SplitBillPayment] Split locked successfully, proceeding with payment intent...')
      // Now proceed with payment intent creation
      await createPaymentIntent()
    } catch (error) {
      log.error('[SplitBillPayment] Error in payment confirmation flow:', error)
      // Unlock if there was an error
      await unlockSplitCalculation('pending_payment_intent')
      toast.error('Failed to prepare payment. Please try again.')
    } finally {
      setLockingPayment(false)
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
      log.error('Payment intent creation error:', error)
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
      log.error('Internal payment ID not found')
      toast.error('Payment completed but unable to show details')
      return
    }

    // IMPORTANT: Do NOT unlock the split calculation after successful payment
    // The lock should remain to prevent other users from modifying the split
    // It will be automatically unlocked when the bill is fully paid or session ends
    log.info('[SplitBillPayment] Payment successful - keeping split calculation locked')

    // Call the parent success handler
    onPaymentComplete?.(paymentId)
  }

  // Stripe payment error handler (same as PaymentView)
  const handlePaymentError = async (error: string) => {
    toast.error('Payment failed', {
      description: error
    })
    // Reset payment intent to allow retry
    setClientSecret(null)
    setPaymentId(null)

    // Unlock the split calculation on payment failure to allow retry
    log.info('[SplitBillPayment] Payment failed - unlocking split calculation')
    await unlockSplitCalculation('failed_payment')
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
        log.debug('[SplitBillPayment] Payment processing failed')
      }
    } catch (error: any) {
      log.error('[SplitBillPayment] Unexpected error during payment:', error)
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
        log.debug('[SplitBillPayment] Bill refreshed:', billResponse.data)

        // Check if remaining balance changed significantly
        const currentRemaining = billResponse.data.summary.remainingBalance
        if (Math.abs(currentRemaining - bill.summary.remainingBalance) > 0.01) {
          toast.info('Bill updated - another payment may have been completed', {
            duration: 4000
          })
        }
      }
    } catch (error) {
      log.warn('[SplitBillPayment] Failed to refresh bill data:', error)
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

  // Validation states for better UI feedback
  const isPercentageValid = splitOption.type !== SplitBillType.BY_PERCENTAGE ||
    (() => {
      // For percentage split, after partial payments we need flexible validation
      // Just ensure the current user has a valid percentage
      const userPercentage = parseFloat(customPercentages[currentUser.guestSessionId] || '0')
      return userPercentage > 0 && userPercentage <= 100
    })()

  const isAmountValid = splitOption.type !== SplitBillType.BY_AMOUNT ||
    (() => {
      // For split by amount, we need to be more flexible with validation
      // After partial payments, the total split amounts might not match remaining balance
      // Just ensure the current user's amount is valid
      const userAmount = parseFloat(customAmounts[currentUser.guestSessionId] || '0')
      return userAmount > 0 && userAmount <= bill.summary.remainingBalance + 0.01
    })()

  // Check if the split configuration is locked by another user (for UI feedback only)
  const isAnotherUserProcessing = splitLockStatus.isLocked && splitLockStatus.lockedBy !== currentUser.guestSessionId

  // Allow payment even if someone else is processing - multiple users can pay simultaneously
  const canProceedToPayment = userAmount > 0 &&
                              userAmount <= bill.summary.remainingBalance &&
                              isPercentageValid &&
                              isAmountValid

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

      {/* Loading initial split calculation */}
      {loadingInitialSplit && (
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-surface border rounded-lg p-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-content-secondary">Loading split calculation...</span>
            </div>
          </div>
        </div>
      )}

      {/* Main content - only show after initial loading is complete */}
      {!loadingInitialSplit && (
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
                  <ReceiptText className="w-5 h-5" />
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
                  <div className="flex justify-between text-status-success">
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

            {/* Sync Status Panel - Always rendered to prevent layout shift */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-surface rounded-xl border p-4 min-h-[68px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {Object.keys(debouncingUpdates).length > 0 ? (
                      <>
                        <div className="w-2 h-2 bg-status-warning rounded-full animate-pulse"></div>
                        <span className="text-sm text-content-secondary">
                          Saving changes...
                        </span>
                      </>
                    ) : syncingWithOtherUsers ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-accent"></div>
                        <span className="text-sm text-accent font-medium">
                          Another user is updating...
                        </span>
                      </>
                    ) : initialSplitLoaded ? (
                      <>
                        <div className="w-2 h-2 bg-status-success rounded-full"></div>
                        <span className="text-sm text-status-success">
                          Synced with other users
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-content-tertiary rounded-full"></div>
                        <span className="text-sm text-content-secondary">
                          Ready to split
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-content-tertiary">
                  {uniqueUsers.length} people
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-content-primary flex items-center space-x-2">
                  <Split className="w-5 h-5" />
                  <span>Split Method</span>
                </h3>
                {splitLockStatus.isLocked && (
                  <div className="flex items-center space-x-2 text-sm text-status-warning">
                    <AlertCircle className="w-4 h-4" />
                    <span>Locked</span>
                  </div>
                )}
              </div>

              {/* Editing Status Banner */}
              {editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      {editingStatus.editingUser || 'Another user'} is changing the split method...
                    </span>
                  </div>
                </div>
              )}

              {/* Split Lock Warning Banner */}
              {splitLockStatus.isLocked && (
                <div className="mb-4 p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-content-primary">
                        Split calculation is locked
                      </p>
                      <p className="text-xs text-content-secondary mt-1">
                        {splitLockStatus.lockedBy === currentUser.guestSessionId
                          ? 'You are currently processing payment'
                          : (() => {
                              const lockedByUser = users.find(u => u.guestSessionId === splitLockStatus.lockedBy)
                              const lockedByName = lockedByUser?.userName || 'Another user'
                              return `${lockedByName} is processing payment`
                            })()
                        }
                        {splitLockStatus.lockReason && ` (${splitLockStatus.lockReason})`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Error Message Display */}
              {splitCalculationError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 bg-status-error-light border border-status-error rounded-lg p-3"
                >
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-status-error font-medium">Validation Error</p>
                      <p className="text-sm text-status-error mt-1">{splitCalculationError}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant={splitOption.type === SplitBillType.EQUAL ? 'default' : 'outline'}
                  onClick={() => handleSplitOptionChange(SplitBillType.EQUAL)}
                  disabled={splitLockStatus.isLocked || (editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId)}
                  className={`h-16 flex-col ${(splitLockStatus.isLocked || editingStatus.isBeingEdited) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title={
                    splitLockStatus.isLocked
                      ? 'Split calculation is locked during payment'
                      : editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId
                      ? 'Another user is changing the split method'
                      : ''
                  }
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
                  disabled={totalUniqueItems <= 1 || splitLockStatus.isLocked || (editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId)}
                  className={`h-16 flex-col ${(splitLockStatus.isLocked || editingStatus.isBeingEdited) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title={
                    splitLockStatus.isLocked
                      ? 'Split calculation is locked during payment'
                      : editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId
                      ? 'Another user is changing the split method'
                      : totalUniqueItems <= 1
                      ? "Split by items requires multiple items in the order"
                      : ""
                  }
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
                  disabled={splitLockStatus.isLocked || (editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId)}
                  className={`h-16 flex-col ${(splitLockStatus.isLocked || editingStatus.isBeingEdited) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title={
                    splitLockStatus.isLocked
                      ? 'Split calculation is locked during payment'
                      : editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId
                      ? 'Another user is changing the split method'
                      : ''
                  }
                >
                  <Percent className="w-5 h-5" />
                  <span className="text-sm font-semibold">By Percentage</span>
                  <span className="text-xs opacity-75">Custom percentages</span>
                </Button>

                <Button
                  variant={splitOption.type === SplitBillType.BY_AMOUNT ? 'default' : 'outline'}
                  onClick={() => handleSplitOptionChange(SplitBillType.BY_AMOUNT)}
                  disabled={splitLockStatus.isLocked || (editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId)}
                  className={`h-16 flex-col ${(splitLockStatus.isLocked || editingStatus.isBeingEdited) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title={
                    splitLockStatus.isLocked
                      ? 'Split calculation is locked during payment'
                      : editingStatus.isBeingEdited && editingStatus.editingBy !== currentUser.guestSessionId
                      ? 'Another user is changing the split method'
                      : ''
                  }
                >
                  <Banknote className="w-5 h-5" />
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
                            <div key={`${order.orderId}-item-${idx}-${item.id || item.name || idx}`} className="flex justify-between items-center text-sm p-3 bg-surface-secondary rounded">
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
                    <div key={user.guestSessionId || `user-perc-${userIdx}`} className={`p-4 border rounded-lg ${user.guestSessionId === currentUser.guestSessionId ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-content-primary">{user.userName}</span>
                          {user.guestSessionId === currentUser.guestSessionId && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">You</span>
                          )}
                        </div>
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
                            onFocus={() => markInputActive(user.guestSessionId, 'percentage')}
                            className={`w-full p-3 pr-8 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                              debouncingUpdates[`${user.guestSessionId}_percentage`]
                                ? 'ring-1 ring-status-warning bg-status-warning-light animate-pulse'
                                : optimisticState.pendingUpdate && optimisticState.percentages?.[user.guestSessionId]
                                ? 'ring-1 ring-status-warning bg-status-warning-light'
                                : ''
                            }`}
                            placeholder="0.0"
                            disabled={user.guestSessionId !== currentUser.guestSessionId || splitCalculationLoading || splitLockStatus.isLocked}
                            title={
                              user.guestSessionId !== currentUser.guestSessionId
                                ? 'You can only edit your own percentage'
                                : splitLockStatus.isLocked
                                ? 'Input disabled - split calculation is locked'
                                : ''
                            }
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-content-secondary font-medium">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Removed redundant percentage validation - will be shown in summary */}
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
                  <Banknote className="w-5 h-5" />
                  <span>Set Amounts</span>
                </h3>
                <div className="space-y-4">
                  {uniqueUsers.map((user, userIdx) => (
                    <div key={user.guestSessionId || `user-amt-${userIdx}`} className={`p-4 border rounded-lg ${user.guestSessionId === currentUser.guestSessionId ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-content-primary">{user.userName}</span>
                          {user.guestSessionId === currentUser.guestSessionId && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">You</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Banknote className="w-4 h-4 text-content-tertiary" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={customAmounts[user.guestSessionId] || ''}
                          onChange={(e) => handleAmountChange(user.guestSessionId, e.target.value)}
                          onFocus={() => markInputActive(user.guestSessionId, 'amount')}
                          className={`flex-1 p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                            debouncingUpdates[`${user.guestSessionId}_amount`]
                              ? 'ring-1 ring-status-warning bg-status-warning-light animate-pulse'
                              : optimisticState.pendingUpdate && optimisticState.amounts?.[user.guestSessionId]
                              ? 'ring-1 ring-status-warning bg-status-warning-light'
                              : ''
                          }`}
                          placeholder="0.00"
                          disabled={user.guestSessionId !== currentUser.guestSessionId || splitCalculationLoading || splitLockStatus.isLocked}
                          title={
                            user.guestSessionId !== currentUser.guestSessionId
                              ? 'You can only edit your own amount'
                              : splitLockStatus.isLocked
                              ? 'Input disabled - split calculation is locked'
                              : ''
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Removed redundant amount validation - will be shown in summary */}
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
                          : 'bg-surface-secondary'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`font-medium ${
                          isCurrentUser ? 'text-primary' : 'text-content-primary'
                        }`}>
                          {user.userName}
                        </span>
                        {/* Show status indicators */}
                        {debouncingUpdates[`${user.guestSessionId}_percentage`] && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-status-warning-light text-status-warning text-xs rounded-full">
                            <div className="w-2 h-2 bg-status-warning rounded-full animate-pulse"></div>
                            <span>Editing %</span>
                          </span>
                        )}
                        {debouncingUpdates[`${user.guestSessionId}_amount`] && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-status-warning-light text-status-warning text-xs rounded-full">
                            <div className="w-2 h-2 bg-status-warning rounded-full animate-pulse"></div>
                            <span>Editing $</span>
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="inline-flex items-center px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
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
                <div className="flex justify-between font-semibold text-content-primary">
                  <span>Total Split</span>
                  <span>${totalSplitAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-content-secondary">
                  <span>Remaining Balance</span>
                  <span>${bill.summary.remainingBalance.toFixed(2)}</span>
                </div>

                {/* Consolidated Split Status */}
                {(() => {
                  const difference = Math.abs(totalSplitAmount - bill.summary.remainingBalance)
                  const isComplete = difference <= 0.01

                  if (splitOption.type === SplitBillType.BY_PERCENTAGE) {
                    const totalPercentage = Object.values(customPercentages).reduce((sum, pct) => sum + (parseFloat(pct) || 0), 0)
                    if (totalPercentage > 100.01) {
                      return (
                        <div className="mt-2 p-2 bg-status-error/10 border border-status-error/20 rounded-lg">
                          <div className="flex items-center space-x-2 text-status-error text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Exceeds 100% by {(totalPercentage - 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    }
                  } else if (splitOption.type === SplitBillType.BY_AMOUNT) {
                    if (totalSplitAmount > bill.summary.remainingBalance + 0.01) {
                      return (
                        <div className="mt-2 p-2 bg-status-error/10 border border-status-error/20 rounded-lg">
                          <div className="flex items-center space-x-2 text-status-error text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Exceeds bill by ${(totalSplitAmount - bill.summary.remainingBalance).toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    }
                  }

                  if (!isComplete) {
                    const unpaidAmount = bill.summary.remainingBalance - totalSplitAmount
                    return (
                      <div className="mt-2 p-2 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                        <div className="flex items-center space-x-2 text-status-warning text-sm">
                          <Info className="w-4 h-4" />
                          <span>${unpaidAmount.toFixed(2)} will remain unpaid</span>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="mt-2 p-2 bg-status-success/10 border border-status-success/20 rounded-lg">
                      <div className="flex items-center space-x-2 text-status-success text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Split complete</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </motion.div>

            {/* Your Payment Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-xl border p-6 bg-surface"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-content-primary">Your Payment</span>
                <div className={`text-2xl font-bold ${
                  userAmount <= 0 ? 'text-status-error' : 'text-primary'
                }`}>
                  ${userAmount.toFixed(2)}
                </div>
              </div>

              {/* Single consolidated status message */}
              {userAmount <= 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {splitOption.type === SplitBillType.BY_PERCENTAGE &&
                      `Set your percentage above to contribute to the bill`}
                    {splitOption.type === SplitBillType.BY_AMOUNT &&
                      `Enter your payment amount above`}
                    {splitOption.type === SplitBillType.BY_ITEMS &&
                      `Select items you'd like to pay for`}
                    {splitOption.type === SplitBillType.EQUAL &&
                      `Calculating equal split...`}
                  </p>
                </div>
              )}

              {userAmount > 0 && (
                <div className="space-y-2 text-sm text-content-secondary">
                  <div className="flex justify-between">
                    <span>Split amount</span>
                    <span>${userAmount.toFixed(2)}</span>
                  </div>
                  {selectedTip > 0 && (
                    <div className="flex justify-between">
                      <span>Tip</span>
                      <span>${selectedTip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-content-primary pt-2 border-t">
                    <span>Total to pay</span>
                    <span>${(userAmount + selectedTip).toFixed(2)}</span>
                  </div>
                </div>
              )}
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
                  <Banknote className="w-4 h-4 text-content-tertiary" />
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

              <div className="mt-4 p-3 bg-surface-secondary rounded-lg">
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
                      processing={isProcessing}
                      setProcessing={setIsProcessing}
                      clientSecret={clientSecret}
                    />
                  </StripeProvider>
                </div>
              )}

              {/* Payment Actions - Warning message for validation errors only */}
              {!canProceedToPayment && !clientSecret && (
                <div className="mb-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm text-amber-800 dark:text-amber-200">
                      {(() => {
                        if (userAmount <= 0) return 'Please set your payment amount above'
                        if (userAmount > bill.summary.remainingBalance) return 'Amount exceeds remaining balance'
                        if (!isPercentageValid) return 'Please complete the percentage split configuration'
                        if (!isAmountValid) return 'Please complete the amount split configuration'
                        return 'Unable to proceed with payment'
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* Info message when another user is processing (non-blocking) */}
              {isAnotherUserProcessing && (
                <div className="mb-3 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                      {(() => {
                        const lockedByUser = users.find(u => u.guestSessionId === splitLockStatus.lockedBy)
                        return `${lockedByUser?.userName || 'Another user'} is also making a payment. You can proceed simultaneously.`
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === PaymentMethod.CREDIT_CARD && !clientSecret && (
                <Button
                  onClick={handlePaymentConfirmation}
                  size="lg"
                  className="w-full"
                  disabled={!canProceedToPayment || isProcessing || lockingPayment}
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Preparing Payment...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ${(userAmount + (selectedTip > 0 ? selectedTip : getCustomTipAmount())).toFixed(2)} with Card</span>
                    </div>
                  )}
                </Button>
              )}

              {selectedPaymentMethod === PaymentMethod.CASH && (
                <Button
                  onClick={processPayment}
                  size="lg"
                  className="w-full"
                  disabled={!canProceedToPayment || isProcessing}
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
                  onClick={handlePaymentConfirmation}
                  size="lg"
                  className="w-full"
                  disabled={!canProceedToPayment || isProcessing || lockingPayment}
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Preparing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4" />
                      <span>Pay ${(userAmount + (selectedTip > 0 ? selectedTip : getCustomTipAmount())).toFixed(2)} with Apple Pay</span>
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
      )}

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

      {/* Payment Confirmation Dialog */}
      <AnimatePresence>
        {showPaymentConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentConfirmDialog(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl border max-w-md w-full p-6 shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-status-warning/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-status-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-content-primary">
                    Confirm Payment
                  </h3>
                  <p className="text-sm text-content-secondary">
                    This will lock the split calculation
                  </p>
                </div>
              </div>

              <div className="mb-6 space-y-4">
                <div className="p-4 bg-status-warning/5 border border-status-warning/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-status-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-content-primary mb-1">
                        Split will be locked during payment
                      </p>
                      <p className="text-xs text-content-secondary">
                        Once you proceed, no one else at your table will be able to change the split calculation until payment is complete.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-content-primary">Others at your table:</h4>
                  <div className="space-y-1">
                    {users.filter(u => u.guestSessionId !== currentUser.guestSessionId).map(user => (
                      <div key={user.guestSessionId} className="flex items-center space-x-2 text-sm text-content-secondary">
                        <Users className="w-3 h-3" />
                        <span>{user.userName}</span>
                      </div>
                    ))}
                    {users.filter(u => u.guestSessionId !== currentUser.guestSessionId).length === 0 && (
                      <p className="text-xs text-content-tertiary italic">No other users in this session</p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium text-content-primary">Your amount: </span>
                    <span className="text-primary font-semibold">
                      ${((getSplitAmounts()[currentUser.guestSessionId] || 0) + (selectedTip > 0 ? selectedTip : getCustomTipAmount())).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentConfirmDialog(false)}
                  className="flex-1"
                  disabled={lockingPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmPaymentAndLock}
                  className="flex-1"
                  disabled={lockingPayment}
                >
                  {lockingPayment ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Securing...</span>
                    </div>
                  ) : (
                    <>Proceed with Payment</>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}