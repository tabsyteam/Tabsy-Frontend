'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  ReceiptText,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Percent,
  Banknote,
  Users,
  Split
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { PaymentMethod, PaymentStatus, TableSessionBill, TableSessionUser, MultiUserTableSession, CreateTableSessionPaymentRequest } from '@tabsy/shared-types'
import { PaymentType } from '@/constants/payment'
import { SessionManager } from '@/lib/session'
import { SplitBillPayment } from './SplitBillPayment'
import { StripeCardForm } from './StripeCardForm'
import { StripeProvider } from '@/components/providers/stripe-provider'
import { PaymentForm } from './PaymentForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useWebSocketEvent } from '@tabsy/ui-components'
import { useRestaurantOptional } from '@/contexts/RestaurantContext'
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface Order {
  id: string
  orderNumber: string
  items: Array<{
    id: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  tax: number
  tip: number
  total: number
  guestInfo: {
    name: string
    phone?: string
    email?: string
  }
  specialInstructions?: string
}

// Transform API order response to local Order interface
const transformApiOrderToLocal = (apiOrder: any): Order => ({
  id: apiOrder.id,
  orderNumber: apiOrder.orderNumber,
  items: apiOrder.items.map((item: any) => ({
    id: item.id,
    name: item.menuItem.name,
    quantity: item.quantity,
    unitPrice: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0),
    totalPrice: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : (item.subtotal || 0)
  })),
  subtotal: typeof apiOrder.subtotal === 'string' ? parseFloat(apiOrder.subtotal) : (apiOrder.subtotal || 0),
  tax: typeof apiOrder.tax === 'string' ? parseFloat(apiOrder.tax) : (apiOrder.tax || 0),
  tip: typeof apiOrder.tip === 'string' ? parseFloat(apiOrder.tip) : (apiOrder.tip || 0),
  total: typeof apiOrder.total === 'string' ? parseFloat(apiOrder.total) : (apiOrder.total || 0),
  guestInfo: {
    name: apiOrder.customerName || `Customer ${apiOrder.id?.slice(-4) || ''}`,  // Use partial order ID instead of "Guest"
    phone: apiOrder.customerPhone,
    email: apiOrder.customerEmail
  },
  specialInstructions: apiOrder.specialInstructions
})

interface TipOption {
  percentage: number
  label: string
  amount: number
}

export function PaymentView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()
  const restaurantContext = useRestaurantOptional()
  const currency = (restaurantContext?.currency as CurrencyCode) || 'USD'

  // Use shared utility for consistent formatting
  const formatPrice = (price: number) => formatPriceUtil(price, currency)

  // Order-based payment state
  const [order, setOrder] = useState<Order | null>(null)

  // Table session payment state
  const [tableSession, setTableSession] = useState<MultiUserTableSession | null>(null)
  const [tableBill, setTableBill] = useState<TableSessionBill | null>(null)
  const [currentUser, setCurrentUser] = useState<TableSessionUser | null>(null)
  const [sessionUsers, setSessionUsers] = useState<TableSessionUser[]>([])

  // Payment state
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.ORDER)
  const [showSplitBill, setShowSplitBill] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedTip, setSelectedTip] = useState<number>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [tipSelectionMade, setTipSelectionMade] = useState<boolean>(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CREDIT_CARD)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentStatusPolling, setPaymentStatusPolling] = useState<NodeJS.Timeout | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [updatingTip, setUpdatingTip] = useState(false)
  const [cashPaymentPending, setCashPaymentPending] = useState(false)
  const [changingPaymentMethod, setChangingPaymentMethod] = useState(false)

  // Payment breakdown state for real-time updates
  const [paymentBreakdown, setPaymentBreakdown] = useState<{
    subtotal: number
    tax: number
    tip: number
    total: number
  } | null>(null)

  // URL parameters
  const orderId = searchParams.get('order')
  const tableSessionId = searchParams.get('tableSessionId')
  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')
  const paymentTypeParam = searchParams.get('type') || PaymentType.ORDER

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (paymentStatusPolling) {
        clearInterval(paymentStatusPolling)
      }
    }
  }, [paymentStatusPolling])

  // Handle WebSocket table session updates (replaces polling)
  const handleTableSessionUpdate = useCallback(async (data: any) => {
    if (data.type === 'payment_completed' || data.type === 'payment_status_update' || data.type === 'payment_cancelled') {
      try {
        // Check if this is our payment that was completed
        const eventPaymentId = data.paymentId || data.payment?.id
        const isOurPayment = eventPaymentId === paymentId

        // Refresh the table bill to show updated amounts
        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (sessionId) {
          const billResponse = await api.tableSession.getBill(sessionId)
          if (billResponse.success && billResponse.data) {
            setTableBill(billResponse.data)

            if (data.type === 'payment_completed') {
              console.log('[PaymentView] Payment completed event:', {
                isOurPayment,
                cashPaymentPending,
                eventPaymentId,
                currentPaymentId: paymentId,
                dataStructure: { hasPaymentId: !!data.paymentId, hasPaymentObj: !!data.payment, paymentObjId: data.payment?.id },
                data
              })

              if (isOurPayment && cashPaymentPending) {
                // Our cash payment was confirmed by staff
                console.log('[PaymentView] Processing our cash payment completion')
                setCashPaymentPending(false)
                toast.success('Cash Payment Confirmed!', {
                  description: 'Your server has confirmed receipt of your cash payment',
                  duration: 4000
                })

                // Get guest session from multiple sources
                const session = SessionManager.getDiningSession()
                const guestSessionId = session?.sessionId || api.getGuestSessionId() || sessionStorage.getItem('tabsy-guest-session-id')

                // Navigate to success page
                const successUrl = paymentType === PaymentType.ORDER
                  ? `/payment/success?payment=${paymentId}&restaurant=${restaurantId}&table=${tableId}&guestSession=${guestSessionId || ''}`
                  : `/payment/success?payment=${paymentId}&tableSession=${tableSession?.id}&restaurant=${restaurantId}&table=${tableId}&guestSession=${guestSessionId || ''}`

                setTimeout(() => {
                  router.push(successUrl)
                }, 1500)

              } else {
                // Another user's payment was completed
                toast.success('Payment completed by another user', {
                  description: 'Bill has been updated with the new payment',
                  duration: 3000
                })
              }
            } else if (data.type === 'payment_cancelled') {
              console.log('[PaymentView] Payment cancelled event:', {
                isOurPayment,
                eventPaymentId,
                currentPaymentId: paymentId,
                data
              })

              if (isOurPayment) {
                // Our payment was cancelled - reset UI state
                setClientSecret(null)
                setPaymentId(null)
                setProcessing(false)
                setCashPaymentPending(false)
                setChangingPaymentMethod(false)

                toast.info('Payment Cancelled', {
                  description: 'Your payment has been cancelled successfully',
                  duration: 3000
                })
              } else {
                // Another user's payment was cancelled
                toast.info('Payment cancelled by another user', {
                  description: 'Bill has been updated',
                  duration: 3000
                })
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error handling payment update:', error)
      }
    }
  }, [api, tableSessionId, paymentId, cashPaymentPending, paymentType, restaurantId, tableId, tableSession?.id, router])

  // Set up WebSocket event listeners for payment updates using common provider
  const session = SessionManager.getDiningSession()

  // Listen for payment status updates
  useWebSocketEvent('payment:status_updated', (data: any) => {
    if (data.tableSessionId === (tableSessionId || session?.tableSessionId)) {
      handleTableSessionUpdate({ type: 'payment_status_update', ...data })
    }
  }, [handleTableSessionUpdate, tableSessionId, session?.tableSessionId], 'PaymentView-status')

  // Listen for payment completions
  useWebSocketEvent('payment:completed', (data: any) => {
    if (data.tableSessionId === (tableSessionId || session?.tableSessionId)) {
      handleTableSessionUpdate({ type: 'payment_completed', ...data })
    }
  }, [handleTableSessionUpdate, tableSessionId, session?.tableSessionId], 'PaymentView-completed')

  // Listen for payment cancellations
  useWebSocketEvent('payment:cancelled', (data: any) => {
    if (data.tableSessionId === (tableSessionId || session?.tableSessionId)) {
      handleTableSessionUpdate({ type: 'payment_cancelled', ...data })
    }
  }, [handleTableSessionUpdate, tableSessionId, session?.tableSessionId], 'PaymentView-cancelled')

  // Listen for table session updates
  useWebSocketEvent('table:session_updated', (data: any) => {
    if (data.tableSessionId === (tableSessionId || session?.tableSessionId)) {
      handleTableSessionUpdate({ type: 'session_updated', ...data })
    }
  }, [handleTableSessionUpdate, tableSessionId, session?.tableSessionId], 'PaymentView-session')

  // Restore tip state when paymentBreakdown is available OR when there's existing tip in table bill
  useEffect(() => {
    // Handle tip from payment breakdown (existing payment intent)
    if (paymentBreakdown && paymentBreakdown.tip > 0 && paymentBreakdown.subtotal > 0) {
      const subtotal = paymentBreakdown.subtotal
      const standardTipOptions = [
        { percentage: 15, amount: subtotal * 0.15 },
        { percentage: 18, amount: subtotal * 0.18 },
        { percentage: 20, amount: subtotal * 0.20 },
        { percentage: 25, amount: subtotal * 0.25 }
      ]

      const matchingOption = standardTipOptions.find(option =>
        Math.abs(option.amount - paymentBreakdown.tip) < 0.01
      )

      if (matchingOption) {
        setSelectedTip(matchingOption.amount)
        setCustomTip('')
        setTipSelectionMade(true)
      } else {
        setSelectedTip(0)
        setCustomTip(paymentBreakdown.tip.toFixed(2))
        setTipSelectionMade(true)
      }

      console.log('[PaymentView] Restored tip state from payment breakdown:', {
        paymentBreakdownTip: paymentBreakdown.tip,
        subtotal: subtotal,
        matchingOption: matchingOption ? `${matchingOption.percentage}% (${matchingOption.amount})` : 'none'
      })
    }
    // Handle existing tip from table bill summary (no payment intent yet)
    else if (paymentType === PaymentType.TABLE_SESSION && tableBill && tableBill.summary.tip > 0 && !paymentBreakdown) {
      const existingTip = tableBill.summary.tip

      // Calculate what the current tip options would be
      const tipOptions = getTipOptions()

      // Check if the existing tip matches any current tip option
      const matchingOption = tipOptions.find(option =>
        Math.abs(option.amount - existingTip) < 0.01
      )

      if (matchingOption) {
        setSelectedTip(matchingOption.amount)
        setCustomTip('')
        setTipSelectionMade(false) // This is restoring existing state, not a new selection
      } else {
        setSelectedTip(0)
        setCustomTip(existingTip.toFixed(2))
        setTipSelectionMade(false) // This is restoring existing state, not a new selection
      }

      console.log('[PaymentView] Restored tip state from table bill summary:', {
        existingTip: existingTip,
        matchingOption: matchingOption ? `${matchingOption.label} (${matchingOption.amount})` : 'none'
      })
    }
  }, [paymentBreakdown, tableBill, paymentType]) // Run when any of these change

  // Calculate tip options based on unpaid orders subtotal only
  const getTipOptions = (): TipOption[] => {
    let subtotal = 0

    // If we have a server-confirmed payment breakdown, use its subtotal for consistent tip calculations
    if (paymentBreakdown) {
      subtotal = paymentBreakdown.subtotal

      console.log('[PaymentView] Using server breakdown for tip calculation:', {
        serverSubtotal: paymentBreakdown.subtotal,
        currentTip: paymentBreakdown.tip,
        total: paymentBreakdown.total
      })
    } else if (paymentType === PaymentType.ORDER && order) {
      subtotal = order.subtotal
    } else if (paymentType === PaymentType.TABLE_SESSION && tableBill) {
      // Check if there's an existing tip in the bill summary
      const existingTip = tableBill.summary.tip || 0
      const remainingBalance = tableBill.summary.remainingBalance || 0

      // The remaining balance includes existing tip, so we need to extract just the unpaid subtotal
      // remainingBalance = unpaidSubtotal + unpaidTax + existingTip (if it's in the outstanding amount)
      const remainingWithoutExistingTip = remainingBalance - existingTip

      // Calculate the subtotal portion of the remaining balance (without existing tip)
      const totalSubtotal = tableBill.summary.subtotal || 0
      const totalTax = tableBill.summary.tax || 0
      const taxRate = totalSubtotal > 0 ? totalTax / totalSubtotal : 0

      // Extract subtotal from remaining balance: remainingBalance / (1 + taxRate)
      const unpaidSubtotal = remainingWithoutExistingTip / (1 + taxRate)

      subtotal = unpaidSubtotal

      console.log('[PaymentView] Tip calculation with existing tip handling:', {
        remainingBalance: remainingBalance,
        existingTip: existingTip,
        remainingWithoutExistingTip: remainingWithoutExistingTip,
        totalSubtotal: totalSubtotal,
        totalTax: totalTax,
        taxRate: taxRate,
        calculatedUnpaidSubtotal: unpaidSubtotal
      })
    }

    if (subtotal === 0 || isNaN(subtotal)) return []

    return [
      { percentage: 15, label: '15%', amount: subtotal * 0.15 },
      { percentage: 18, label: '18%', amount: subtotal * 0.18 },
      { percentage: 20, label: '20%', amount: subtotal * 0.20 },
      { percentage: 25, label: '25%', amount: subtotal * 0.25 }
    ]
  }

  // Restore existing payment state when returning to a payment intent with tip
  const restoreExistingPaymentState = async (sessionId: string, paymentId: string) => {
    try {
      // Get payment status to check if there's an existing tip
      const statusResponse = await api.tableSession.getPaymentStatus(sessionId)

      if (statusResponse.success && statusResponse.data?.payments) {
        const currentPayment = statusResponse.data.payments.find(p => p.id === paymentId)

        if (currentPayment && currentPayment.amount > 0) {
          console.log('[PaymentView] Found existing payment:', {
            paymentId: currentPayment.id,
            amount: currentPayment.amount,
            status: currentPayment.status,
            clientSecret: currentPayment.clientSecret
          })

          // Restore payment breakdown if available
          if (currentPayment.breakdown) {
            setPaymentBreakdown(currentPayment.breakdown)
            console.log('[PaymentView] Restored payment breakdown:', currentPayment.breakdown)
          }

          // If clientSecret is missing, try to get it by re-fetching the payment
          if (!currentPayment.clientSecret && currentPayment.id) {
            console.log('[PaymentView] ClientSecret missing, attempting to refresh payment...')
            // The payment exists but might need to be refreshed
            // This can happen if the payment was created but clientSecret wasn't stored properly
          }
        }
      }
    } catch (error) {
      console.error('[PaymentView] Failed to restore existing payment state:', error)
      // Don't show error to user, just log it
    }
  }

  const getCustomTipAmount = (): number => {
    const amount = parseFloat(customTip)
    return isNaN(amount) ? 0 : amount
  }

  const getFinalTotal = (): number => {
    // If payment is actually completed, show $0.00
    // Only show 0 when payment is truly completed, not just initialized
    if (!cashPaymentPending && paymentId && tableBill?.summary.paidAmount > 0) {
      return 0
    }

    // Use server-calculated breakdown if available (from payment intent updates)
    if (paymentBreakdown) {
      return paymentBreakdown.total
    }

    // For orders, use server-calculated total which already includes tip
    if (paymentType === PaymentType.ORDER && order) {
      return order.total  // Server already calculated: subtotal + tax + tip
    } else if (paymentType === PaymentType.TABLE_SESSION && tableBill) {
      const remainingBalance = tableBill.summary.remainingBalance || 0
      const existingTip = tableBill.summary.tip || 0
      const currentTipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()

      // Calculate base amount without any tips
      const baseAmount = remainingBalance - existingTip

      // If user has made a tip selection (including 0 for "No Tip"), use the new tip amount
      if (tipSelectionMade) {
        return baseAmount + currentTipAmount
      }

      // Default: no tip selections made yet, show existing tip
      if (existingTip > 0) {
        return remainingBalance // Include existing tip
      }

      // No tips at all
      return remainingBalance
    }

    return 0
  }

  const getPaymentAmount = (): number => {
    // If payment is actually completed, show $0.00
    // Only show 0 when payment is truly completed, not just initialized
    if (!cashPaymentPending && paymentId && tableBill?.summary.paidAmount > 0) {
      return 0
    }

    // SECURITY: Always prioritize server-calculated breakdown when available
    if (paymentBreakdown) {
      return paymentBreakdown.total - (paymentBreakdown.tip || 0) // Base amount without tip
    }

    if (paymentType === PaymentType.ORDER && order) {
      return order.total
    } else if (paymentType === PaymentType.TABLE_SESSION && tableBill) {
      const remainingBalance = tableBill.summary.remainingBalance || 0
      const existingTip = tableBill.summary.tip || 0

      // If there's an existing tip, show the amount due WITHOUT the tip
      // The tip will be displayed separately
      if (existingTip > 0) {
        return remainingBalance - existingTip // Base amount without tip
      }

      return remainingBalance // No existing tip, show full remaining balance
    }
    return 0
  }

  // Initialize payment type from URL or session
  useEffect(() => {
    const determinePaymentType = () => {
      if (paymentTypeParam === PaymentType.SPLIT_BILL) {
        setPaymentType(PaymentType.SPLIT_BILL)
        setShowSplitBill(true)
      } else if (SessionManager.getDiningSession()) {
        setPaymentType(PaymentType.TABLE_SESSION)
      } else if (orderId) {
        setPaymentType(PaymentType.ORDER)
      } else {
        setError('No payment data available')
        setLoading(false)
      }
    }

    determinePaymentType()
  }, [orderId, tableSessionId, paymentTypeParam])

  // Load data based on payment type
  useEffect(() => {
    const loadPaymentData = async () => {
      if (!paymentType) return

      try {
        setLoading(true)
        setError(null)

        if (paymentType === PaymentType.ORDER && orderId) {
          // Load individual order
          const response = await api.order.getById(orderId)
          if (response.success && response.data) {
            setOrder(transformApiOrderToLocal(response.data))
          } else {
            throw new Error('Order not found')
          }
        } else if (paymentType === PaymentType.TABLE_SESSION || paymentType === PaymentType.SPLIT_BILL) {
          // Load table session data
          const session = SessionManager.getDiningSession()
          const sessionId = tableSessionId || session?.tableSessionId

          console.log('[PaymentView] Loading table session data:', {
            sessionId,
            session,
            tableSessionIdFromUrl: tableSessionId,
            sessionFromManager: session,
            sessionTableSessionId: session?.tableSessionId
          })

          if (!sessionId) {
            throw new Error('No table session found')
          }

          // Load table session users and bill
          const [usersResponse, billResponse] = await Promise.all([
            api.tableSession.getUsers(sessionId),
            api.tableSession.getBill(sessionId)
          ])

          console.log('[PaymentView] API responses:', { usersResponse, billResponse })

          if (usersResponse.success && usersResponse.data) {
            const sessionData = usersResponse.data
            const rawUsers = sessionData.users || []

            console.log('[PaymentView] Raw API response users:', rawUsers)

            // Map backend guestSession structure to frontend TableSessionUser structure
            const mappedUsers: TableSessionUser[] = rawUsers.map((user: any) => ({
              guestSessionId: user.id,                    // Backend uses 'id', frontend expects 'guestSessionId'
              userName: user.userName || `User ${user.id?.slice(-4) || ''}`,  // Use partial ID instead of "Guest"
              email: '',                                  // Not provided by backend, set to empty
              phoneNumber: '',                            // Not provided by backend, set to empty
              isActive: true,                            // Assume active if returned by API
              lastActivity: user.lastActivity,
              totalSpent: 0,                             // Not calculated here, set to 0
              isHost: user.isHost || false               // Include host information
            }))

            console.log('[PaymentView] Mapped session users:', mappedUsers)
            setSessionUsers(mappedUsers)

            if (mappedUsers.length === 0) {
              console.warn('[PaymentView] No users found in table session')
              toast.warning('No active users found in this table session. Split bill may not work properly.')
            }

            // Find current user using the correct field mapping
            const currentSessionUser = mappedUsers.find(u =>
              u.guestSessionId === session?.sessionId
            )

            console.log('[PaymentView] Current session user lookup:', {
              lookingFor: session?.sessionId,
              found: currentSessionUser,
              allUserIds: mappedUsers.map(u => u.guestSessionId)
            })

            if (currentSessionUser) {
              setCurrentUser(currentSessionUser)
            } else {
              console.warn('[PaymentView] Current user not found in session users')
              console.warn('[PaymentView] SessionId from SessionManager:', session?.sessionId)
              console.warn('[PaymentView] Available user IDs:', mappedUsers.map(u => ({ id: u.guestSessionId, name: u.userName })))

              // Don't create fallback users - this was causing the extra count
              // Instead, just set the first user as current user if available
              if (mappedUsers.length > 0) {
                console.log('[PaymentView] Using first available user as current user')
                setCurrentUser(mappedUsers[0])
              } else {
                console.error('[PaymentView] No users available - this should not happen')
                toast.error('Unable to load user information. Please refresh the page.')
                return
              }
            }

            // Create table session object
            const tableSessionData: MultiUserTableSession = {
              id: sessionData.tableSessionId,
              tableId: session?.tableId || '',
              restaurantId: session?.restaurantId || '',
              sessionCode: '',
              status: 'ACTIVE',
              totalAmount: billResponse?.data?.summary?.grandTotal || 0,
              paidAmount: billResponse?.data?.summary?.totalPaid || 0,
              createdAt: session?.createdAt || new Date().toISOString(),
              expiresAt: session?.expiresAt || new Date().toISOString(),
              lastActivity: new Date().toISOString()
            }
            setTableSession(tableSessionData)
          } else {
            console.error('[PaymentView] Failed to load users:', usersResponse)
            toast.error('Failed to load table session users')
          }

          if (billResponse.success && billResponse.data) {
            setTableBill(billResponse.data)
          } else {
            console.error('[PaymentView] Failed to load bill:', billResponse)
            toast.error('Failed to load table session bill')
          }
        }
      } catch (err: any) {
        console.error('Failed to load payment data:', err)

        // Check if this is a session expiry error during data loading
        const isSessionExpired = err?.response?.status === 401 ||
                                 err?.response?.data?.errorCode === 'SESSION_EXPIRED' ||
                                 err?.response?.data?.message?.includes('SESSION_EXPIRED') ||
                                 err?.message?.includes('SESSION_EXPIRED')

        if (isSessionExpired) {
          console.log('[PaymentView] Session expired during data loading, attempting recovery...')

          toast.info('Session Recovery', {
            description: 'Your session expired while loading. Attempting to recover...',
            duration: 3000
          })

          const recoverySuccessful = await attemptSessionRecovery()

          if (recoverySuccessful) {
            console.log('[PaymentView] Session recovery successful, reloading data...')
            toast.success('Session Recovered', {
              description: 'Session recovered successfully. Reloading data...',
              duration: 2000
            })

            // Retry loading data after successful recovery
            setTimeout(() => {
              loadPaymentData()
            }, 1000)
            return
          } else {
            console.log('[PaymentView] Session recovery failed during data loading')
            toast.error('Session Recovery Failed', {
              description: 'Unable to recover your session. Please scan the QR code again or refresh the page.',
              duration: 8000
            })

            // Clear local session data since recovery failed
            SessionManager.clearDiningSession()

            // Redirect to home page after a delay
            setTimeout(() => {
              router.push('/')
            }, 3000)
            return
          }
        }

        setError(err.message || 'Failed to load payment data')
      } finally {
        setLoading(false)
      }
    }

    loadPaymentData()
  }, [paymentType, orderId, tableSessionId, api])

  const handleTipSelection = async (amount: number) => {
    setSelectedTip(amount)
    setCustomTip('')
    setTipSelectionMade(true) // Mark that user has made a selection

    // Update tip on server for security
    if (paymentType === PaymentType.ORDER && orderId) {
      try {
        const response = await api.order.updateTip(orderId, amount)
        if (response.success && response.data) {
          // Update local order data with server response
          setOrder(transformApiOrderToLocal(response.data))
        }
      } catch (error) {
        console.error('Failed to update tip on server:', error)
        toast.error('Failed to update tip. Please try again.')
        // Reset tip selection on error
        setSelectedTip(0)
      }
    } else if (paymentType === PaymentType.TABLE_SESSION && clientSecret && paymentId) {
      // Update tip for existing table session payment intent
      try {
        setUpdatingTip(true)

        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (!sessionId) {
          throw new Error('No table session found')
        }

        const response = await api.tableSession.updatePaymentTip(sessionId, paymentId, {
          tipAmount: Math.round(amount * 100) / 100  // Round to 2 decimal places
        })

        if (response.success && response.data) {
          // Update payment breakdown with server response
          setPaymentBreakdown(response.data.breakdown)

          toast.success('Tip updated successfully!', {
            description: `Payment amount updated to ${formatPrice(response.data.amount)}`,
            duration: 2000
          })
        } else {
          throw new Error(response.error || 'Failed to update tip')
        }
      } catch (error: any) {
        console.error('Failed to update table session tip:', error)
        toast.error('Failed to update tip. Please try again.')
        // Reset tip selection on error
        setSelectedTip(0)
      } finally {
        setUpdatingTip(false)
      }
    }
  }

  const handleCustomTipChange = async (value: string) => {
    setCustomTip(value)
    setSelectedTip(0)
    setTipSelectionMade(true) // Mark that user has made a selection

    const tipAmount = parseFloat(value) || 0

    // Update tip on server for security (only if valid amount)
    if (paymentType === PaymentType.ORDER && orderId && tipAmount >= 0) {
      try {
        const response = await api.order.updateTip(orderId, tipAmount)
        if (response.success && response.data) {
          // Update local order data with server response
          setOrder(transformApiOrderToLocal(response.data))
        }
      } catch (error) {
        console.error('Failed to update custom tip on server:', error)
        toast.error('Failed to update tip. Please try again.')
        // Reset custom tip on error
        setCustomTip('')
      }
    } else if (paymentType === PaymentType.TABLE_SESSION && clientSecret && paymentId && tipAmount >= 0) {
      // Update tip for existing table session payment intent
      try {
        setUpdatingTip(true)

        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (!sessionId) {
          throw new Error('No table session found')
        }

        const response = await api.tableSession.updatePaymentTip(sessionId, paymentId, {
          tipAmount: Math.round(tipAmount * 100) / 100  // Round to 2 decimal places
        })

        if (response.success && response.data) {
          // Update payment breakdown with server response
          setPaymentBreakdown(response.data.breakdown)

          toast.success('Tip updated successfully!', {
            description: `Payment amount updated to ${formatPrice(response.data.amount)}`,
            duration: 2000
          })
        } else {
          throw new Error(response.error || 'Failed to update tip')
        }
      } catch (error: any) {
        console.error('Failed to update table session custom tip:', error)
        toast.error('Failed to update tip. Please try again.')
        // Reset custom tip on error
        setCustomTip('')
      } finally {
        setUpdatingTip(false)
      }
    }
  }

  // Session recovery function to handle expired sessions
  const attemptSessionRecovery = async (): Promise<boolean> => {
    try {
      const session = SessionManager.getDiningSession()
      if (!session?.sessionId) {
        console.log('[SessionRecovery] No session ID available for recovery')
        return false
      }

      console.log(`[SessionRecovery] Attempting to recover session ${session.sessionId}`)

      // Try to extend the table session first
      if (session.tableSessionId) {
        try {
          const extendResponse = await api.post(`/table-sessions/${session.tableSessionId}/extend`, {})
          if (extendResponse.success) {
            console.log('[SessionRecovery] Successfully extended table session')
            SessionManager.updateLastActivity() // Update local session activity
            return true
          }
        } catch (extendError) {
          console.log('[SessionRecovery] Table session extension failed, trying guest session recovery:', extendError)
        }
      }

      // If table session extension fails, try guest session recovery
      try {
        const recoveryResponse = await api.post('/table-sessions/recover', {
          sessionId: session.sessionId
        })

        if (recoveryResponse.success && recoveryResponse.data?.sessionId) {
          console.log('[SessionRecovery] Successfully recovered guest session')

          // Update the session manager with the recovered session info
          SessionManager.setDiningSession({
            ...session,
            sessionId: recoveryResponse.data.sessionId,
            tableSessionId: recoveryResponse.data.tableSessionId
          })

          return true
        }
      } catch (recoveryError) {
        console.log('[SessionRecovery] Guest session recovery failed:', recoveryError)
      }

      console.log('[SessionRecovery] All recovery attempts failed')
      return false
    } catch (error) {
      console.error('[SessionRecovery] Session recovery error:', error)
      return false
    }
  }

  const createPaymentIntent = async () => {
    if (paymentType === PaymentType.ORDER && (!order || !orderId)) {
      toast.error('Order information is missing')
      return
    }

    if (paymentType === PaymentType.TABLE_SESSION && (!tableBill || !tableSession)) {
      toast.error('Table session information is missing')
      return
    }

    if (selectedPaymentMethod !== PaymentMethod.CREDIT_CARD && selectedPaymentMethod !== PaymentMethod.DEBIT_CARD) {
      // Handle non-card payments differently
      await handleNonCardPayment()
      return
    }

    // Check for existing card payments to prevent duplicates
    if (paymentType === PaymentType.ORDER) {
      const existingPayments = await api.payment.getByOrder(orderId!)
      if (existingPayments.success && existingPayments.data) {
        const existingCardPayment = existingPayments.data.find(p =>
          (p.method === PaymentMethod.CREDIT_CARD || p.method === PaymentMethod.DEBIT_CARD || p.method === PaymentMethod.MOBILE_PAYMENT) &&
          (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.COMPLETED)
        )

        if (existingCardPayment) {
          if (existingCardPayment.status === PaymentStatus.COMPLETED) {
            toast.info('Payment Already Completed', {
              description: 'This order has already been paid for'
            })
            return
          } else if (existingCardPayment.status === PaymentStatus.PENDING) {
            toast.info('Payment Already In Progress', {
              description: 'A payment is already being processed for this order'
            })
            setClientSecret(existingCardPayment.clientSecret || null)
            setPaymentId(existingCardPayment.id)
            return
          }
        }
      }
    } else if (paymentType === PaymentType.TABLE_SESSION) {
      // Check for existing table session payments
      const session = SessionManager.getDiningSession()
      const sessionId = session?.tableSessionId

      if (sessionId) {
        const paymentStatus = await api.tableSession.getPaymentStatus(sessionId)
        if (paymentStatus.success && paymentStatus.data) {
          console.log('[PaymentView] All payments found:', paymentStatus.data.payments)
          console.log('[PaymentView] Looking for payments by guest:', session?.sessionId)

          const existingCardPayment = paymentStatus.data.payments?.find((p: any) =>
            (p.paymentMethod === PaymentMethod.CREDIT_CARD || p.paymentMethod === PaymentMethod.DEBIT_CARD || p.paymentMethod === PaymentMethod.MOBILE_PAYMENT) &&
            (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.PROCESSING) &&
            p.paidBy === session?.sessionId // Only check payments created by this guest
          )

          console.log('[PaymentView] Existing card payment found:', existingCardPayment)

          if (existingCardPayment) {
            console.log('[PaymentView] Found existing payment:', {
              id: existingCardPayment.id,
              status: existingCardPayment.status,
              hasClientSecret: !!existingCardPayment.clientSecret
            })

            setPaymentId(existingCardPayment.id)

            // Check if clientSecret exists
            if (existingCardPayment.clientSecret) {
              toast.info('Payment Already In Progress', {
                description: 'You already have a payment being processed for this table session'
              })
              setClientSecret(existingCardPayment.clientSecret)

              // Restore existing payment breakdown and tip state
              await restoreExistingPaymentState(sessionId, existingCardPayment.id)
              return
            } else {
              console.log('[PaymentView] Existing payment found but clientSecret missing, will need to reinitialize')
              toast.warning('Payment Recovery Required', {
                description: 'Found existing payment but need to reinitialize. Click "Initialize Payment" to continue.'
              })
              // Don't return - let user reinitialize the payment
            }
          }
        }
      }
    }

    setProcessing(true)

    try {
      let response: any

      if (paymentType === PaymentType.ORDER) {
        // Individual order payment - backend calculates amounts securely from Order fields
        // No need to send amounts from frontend since backend validates order.total = subtotal + tax + tip
        response = await api.payment.createOrderPayment({
          orderId: orderId!,
          currency: 'USD',
          paymentMethod: selectedPaymentMethod
          // amount field omitted - server calculates from orderId for security
        })
      } else if (paymentType === PaymentType.TABLE_SESSION) {
        // Use table-wide payment endpoint
        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (!sessionId) {
          throw new Error('No table session found')
        }

        // Calculate tip amount to send to backend
        const tipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()

        const paymentData: CreateTableSessionPaymentRequest = {
          paymentMethod: selectedPaymentMethod,
          tipAmount: tipAmount > 0 ? tipAmount : undefined
          // Backend will calculate total amount based on unpaid orders in the session
        }

        // Use table session payment API with guest session context
        response = await api.tableSession.createPayment(
          sessionId,
          paymentData,
          { guestSessionId: session?.sessionId }
        )
      }

      if (response?.success && response.data?.clientSecret) {
        const newPaymentId = response.data.id || response.data.paymentId
        const newClientSecret = response.data.clientSecret

        setClientSecret(newClientSecret)
        setPaymentId(newPaymentId)

        // Store payment breakdown if available (for table session payments)
        if (response.data.breakdown) {
          setPaymentBreakdown(response.data.breakdown)
        }

        toast.success('Payment form ready!', {
          description: 'Please enter your card details to complete payment',
        })
      } else {
        throw new Error(
          typeof response?.error === 'string'
            ? response.error
            : response?.error?.message || 'Failed to create payment intent'
        )
      }
    } catch (error: any) {
      console.error('Payment intent creation error:', error)

      // Enhanced error handling for duplicate payment
      const isDuplicatePayment =
        error?.response?.data?.errorCode === 'DUPLICATE_PAYMENT' ||
        error?.response?.data?.message?.includes('duplicate payment') ||
        error?.message?.toLowerCase().includes('already has an active payment')

      if (isDuplicatePayment) {
        toast.error('Payment Already Exists', {
          description: 'This order already has an active payment. Please check your payment status.',
          duration: 5000
        })
        setError('This order already has an active payment')
        return
      }

      // Check for insufficient funds error
      const isInsufficientFunds =
        error?.response?.data?.errorCode === 'INSUFFICIENT_FUNDS' ||
        error?.message?.toLowerCase().includes('insufficient funds')

      if (isInsufficientFunds) {
        toast.error('Payment Failed', {
          description: 'Insufficient funds. Please try a different payment method.',
          duration: 5000
        })
        setError('Insufficient funds for this payment')
        return
      }

      // Check if this is a session expiry error
      const isSessionExpired = error?.response?.status === 401 ||
                               error?.response?.data?.errorCode === 'SESSION_EXPIRED' ||
                               error?.response?.data?.message?.includes('SESSION_EXPIRED') ||
                               error?.message?.includes('SESSION_EXPIRED')

      if (isSessionExpired) {
        console.log('[PaymentView] Session expired during payment, attempting recovery...')

        toast.info('Session Recovery', {
          description: 'Your session expired. Attempting to recover...',
          duration: 3000
        })

        const recoverySuccessful = await attemptSessionRecovery()

        if (recoverySuccessful) {
          console.log('[PaymentView] Session recovery successful, retrying payment...')
          toast.success('Session Recovered', {
            description: 'Session recovered successfully. Retrying payment...',
            duration: 2000
          })

          // Retry the payment creation after successful recovery
          setTimeout(() => {
            createPaymentIntent()
          }, 1000)
          return
        } else {
          console.log('[PaymentView] Session recovery failed')
          toast.error('Session Recovery Failed', {
            description: 'Unable to recover your session. Please scan the QR code again or refresh the page.',
            duration: 8000
          })

          // Clear local session data since recovery failed
          SessionManager.clearDiningSession()

          // Redirect to home page after a delay
          setTimeout(() => {
            router.push('/')
          }, 3000)
          return
        }
      }

      // Handle other error types
      let errorMessage = 'Failed to initialize payment. Please try again.'

      if (error?.response?.status === 400) {
        errorMessage = 'Invalid payment details. Please check and try again.'
      } else if (error?.response?.status === 402) {
        errorMessage = 'Payment method not accepted. Please try a different method.'
      }

      toast.error('Payment Initialization Failed', {
        description: errorMessage
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleNonCardPayment = async () => {
    if (processing || cashPaymentPending) return

    setProcessing(true)

    try {
      // Check for existing cash payments to prevent duplicates
      if (paymentType === PaymentType.ORDER) {
        const existingPayments = await api.payment.getByOrder(orderId!)
        if (existingPayments.success && existingPayments.data) {
          const existingCashPayment = existingPayments.data.find(p =>
            p.method === PaymentMethod.CASH &&
            (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.COMPLETED)
          )

          if (existingCashPayment) {
            if (existingCashPayment.status === PaymentStatus.COMPLETED) {
              toast.info('Payment Already Completed', {
                description: 'This order has already been paid for with cash'
              })
              setProcessing(false)
              return
            } else if (existingCashPayment.status === PaymentStatus.PENDING) {
              toast.info('Cash Payment Already Requested', {
                description: 'A cash payment request is already pending for this order'
              })
              setCashPaymentPending(true)
              setPaymentId(existingCashPayment.id)
              setProcessing(false)
              return
            }
          }
        }
      } else if (paymentType === PaymentType.TABLE_SESSION) {
        // Check for existing table session cash payments
        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (sessionId) {
          const paymentStatus = await api.tableSession.getPaymentStatus(sessionId)
          if (paymentStatus.success && paymentStatus.data) {
            const existingCashPayment = paymentStatus.data.payments?.find((p: any) =>
              p.paymentMethod === PaymentMethod.CASH &&
              (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.COMPLETED) &&
              p.paidBy === session?.sessionId // Only check payments created by this guest
            )

            if (existingCashPayment) {
              if (existingCashPayment.status === PaymentStatus.COMPLETED) {
                toast.info('Payment Already Completed', {
                  description: 'You have already paid with cash for this table session'
                })
                setProcessing(false)
                return
              } else if (existingCashPayment.status === PaymentStatus.PENDING) {
                toast.info('Cash Payment Already Requested', {
                  description: 'You already have a cash payment request pending for this table session'
                })
                setCashPaymentPending(true)
                setPaymentId(existingCashPayment.id)
                setProcessing(false)
                return
              }
            }
          }
        }
      }

      setCashPaymentPending(true)

      let response: any

      if (paymentType === PaymentType.ORDER) {
        // Individual order payment with cash method
        // Create payment intent in PENDING status, then update to COMPLETED
        // Amount calculation is done server-side based on orderId for security
        const createResponse = await api.payment.createOrderPayment({
          orderId: orderId!,
          currency: 'USD',
          paymentMethod: PaymentMethod.CASH
          // amount field omitted - server calculates from orderId for security
        })

        if (createResponse.success) {
          // Payment created in PENDING status, now update to COMPLETED for cash payments
          response = await api.payment.updateStatus(createResponse.data.id, PaymentStatus.COMPLETED)
        } else {
          throw new Error(createResponse.error || 'Failed to create payment intent')
        }
      } else if (paymentType === PaymentType.TABLE_SESSION) {
        // Table session payment with cash method
        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (!sessionId) {
          throw new Error('No table session found')
        }

        // Calculate tip amount to send to backend
        const tipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()

        const paymentData: CreateTableSessionPaymentRequest = {
          paymentMethod: PaymentMethod.CASH,
          tipAmount: tipAmount > 0 ? tipAmount : undefined
        }

        response = await api.tableSession.createPayment(
          sessionId,
          paymentData,
          { guestSessionId: session?.sessionId }
        )
      }

      if (response?.success) {
        // Store payment ID for tracking
        setPaymentId(response.data.id || response.data.paymentId)

        // Store payment breakdown if available
        if (response.data.breakdown) {
          setPaymentBreakdown(response.data.breakdown)
        }

        toast.success('Cash Payment Requested', {
          description: 'Your server will confirm when payment is received',
          duration: 6000
        })

        // Start listening for payment status updates via WebSocket
        // The existing WebSocket handlers will catch payment completion events

      } else {
        throw new Error(
          typeof response?.error === 'string'
            ? response.error
            : response?.error?.message || 'Failed to create cash payment request'
        )
      }
    } catch (error: any) {
      console.error('Cash payment request error:', error)

      // Handle session expiry
      const isSessionExpired = error?.response?.status === 401 ||
                               error?.response?.data?.errorCode === 'SESSION_EXPIRED'

      if (isSessionExpired) {
        const recoverySuccessful = await attemptSessionRecovery()
        if (recoverySuccessful) {
          setTimeout(() => handleNonCardPayment(), 1000)
          return
        } else {
          SessionManager.clearDiningSession()
          setTimeout(() => router.push('/'), 3000)
          return
        }
      }

      let errorMessage = 'Failed to request cash payment. Please try again.'
      if (error?.response?.status === 400) {
        errorMessage = 'Invalid payment request. Please check and try again.'
      }

      toast.error('Cash Payment Request Failed', {
        description: errorMessage
      })

      setCashPaymentPending(false)
    } finally {
      setProcessing(false)
    }
  }

  const handlePaymentSuccess = async (stripePaymentIntentId: string) => {
    toast.success('Payment completed successfully!', {
      description: 'Thank you for your payment',
      duration: 4000
    })

    // Use internal payment ID (not Stripe PaymentIntent ID) for success page
    if (!paymentId) {
      console.error('Internal payment ID not found')
      toast.error('Payment completed but unable to show details')
      return
    }


    // Get guest session from multiple sources for reliability
    const session = SessionManager.getDiningSession()
    const guestSessionId = session?.sessionId || api.getGuestSessionId() || sessionStorage.getItem('tabsy-guest-session-id')

    // Navigate to success page with internal payment ID and guest session
    const successUrl = paymentType === PaymentType.ORDER
      ? `/payment/success?payment=${paymentId}&restaurant=${restaurantId}&table=${tableId}&guestSession=${guestSessionId || ''}`
      : `/payment/success?payment=${paymentId}&tableSession=${tableSession?.id}&restaurant=${restaurantId}&table=${tableId}&guestSession=${guestSessionId || ''}`

    router.push(successUrl)
  }

  const handlePaymentError = (error: string) => {
    toast.error('Payment Failed', {
      description: error
    })
    // Reset payment intent to allow retry
    setClientSecret(null)
    setPaymentId(null)
  }

  const handlePaymentCancel = async () => {
    if (!paymentId) {
      toast.error('Unable to cancel payment')
      return
    }

    setCancelling(true)

    try {
      let response: any

      if (paymentType === PaymentType.TABLE_SESSION) {
        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (!sessionId) {
          throw new Error('No table session found')
        }

        response = await api.tableSession.cancelPayment(sessionId, paymentId, {
          reason: 'User cancelled payment'
        })
      } else if (paymentType === PaymentType.ORDER) {
        // For order payments, use payment status update endpoint
        response = await api.payment.updateStatus(paymentId, 'CANCELLED' as any)
      }

      if (response?.success) {
        toast.success('Payment Cancelled', {
          description: 'Your payment request has been cancelled successfully'
        })

        // Reset payment state to allow new payment
        setClientSecret(null)
        setPaymentId(null)
        setProcessing(false)
        setCashPaymentPending(false)
        setChangingPaymentMethod(false)

        // Refresh data based on payment type
        if (paymentType === PaymentType.TABLE_SESSION) {
          const session = SessionManager.getDiningSession()
          const sessionId = tableSessionId || session?.tableSessionId
          if (sessionId) {
            const billResponse = await api.tableSession.getBill(sessionId)
            if (billResponse.success && billResponse.data) {
              setTableBill(billResponse.data)
            }
          }
        }
      } else {
        throw new Error(response?.error || 'Failed to cancel payment')
      }
    } catch (error: any) {
      console.error('Payment cancellation error:', error)

      // Handle session expiry during cancellation
      const isSessionExpired = error?.response?.status === 401 ||
                               error?.response?.data?.errorCode === 'SESSION_EXPIRED'

      if (isSessionExpired) {
        const recoverySuccessful = await attemptSessionRecovery()
        if (recoverySuccessful) {
          // Retry cancellation after session recovery
          setTimeout(() => handlePaymentCancel(), 1000)
          return
        }
      }

      toast.error('Cancellation Failed', {
        description: error.message || 'Unable to cancel payment. Please contact support.'
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleSplitBillPayment = () => {
    console.log('[PaymentView] Opening split bill:', { tableBill, currentUser, sessionUsers })

    // Validate table bill is available
    if (!tableBill) {
      toast.error('Unable to split bill - no bill information available')
      return
    }

    // Validate remaining balance (excluding tips)
    const unpaidAmount = tableBill.summary.remainingBalance - tableBill.summary.tip
    if (unpaidAmount <= 0) {
      toast.error('Bill has already been fully paid')
      return
    }

    // Validate we have proper user data
    if (!currentUser) {
      toast.error('Unable to identify current user for split payment')
      return
    }

    if (sessionUsers.length === 0) {
      toast.error('Unable to load table session users. Please refresh and try again.')
      return
    }

    // Set payment type to split bill for consistency
    setPaymentType(PaymentType.SPLIT_BILL)
    setShowSplitBill(true)

    // Update URL to reflect split bill state (optional - helps with navigation consistency)
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('type', PaymentType.SPLIT_BILL)
    window.history.pushState(null, '', currentUrl.toString())

    console.log('[PaymentView] Split bill modal opened successfully')
  }

  const handleSplitPaymentComplete = (paymentId: string) => {
    toast.success('Split payment completed successfully!')
    const guestSessionId = SessionManager.getDiningSession()?.sessionId || api.getGuestSessionId() || sessionStorage.getItem('tabsy-guest-session-id')
    router.push(`/payment/success?payment=${paymentId}&tableSession=${tableSession?.id}&split=true&guestSession=${guestSessionId || ''}`)
  }

  const handleChangePaymentMethod = async (newPaymentMethod: PaymentMethod) => {
    if (!paymentId || changingPaymentMethod) return

    setChangingPaymentMethod(true)

    try {
      const response = await api.payment.changeMethod(paymentId, newPaymentMethod)

      if (response?.success) {
        // Update payment method and client secret if provided
        setSelectedPaymentMethod(newPaymentMethod)

        if (response.data.clientSecret) {
          setClientSecret(response.data.clientSecret)
        }

        // Update states based on new payment method
        if (newPaymentMethod === PaymentMethod.CASH) {
          setCashPaymentPending(true)
          setClientSecret(null)
          toast.success('Payment Method Changed', {
            description: 'Payment method changed to cash. Your server will confirm when payment is received.'
          })
        } else {
          setCashPaymentPending(false)
          toast.success('Payment Method Changed', {
            description: 'Payment method changed to card. Please complete your payment below.'
          })
        }
      } else {
        throw new Error(response?.error || 'Failed to change payment method')
      }
    } catch (error: any) {
      console.error('Payment method change error:', error)

      // Handle session expiry
      const isSessionExpired = error?.response?.status === 401 ||
                               error?.response?.data?.errorCode === 'SESSION_EXPIRED'

      if (isSessionExpired) {
        const recoverySuccessful = await attemptSessionRecovery()
        if (recoverySuccessful) {
          setTimeout(() => handleChangePaymentMethod(newPaymentMethod), 1000)
          return
        } else {
          SessionManager.clearDiningSession()
          setTimeout(() => router.push('/'), 3000)
          return
        }
      }

      toast.error('Payment Method Change Failed', {
        description: error.message || 'Unable to change payment method. Please try again.'
      })
    } finally {
      setChangingPaymentMethod(false)
    }
  }

  const handleBackFromSplit = () => {
    // Reset split bill state and ensure clean navigation
    setShowSplitBill(false)

    // If we came from a split bill URL, reset to table session payment type
    if (paymentType === PaymentType.SPLIT_BILL) {
      setPaymentType(PaymentType.TABLE_SESSION)

      // Update URL to remove split bill type but stay on payment page
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('type', PaymentType.TABLE_SESSION)
      window.history.replaceState(null, '', currentUrl.toString())
    }

    // Stay on the current payment page - don't navigate away
    console.log('[PaymentView] Returning from split bill to payment view')
  }

  const handleBack = () => {
    if (paymentType === PaymentType.ORDER) {
      router.push(`/order/${orderId}?restaurant=${restaurantId}&table=${tableId}`)
    } else if (paymentType === PaymentType.TABLE_SESSION || paymentType === PaymentType.SPLIT_BILL) {
      router.push(`/table/bill${SessionManager.getDiningQueryParams()}`)
    } else {
      router.back()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-content-secondary">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (error || (paymentType === PaymentType.ORDER && !order) || ((paymentType === PaymentType.TABLE_SESSION || paymentType === PaymentType.SPLIT_BILL) && (!tableBill || !tableSession))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-status-error-light rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-status-error" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Payment Error
            </h1>
            <p className="text-content-secondary">
              {error || 'Unable to load payment information'}
            </p>
          </div>
          <Button onClick={handleBack} className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // Show split bill component if enabled
  if (showSplitBill && tableBill && currentUser && sessionUsers.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <SplitBillPayment
          bill={tableBill}
          currentUser={currentUser}
          users={sessionUsers}
          api={api}
          sessionId={tableSessionId || SessionManager.getDiningSession()?.tableSessionId}
          restaurantId={restaurantId || undefined}
          tableId={tableId || undefined}
          onPaymentComplete={handleSplitPaymentComplete}
          onCancel={handleBackFromSplit}
        />
      </div>
    )
  }

  const tipOptions = getTipOptions()

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
              disabled={processing}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Payment</h1>
              <p className="text-sm text-content-tertiary">
                {paymentType === PaymentType.ORDER && order ? (
                  `Order #${order.orderNumber}`
                ) : paymentType === PaymentType.SPLIT_BILL ? (
                  'Split Bill Payment'
                ) : (
                  'Table Session Payment'
                )}
              </p>
              {paymentType !== PaymentType.ORDER && tableBill && (
                <p className="text-xs text-content-secondary">
                  Remaining: {formatPrice(tableBill.summary.remainingBalance - tableBill.summary.tip)} of {formatPrice(tableBill.summary.subtotal + tableBill.summary.tax)}
                </p>
              )}
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
                  <ReceiptText className="w-5 h-5" />
                  <span>{paymentType === PaymentType.ORDER ? 'Order Summary' : 'Bill Summary'}</span>
                </h3>
                {paymentType === PaymentType.TABLE_SESSION && sessionUsers.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSplitBillPayment}
                    className="flex items-center space-x-2"
                  >
                    <Split className="w-4 h-4" />
                    <span>Split Bill</span>
                  </Button>
                )}
              </div>

              {paymentType === PaymentType.ORDER && order ? (
                <>
                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-medium text-content-primary">{item.name}</h4>
                          <p className="text-sm text-content-secondary">
                            {formatPrice(item.unitPrice)} × {item.quantity}
                          </p>
                        </div>
                        <div className="font-semibold text-content-primary">
                          {formatPrice(item.totalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-content-secondary">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-content-secondary">
                      <span>Tax</span>
                      <span>{formatPrice(order.tax)}</span>
                    </div>
                    {order.tip > 0 && (
                      <div className="flex justify-between text-content-secondary">
                        <span>Tip</span>
                        <span>{formatPrice(order.tip)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-content-primary border-t pt-2">
                      <span>Order Total</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </>
              ) : paymentType === PaymentType.TABLE_SESSION && tableBill ? (
                <>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-content-secondary">
                      <Users className="w-4 h-4" />
                      <span>{sessionUsers.length} people dining</span>
                    </div>

                    {Object.values(tableBill.billByRound).map((round) => {
                      // Determine payment status from payments array
                      const ordersWithPaymentStatus = round.orders.map((order: any) => {
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

                      const paidOrdersCount = ordersWithPaymentStatus.filter((o) => o.isPaid).length;
                      const totalOrdersCount = ordersWithPaymentStatus.length;
                      const hasUnpaidOrders = ordersWithPaymentStatus.some((o) => !o.isPaid);

                      return (
                        <div key={round.roundNumber} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-content-primary">
                              Round {round.roundNumber || round.roundTotal}
                            </h4>
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
                          {ordersWithPaymentStatus.map((roundOrder) => (
                            <div
                              key={roundOrder.orderId}
                              className={`space-y-1 mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0 ${
                                roundOrder.isPaid
                                  ? 'opacity-60'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-content-tertiary">
                                  Order by {roundOrder.placedBy || `Order ${roundOrder.orderId?.slice(-4) || ''}`}
                                </div>
                                {roundOrder.isPaid && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">
                                    ✓ Paid
                                  </span>
                                )}
                              </div>
                              {roundOrder.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className={`${roundOrder.isPaid ? 'line-through text-content-tertiary' : 'text-content-secondary'}`}>
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className={`${roundOrder.isPaid ? 'line-through text-content-tertiary' : 'text-content-primary'}`}>
                                    {formatPrice(Number(item.subtotal || 0))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Show message if all orders are paid */}
                    {Object.values(tableBill.billByRound).every((round) =>
                      round.orders.every((order) => order.isPaid)
                    ) && (
                      <div className="text-center py-4 text-content-secondary bg-status-success/10 rounded-lg border border-status-success/20">
                        <div className="text-2xl mb-2">✅</div>
                        <p className="font-medium text-status-success">All orders have been paid!</p>
                        <p className="text-sm text-status-success">Thank you for dining with us.</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-content-secondary">
                      <span>Subtotal</span>
                      <span>{formatPrice(tableBill.summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-content-secondary">
                      <span>Tax</span>
                      <span>{formatPrice(tableBill.summary.tax)}</span>
                    </div>
                    <div className="flex justify-between text-content-secondary">
                      <span>Total</span>
                      <span>{formatPrice(tableBill.summary.subtotal + tableBill.summary.tax)}</span>
                    </div>
                    {tableBill.summary.totalPaid > 0 && (
                      <div className="flex justify-between text-status-success">
                        <span>Already Paid</span>
                        <span>-{formatPrice(tableBill.summary.totalPaid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-content-primary border-t pt-2">
                      <span>Amount Due</span>
                      <span>{formatPrice(tableBill.summary.remainingBalance - tableBill.summary.tip)}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </motion.div>

            {/* Tip Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Add Tip</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {tipOptions.map((tip) => {
                  // Check if this tip amount matches either selectedTip or existing paymentBreakdown tip
                  const isSelected = selectedTip === tip.amount ||
                    (paymentBreakdown && Math.abs(paymentBreakdown.tip - tip.amount) < 0.01)

                  return (
                    <Button
                      key={tip.percentage}
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleTipSelection(tip.amount)}
                      className="h-12 flex-col"
                      disabled={processing || updatingTip}
                    >
                      <span className="text-sm font-semibold">{tip.label}</span>
                      <span className="text-xs">{formatPrice(tip.amount)}</span>
                    </Button>
                  )
                })}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Banknote className="w-4 h-4 text-content-tertiary" />
                  <input
                    type="number"
                    value={customTip}
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    placeholder="Custom tip amount"
                    className="flex-1 p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    min="0"
                    step="0.01"
                    disabled={processing || updatingTip}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleTipSelection(0)}
                  className="w-full"
                  disabled={processing || updatingTip}
                >
                  No Tip
                </Button>
              </div>

              <div className="mt-4 p-3 bg-surface-tertiary rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-content-secondary">
                  <Info className="w-4 h-4" />
                  <span>
                    Tips go directly to your server and kitchen staff
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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
                  disabled={processing || updatingTip}
                >
                  <CreditCard className="w-6 h-6 mb-1" />
                  <span className="text-sm">Card</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.MOBILE_PAYMENT ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod(PaymentMethod.MOBILE_PAYMENT)}
                  className="h-16 flex-col"
                  disabled={processing || updatingTip}
                >
                  <Smartphone className="w-6 h-6 mb-1" />
                  <span className="text-sm">Apple Pay</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.CASH ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod('CASH' as PaymentMethod)}
                  className="h-16 flex-col"
                  disabled={processing || updatingTip}
                >
                  <Banknote className="w-6 h-6 mb-1" />
                  <span className="text-sm">Cash</span>
                </Button>
              </div>

              {/* Payment Method Details */}
              {selectedPaymentMethod === PaymentMethod.CREDIT_CARD && (
                <div className="mt-4">
                  {clientSecret ? (
                    <div className="space-y-4">
                      <StripeProvider>
                        <PaymentForm
                          amount={Math.round(getFinalTotal() * 100)} // Convert to cents
                          orderId={orderId || undefined}
                          tableSessionId={tableSession?.id}
                          onPaymentSuccess={handlePaymentSuccess}
                          onPaymentError={handlePaymentError}
                          processing={processing || updatingTip}
                          setProcessing={setProcessing}
                          disabled={updatingTip}
                          clientSecret={clientSecret}
                        />
                      </StripeProvider>

                      {/* Show cancel button for table session payments */}
                      {paymentType === PaymentType.TABLE_SESSION && paymentId && (
                        <Button
                          onClick={handlePaymentCancel}
                          variant="outline"
                          size="sm"
                          className="w-full border-status-error text-status-error hover:bg-status-error-light hover:border-status-error"
                          disabled={cancelling || processing || updatingTip}
                        >
                          {cancelling ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-status-error"></div>
                              <span>Cancelling...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="w-3 h-3" />
                              <span>Cancel Payment</span>
                            </div>
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-status-info/10 border border-status-info/20 rounded-lg p-4">
                        <div className="text-sm text-status-info">
                          <strong>Ready to pay with card:</strong> Click "Initialize Payment" to prepare your payment form.
                          {paymentType === PaymentType.TABLE_SESSION && (
                            <div className="mt-2 text-xs">
                              💡 You can cancel the payment before completing it if needed.
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Button
                          onClick={createPaymentIntent}
                          size="lg"
                          className="w-full"
                          disabled={processing || updatingTip}
                        >
                          {processing ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Preparing Payment...</span>
                            </div>
                          ) : updatingTip ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Updating Tip...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <CreditCard className="w-4 h-4" />
                              <span>Initialize Payment</span>
                            </div>
                          )}
                        </Button>

                      {/* Show cancel button for table session payments when payment is initialized */}
                      {paymentType === PaymentType.TABLE_SESSION && clientSecret && paymentId && (
                          <Button
                            onClick={handlePaymentCancel}
                            variant="outline"
                            size="lg"
                            className="w-full border-status-error text-status-error hover:bg-status-error-light hover:border-status-error"
                            disabled={cancelling || processing || updatingTip}
                          >
                            {cancelling ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-status-error"></div>
                                <span>Cancelling...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>Cancel Payment</span>
                              </div>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedPaymentMethod === PaymentMethod.MOBILE_PAYMENT && (
                <div className="mt-4 p-4 bg-status-info/10 border border-status-info/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-status-info">
                    <Smartphone className="w-4 h-4" />
                    <span>
                      Apple Pay, Google Pay, and other digital wallets will be available at checkout
                    </span>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === PaymentMethod.CASH && !cashPaymentPending && (
                <div className="mt-4 p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-status-warning">
                    <Info className="w-4 h-4" />
                    <span>
                      Click below to notify your server about cash payment
                    </span>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === PaymentMethod.CASH && cashPaymentPending && (
                <div className="mt-4 p-4 bg-status-info/10 border border-status-info/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-status-info">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-status-info"></div>
                    <span>
                      <strong>Cash payment requested!</strong> Waiting for server confirmation...
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-status-info">
                    Your server will confirm when they receive your cash payment.
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface rounded-xl border p-6 sticky top-24"
            >
              <h3 className="text-xl font-semibold text-content-primary mb-6">
                Payment Summary
                {!cashPaymentPending && paymentId && tableBill?.summary.paidAmount > 0 ? (
                  <span className="text-xs text-status-success ml-2 font-normal">✓ Payment Complete</span>
                ) : paymentBreakdown ? (
                  <span className="text-xs text-status-success ml-2 font-normal">✓ Server Confirmed</span>
                ) : (
                  <span className="text-xs text-status-warning ml-2 font-normal">~ Estimated</span>
                )}
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-content-secondary">
                  <span>{paymentType === PaymentType.ORDER ? 'Order Total' : 'Amount Due'}</span>
                  <span>{formatPrice(getPaymentAmount())}</span>
                </div>

                {(() => {
                  // Determine the current tip amount
                  let currentTipAmount = 0

                  if (paymentBreakdown?.tip) {
                    currentTipAmount = paymentBreakdown.tip
                  } else if (tipSelectionMade) {
                    // User has made a selection, use it (including 0 for "No Tip")
                    currentTipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()
                  } else if (paymentType === PaymentType.TABLE_SESSION && tableBill?.summary.tip) {
                    // No selection made yet, show existing tip
                    currentTipAmount = tableBill.summary.tip
                  }

                  // Only show tip line if there's a tip amount > 0
                  return currentTipAmount > 0 ? (
                    <div className="flex justify-between text-content-secondary">
                      <span>Tip</span>
                      <span>{formatPrice(currentTipAmount)}</span>
                    </div>
                  ) : null
                })()}

                <div className="border-t pt-3">
                  <div className="flex justify-between text-xl font-bold text-content-primary">
                    <span>Total</span>
                    <span>{formatPrice(getFinalTotal())}</span>
                  </div>
                </div>

                {/* Show breakdown details when available from server */}
                {paymentBreakdown && (
                  <div className="mt-4 p-3 bg-status-success-light border border-status-success rounded-lg">
                    <div className="text-xs text-status-success font-medium mb-2">Server-Confirmed Breakdown:</div>
                    <div className="space-y-1 text-xs text-status-success">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatPrice(paymentBreakdown.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>{formatPrice(paymentBreakdown.tax)}</span>
                      </div>
                      {paymentBreakdown.tip > 0 && (
                        <div className="flex justify-between">
                          <span>Tip:</span>
                          <span>{formatPrice(paymentBreakdown.tip)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t border-status-success pt-1">
                        <span>Total:</span>
                        <span>{formatPrice(paymentBreakdown.total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {paymentType === PaymentType.TABLE_SESSION && sessionUsers.length > 1 && (
                  <div className="mt-4 p-3 bg-status-info/10 border border-status-info/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-status-info">
                      <Info className="w-4 h-4" />
                      <span>
                        This will pay the full remaining balance. Use "Split Bill" to pay your portion only.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Action */}
              {selectedPaymentMethod === PaymentMethod.CASH && !cashPaymentPending && (
                <Button
                  onClick={handleNonCardPayment}
                  size="lg"
                  className="w-full"
                  disabled={processing || updatingTip}
                >
                  {processing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Requesting Payment...</span>
                    </div>
                  ) : updatingTip ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating Tip...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Banknote className="w-4 h-4" />
                      <span>Request Cash Payment</span>
                    </div>
                  )}
                </Button>
              )}

              {selectedPaymentMethod === PaymentMethod.CASH && !cashPaymentPending && paymentId && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-status-success-light border border-status-success rounded-lg">
                    <div className="flex items-center justify-center space-x-2 text-sm text-status-success">
                      <CheckCircle className="w-5 h-5 text-status-success" />
                      <span className="font-medium">Payment Complete!</span>
                    </div>
                    <p className="text-xs text-status-success mt-1">Redirecting to confirmation page...</p>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === PaymentMethod.CASH && cashPaymentPending && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-surface-tertiary rounded-lg">
                    <div className="flex items-center justify-center space-x-2 text-sm text-content-secondary">
                      <CheckCircle className="w-4 h-4 text-status-success" />
                      <span>Payment request sent to server</span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePaymentCancel}
                    variant="outline"
                    size="lg"
                    className="w-full border-status-error text-status-error hover:bg-status-error-light hover:border-status-error"
                    disabled={cancelling || processing}
                  >
                    {cancelling ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-status-error"></div>
                        <span>Cancelling...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Cancel Cash Payment</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}

              {selectedPaymentMethod === PaymentMethod.MOBILE_PAYMENT && (
                <Button
                  onClick={createPaymentIntent}
                  size="lg"
                  className="w-full"
                  disabled={processing || updatingTip}
                >
                  {processing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Preparing...</span>
                    </div>
                  ) : updatingTip ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating Tip...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4" />
                      <span>Pay with Digital Wallet</span>
                    </div>
                  )}
                </Button>
              )}

              {selectedPaymentMethod === PaymentMethod.CREDIT_CARD && !clientSecret && (
                <div className="text-center text-sm text-content-secondary">
                  Click "Initialize Payment" above to prepare your card payment
                </div>
              )}

              <div className="mt-4 text-xs text-content-tertiary text-center">
                <p>Your payment is secured by Stripe</p>
                <p className="mt-1">Card details are never stored on our servers</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}