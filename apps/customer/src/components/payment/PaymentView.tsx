'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Split
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { PaymentMethod, TableSessionBill, TableSessionUser, MultiUserTableSession, CreateTableSessionPaymentRequest } from '@tabsy/shared-types'
import { SessionManager } from '@/lib/session'
import { SplitBillPayment } from './SplitBillPayment'
import { StripeCardForm } from './StripeCardForm'
import { StripeProvider } from '@/components/providers/stripe-provider'
import { PaymentForm } from './PaymentForm'
import { useWebSocketEvent } from '@tabsy/ui-components'

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
  total: typeof apiOrder.total === 'string' ? parseFloat(apiOrder.total) : (apiOrder.total || 0),
  guestInfo: {
    name: apiOrder.customerName || 'Guest',
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

type PaymentType = 'order' | 'table_session' | 'split_bill'

export function PaymentView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()

  // Order-based payment state
  const [order, setOrder] = useState<Order | null>(null)

  // Table session payment state
  const [tableSession, setTableSession] = useState<MultiUserTableSession | null>(null)
  const [tableBill, setTableBill] = useState<TableSessionBill | null>(null)
  const [currentUser, setCurrentUser] = useState<TableSessionUser | null>(null)
  const [sessionUsers, setSessionUsers] = useState<TableSessionUser[]>([])

  // Payment state
  const [paymentType, setPaymentType] = useState<PaymentType>('order')
  const [showSplitBill, setShowSplitBill] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedTip, setSelectedTip] = useState<number>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CREDIT_CARD)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentStatusPolling, setPaymentStatusPolling] = useState<NodeJS.Timeout | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // URL parameters
  const orderId = searchParams.get('order')
  const tableSessionId = searchParams.get('tableSessionId')
  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')
  const paymentTypeParam = searchParams.get('type') as PaymentType || 'order'

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
    if (data.type === 'payment_completed' || data.type === 'payment_status_update') {
      try {
        // Refresh the table bill to show updated amounts
        const session = SessionManager.getDiningSession()
        const sessionId = tableSessionId || session?.tableSessionId

        if (sessionId) {
          const billResponse = await api.tableSession.getBill(sessionId)
          if (billResponse.success && billResponse.data) {
            setTableBill(billResponse.data)

            if (data.type === 'payment_completed') {
              toast.success('Payment completed by another user', {
                description: 'Bill has been updated with the new payment',
                duration: 3000
              })
            }
          }
        }
      } catch (error) {
        console.warn('Error handling payment update:', error)
      }
    }
  }, [api, tableSessionId])

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

  // Listen for table session updates
  useWebSocketEvent('table:session_updated', (data: any) => {
    if (data.tableSessionId === (tableSessionId || session?.tableSessionId)) {
      handleTableSessionUpdate({ type: 'session_updated', ...data })
    }
  }, [handleTableSessionUpdate, tableSessionId, session?.tableSessionId], 'PaymentView-session')

  // Calculate tip options based on subtotal
  const getTipOptions = (): TipOption[] => {
    let subtotal = 0

    if (paymentType === 'order' && order) {
      subtotal = order.subtotal
    } else if (paymentType === 'table_session' && tableBill) {
      subtotal = tableBill.summary.subtotal
    }

    if (subtotal === 0) return []

    return [
      { percentage: 15, label: '15%', amount: subtotal * 0.15 },
      { percentage: 18, label: '18%', amount: subtotal * 0.18 },
      { percentage: 20, label: '20%', amount: subtotal * 0.20 },
      { percentage: 25, label: '25%', amount: subtotal * 0.25 }
    ]
  }

  const getCustomTipAmount = (): number => {
    const amount = parseFloat(customTip)
    return isNaN(amount) ? 0 : amount
  }

  const getFinalTotal = (): number => {
    // For orders, use server-calculated total which already includes tip
    if (paymentType === 'order' && order) {
      return order.total  // Server already calculated: subtotal + tax + tip
    } else if (paymentType === 'table_session' && tableBill) {
      // For table sessions, still add tip locally since table bills don't use order tip system
      const tipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()
      return tableBill.summary.remainingBalance + tipAmount
    }

    return 0
  }

  const getPaymentAmount = (): number => {
    if (paymentType === 'order' && order) {
      return order.total
    } else if (paymentType === 'table_session' && tableBill) {
      return tableBill.summary.remainingBalance
    }
    return 0
  }

  // Initialize payment type from URL or session
  useEffect(() => {
    const determinePaymentType = () => {
      if (paymentTypeParam === 'split_bill') {
        setPaymentType('split_bill')
        setShowSplitBill(true)
      } else if (tableSessionId || (!orderId && SessionManager.getDiningSession())) {
        setPaymentType('table_session')
      } else if (orderId) {
        setPaymentType('order')
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

        if (paymentType === 'order' && orderId) {
          // Load individual order
          const response = await api.order.getById(orderId)
          if (response.success && response.data) {
            setOrder(transformApiOrderToLocal(response.data))
          } else {
            throw new Error('Order not found')
          }
        } else if (paymentType === 'table_session' || paymentType === 'split_bill') {
          // Load table session data
          const session = SessionManager.getDiningSession()
          const sessionId = tableSessionId || session?.tableSessionId

          if (!sessionId) {
            throw new Error('No table session found')
          }

          // Load table session users and bill
          const [usersResponse, billResponse] = await Promise.all([
            api.tableSession.getUsers(sessionId),
            api.tableSession.getBill(sessionId)
          ])

          if (usersResponse.success && usersResponse.data) {
            const sessionData = usersResponse.data
            setSessionUsers(sessionData.users || [])

            // Find current user
            const currentSessionUser = sessionData.users?.find(u =>
              u.guestSessionId === session?.sessionId
            )
            if (currentSessionUser) {
              setCurrentUser(currentSessionUser)
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
          }

          if (billResponse.success && billResponse.data) {
            setTableBill(billResponse.data)
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

    // Update tip on server for security
    if (paymentType === 'order' && orderId) {
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
    }
  }

  const handleCustomTipChange = async (value: string) => {
    setCustomTip(value)
    setSelectedTip(0)

    const tipAmount = parseFloat(value) || 0

    // Update tip on server for security (only if valid amount)
    if (paymentType === 'order' && orderId && tipAmount >= 0) {
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
    if (paymentType === 'order' && (!order || !orderId)) {
      toast.error('Order information is missing')
      return
    }

    if (paymentType === 'table_session' && (!tableBill || !tableSession)) {
      toast.error('Table session information is missing')
      return
    }

    if (selectedPaymentMethod !== PaymentMethod.CREDIT_CARD && selectedPaymentMethod !== PaymentMethod.DEBIT_CARD) {
      // Handle non-card payments differently
      await handleNonCardPayment()
      return
    }

    setProcessing(true)

    try {
      let response: any

      if (paymentType === 'order') {
        // Individual order payment - backend calculates amounts securely from Order fields
        // No need to send amounts from frontend since backend validates order.total = subtotal + tax + tip
        const paymentData = {
          paymentMethod: selectedPaymentMethod
        }

        response = await api.payment.createForOrder(orderId!, paymentData)
      } else if (paymentType === 'table_session') {
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
        setClientSecret(response.data.clientSecret)
        // Store the internal payment ID (not Stripe PaymentIntent ID) for success page
        // For table sessions, use the table session payment ID; for orders, use the order payment ID
        setPaymentId(response.data.id || response.data.paymentId)
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
    // Handle cash payments or other non-card methods
    toast.info('Cash Payment', {
      description: 'Please let your server know you will pay with cash',
      duration: 5000
    })
  }

  const handlePaymentSuccess = (stripePaymentIntentId: string) => {
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

    // Navigate to success page with internal payment ID
    const successUrl = paymentType === 'order'
      ? `/payment/success?payment=${paymentId}&restaurant=${restaurantId}&table=${tableId}`
      : `/payment/success?payment=${paymentId}&tableSession=${tableSession?.id}&restaurant=${restaurantId}&table=${tableId}`

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
    if (!paymentId || paymentType !== 'table_session') {
      toast.error('Unable to cancel payment')
      return
    }

    setCancelling(true)

    try {
      const session = SessionManager.getDiningSession()
      const sessionId = tableSessionId || session?.tableSessionId

      if (!sessionId) {
        throw new Error('No table session found')
      }

      const response = await api.tableSession.cancelPayment(sessionId, paymentId, {
        reason: 'User cancelled payment'
      })

      if (response.success) {
        toast.success('Payment Cancelled', {
          description: 'Your payment has been cancelled successfully'
        })

        // Reset payment state to allow new payment
        setClientSecret(null)
        setPaymentId(null)
        setProcessing(false)

        // Refresh the bill to show updated status
        const billResponse = await api.tableSession.getBill(sessionId)
        if (billResponse.success && billResponse.data) {
          setTableBill(billResponse.data)
        }
      } else {
        throw new Error(response.error || 'Failed to cancel payment')
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
    setShowSplitBill(true)
  }

  const handleSplitPaymentComplete = (paymentId: string) => {
    toast.success('Split payment completed successfully!')
    router.push(`/payment/success?payment=${paymentId}&tableSession=${tableSession?.id}&split=true`)
  }

  const handleBackFromSplit = () => {
    setShowSplitBill(false)
  }

  const handleBack = () => {
    if (paymentType === 'order') {
      router.push(`/order/${orderId}?restaurant=${restaurantId}&table=${tableId}`)
    } else if (paymentType === 'table_session' || paymentType === 'split_bill') {
      router.push(`/table/bill${SessionManager.getDiningQueryParams()}`)
    } else {
      router.back()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="text-content-secondary">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (error || (paymentType === 'order' && !order) || ((paymentType === 'table_session' || paymentType === 'split_bill') && (!tableBill || !tableSession))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
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
                {paymentType === 'order' && order ? (
                  `Order #${order.orderNumber}`
                ) : paymentType === 'table_session' ? (
                  'Table Session Payment'
                ) : (
                  'Split Bill Payment'
                )}
              </p>
              {paymentType !== 'order' && tableBill && (
                <p className="text-xs text-content-secondary">
                  Remaining: ${tableBill.summary.remainingBalance.toFixed(2)} of ${tableBill.summary.grandTotal.toFixed(2)}
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
                  <Receipt className="w-5 h-5" />
                  <span>{paymentType === 'order' ? 'Order Summary' : 'Bill Summary'}</span>
                </h3>
                {paymentType === 'table_session' && sessionUsers.length > 1 && (
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

              {paymentType === 'order' && order ? (
                <>
                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-medium text-content-primary">{item.name}</h4>
                          <p className="text-sm text-content-secondary">
                            ${item.unitPrice.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="font-semibold text-content-primary">
                          ${item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-content-secondary">
                      <span>Subtotal</span>
                      <span>${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-content-secondary">
                      <span>Tax</span>
                      <span>${order.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-content-primary border-t pt-2">
                      <span>Order Total</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : paymentType === 'table_session' && tableBill ? (
                <>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-content-secondary">
                      <Users className="w-4 h-4" />
                      <span>{sessionUsers.length} people dining</span>
                    </div>

                    {Object.values(tableBill.billByRound)
                      .filter((round) => round.orders.some((order) => !order.isPaid)) // Only show rounds with unpaid orders
                      .map((round) => (
                        <div key={round.roundNumber} className="border rounded-lg p-3">
                          <h4 className="font-medium text-content-primary mb-2">
                            Round {round.roundNumber}
                            <span className="text-xs text-content-secondary ml-2">
                              (Unpaid items only)
                            </span>
                          </h4>
                          {round.orders
                            .filter((order) => !order.isPaid) // Only show unpaid orders
                            .map((roundOrder) => (
                              <div key={roundOrder.orderId} className="space-y-1">
                                <div className="text-xs text-content-tertiary mb-1">
                                  Order by {roundOrder.placedBy || 'Guest'}
                                </div>
                                {roundOrder.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="text-content-secondary">
                                      {item.quantity}x {item.name}
                                    </span>
                                    <span className="text-content-primary">
                                      ${Number(item.subtotal || 0).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))}
                        </div>
                      ))}

                    {/* Show message if all orders are paid */}
                    {Object.values(tableBill.billByRound).every((round) =>
                      round.orders.every((order) => order.isPaid)
                    ) && (
                      <div className="text-center py-4 text-content-secondary bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl mb-2">✅</div>
                        <p className="font-medium">All orders have been paid!</p>
                        <p className="text-sm">Thank you for dining with us.</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-content-secondary">
                      <span>Subtotal</span>
                      <span>${tableBill.summary.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-content-secondary">
                      <span>Tax</span>
                      <span>${tableBill.summary.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-content-secondary">
                      <span>Total</span>
                      <span>${tableBill.summary.grandTotal.toFixed(2)}</span>
                    </div>
                    {tableBill.summary.totalPaid > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Already Paid</span>
                        <span>-${tableBill.summary.totalPaid.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-content-primary border-t pt-2">
                      <span>Amount Due</span>
                      <span>${tableBill.summary.remainingBalance.toFixed(2)}</span>
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
                {tipOptions.map((tip) => (
                  <Button
                    key={tip.percentage}
                    variant={selectedTip === tip.amount ? 'default' : 'outline'}
                    onClick={() => handleTipSelection(tip.amount)}
                    className="h-12 flex-col"
                    disabled={processing}
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
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    placeholder="Custom tip amount"
                    className="flex-1 p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    min="0"
                    step="0.01"
                    disabled={processing}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTip(0)
                    setCustomTip('')
                  }}
                  className="w-full"
                  disabled={processing}
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
                  disabled={processing}
                >
                  <CreditCard className="w-6 h-6 mb-1" />
                  <span className="text-sm">Card</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.MOBILE_PAYMENT ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod(PaymentMethod.MOBILE_PAYMENT)}
                  className="h-16 flex-col"
                  disabled={processing}
                >
                  <Smartphone className="w-6 h-6 mb-1" />
                  <span className="text-sm">Apple Pay</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.CASH ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod('CASH' as PaymentMethod)}
                  className="h-16 flex-col"
                  disabled={processing}
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
                          processing={processing}
                          setProcessing={setProcessing}
                          disabled={false}
                          clientSecret={clientSecret}
                        />
                      </StripeProvider>

                      {/* Show cancel button for table session payments */}
                      {paymentType === 'table_session' && paymentId && (
                        <Button
                          onClick={handlePaymentCancel}
                          variant="outline"
                          size="sm"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          disabled={cancelling || processing}
                        >
                          {cancelling ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
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
                          {paymentType === 'table_session' && (
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
                          disabled={processing}
                        >
                          {processing ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Preparing Payment...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <CreditCard className="w-4 h-4" />
                              <span>Initialize Payment</span>
                            </div>
                          )}
                        </Button>

                        {/* Show cancel button for table session payments when payment is initialized */}
                        {paymentType === 'table_session' && clientSecret && paymentId && (
                          <Button
                            onClick={handlePaymentCancel}
                            variant="outline"
                            size="lg"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            disabled={cancelling || processing}
                          >
                            {cancelling ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
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

              {selectedPaymentMethod === PaymentMethod.CASH && (
                <div className="mt-4 p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-status-warning">
                    <Info className="w-4 h-4" />
                    <span>
                      Please let your server know you'll be paying with cash
                    </span>
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
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-content-secondary">
                  <span>{paymentType === 'order' ? 'Order Total' : 'Amount Due'}</span>
                  <span>${getPaymentAmount().toFixed(2)}</span>
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
                    <span>${getFinalTotal().toFixed(2)}</span>
                  </div>
                </div>

                {paymentType === 'table_session' && sessionUsers.length > 1 && (
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
              {selectedPaymentMethod === PaymentMethod.CASH && (
                <Button
                  onClick={handleNonCardPayment}
                  size="lg"
                  className="w-full"
                  disabled={processing}
                >
                  <div className="flex items-center space-x-2">
                    <Banknote className="w-4 h-4" />
                    <span>Notify Server - Cash Payment</span>
                  </div>
                </Button>
              )}

              {selectedPaymentMethod === PaymentMethod.MOBILE_PAYMENT && (
                <Button
                  onClick={createPaymentIntent}
                  size="lg"
                  className="w-full"
                  disabled={processing}
                >
                  {processing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Preparing...</span>
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