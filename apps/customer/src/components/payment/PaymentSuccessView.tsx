'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  CheckCircle,
  Download,
  Mail,
  Star,
  MessageCircle,
  ArrowRight,
  Receipt,
  Home,
  Utensils,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { SessionManager } from '@/lib/session'
import type { Payment, PaymentMethod, PaymentStatus, Order, TableSessionBill } from '@tabsy/shared-types'

interface EnhancedPayment extends Payment {
  order?: Order
  tableBill?: TableSessionBill
  splitInfo?: {
    totalParticipants: number
    userAmount: number
    isComplete: boolean
  }
}

// Transform API payment response to local Payment interface
const transformApiPaymentToLocal = (apiPayment: any): Payment => ({
  id: apiPayment.id,
  orderId: apiPayment.orderId,
  amount: apiPayment.amount,
  totalAmount: apiPayment.amount, // Keep both for compatibility
  tip: apiPayment.tipAmount,
  tipAmount: apiPayment.tipAmount, // Keep both for compatibility
  status: apiPayment.status,
  paymentMethod: apiPayment.method,
  method: apiPayment.method, // Keep both for compatibility
  createdAt: apiPayment.createdAt
})

export function PaymentSuccessView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()

  const [payment, setPayment] = useState<EnhancedPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [showDetailedReceipt, setShowDetailedReceipt] = useState(false)
  const [sessionRestored, setSessionRestored] = useState(false)

  const paymentId = searchParams.get('payment')
  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')
  const tableSessionId = searchParams.get('tableSession')
  const isSplit = searchParams.get('split') === 'true'
  const guestSessionId = searchParams.get('guestSession')

  // Restore guest session before making any API calls
  useEffect(() => {
    const restoreSession = () => {
      // Try to get session from URL params first
      if (guestSessionId) {
        console.log('PaymentSuccessView: Restoring guest session from URL:', guestSessionId)
        api.setGuestSession(guestSessionId)
        setSessionRestored(true)
        return
      }

      // Try to get session from existing dining session
      const diningSession = SessionManager.getDiningSession()
      if (diningSession?.sessionId) {
        console.log('PaymentSuccessView: Restoring guest session from dining session:', diningSession.sessionId)
        api.setGuestSession(diningSession.sessionId)
        setSessionRestored(true)
        return
      }

      // Try to get session from stored session storage
      const storedSessionId = sessionStorage.getItem('tabsy-guest-session-id')
      if (storedSessionId) {
        console.log('PaymentSuccessView: Restoring guest session from storage:', storedSessionId)
        api.setGuestSession(storedSessionId)
        setSessionRestored(true)
        return
      }

      console.log('PaymentSuccessView: No guest session found, proceeding without session')
      setSessionRestored(true)
    }

    restoreSession()
  }, [api, guestSessionId])

  useEffect(() => {
    // Only load payment after session is restored
    if (!sessionRestored) return

    const loadPayment = async () => {
      if (!paymentId) {
        toast.error('Payment ID is missing')
        router.push('/')
        return
      }

      try {
        setLoading(true)
        let response: any
        let fallbackUsed = false

        try {
          // Try authenticated endpoint first
          response = await api.payment.getById(paymentId)
        } catch (authError: any) {
          // If authentication fails, try public endpoint as fallback
          if (authError?.status === 401 || authError?.message?.includes('Unauthorized')) {
            console.log('Authentication failed, trying public endpoint as fallback')
            response = await api.payment.getPublicDetails(paymentId)
            fallbackUsed = true
          } else {
            throw authError
          }
        }

        if (response.success && response.data) {
          const paymentData = transformApiPaymentToLocal(response.data)
          const enhancedPayment: EnhancedPayment = { ...paymentData }

          // Load additional order details if available (skip if using fallback due to auth issues)
          if (paymentData.orderId && !fallbackUsed) {
            try {
              const orderResponse = await api.order.getById(paymentData.orderId)
              if (orderResponse.success && orderResponse.data) {
                enhancedPayment.order = orderResponse.data
              }
            } catch (orderError) {
              console.warn('Could not load order details:', orderError)
            }
          }

          // Load table session bill if available (skip if using fallback due to auth issues)
          if (tableSessionId && !fallbackUsed) {
            try {
              const billResponse = await api.tableSession.getBill(tableSessionId)
              if (billResponse.success && billResponse.data) {
                enhancedPayment.tableBill = billResponse.data
              }
            } catch (billError) {
              console.warn('Could not load table session bill:', billError)
            }
          }

          // Add split payment info if applicable
          if (isSplit) {
            // Get actual participant count from payment metadata or table session
            let totalParticipants = 1 // Default for individual payment

            if (paymentData.metadata?.splitPayment) {
              totalParticipants = paymentData.metadata.splitPayment.totalParticipants || 1
            } else if (enhancedPayment.tableBill && enhancedPayment.tableBill.guestSessions) {
              // Use actual number of users in table session
              totalParticipants = enhancedPayment.tableBill.guestSessions.length
            }

            enhancedPayment.splitInfo = {
              totalParticipants,
              userAmount: paymentData.amount,
              isComplete: true
            }
          }

          setPayment(enhancedPayment)

          if (fallbackUsed) {
            console.log('Payment loaded successfully using public endpoint fallback')
          }
        } else {
          throw new Error('Payment not found')
        }
      } catch (error) {
        console.error('Failed to load payment:', error)
        toast.error('Failed to load payment details')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    loadPayment()
  }, [paymentId, tableSessionId, isSplit, api, router, sessionRestored])

  const generateDetailedReceipt = () => {
    if (!payment) return ''

    const date = new Date(payment.createdAt).toLocaleDateString()
    const time = new Date(payment.createdAt).toLocaleTimeString()

    let receiptContent = `
=====================================
           TABSY RECEIPT
=====================================

Date: ${date}
Time: ${time}
${tableId ? `Table: ${tableId}` : ''}
${payment.transactionId ? `Transaction ID: ${payment.transactionId}` : ''}

=====================================
`

    // Add split payment info if applicable
    if (payment.splitInfo) {
      receiptContent += `
SPLIT PAYMENT
Your portion: $${Number(payment.splitInfo.userAmount || 0).toFixed(2)}
Total participants: ${payment.splitInfo.totalParticipants}

=====================================
`
    }

    // Add order items if available
    if (payment.order?.items) {
      receiptContent += `
ORDER DETAILS
-------------------------------------
`
      payment.order.items.forEach((item: any) => {
        receiptContent += `
${item.quantity}x ${item.menuItem?.name || item.name}
   $${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
`
        if (item.customizations?.length) {
          item.customizations.forEach((custom: any) => {
            receiptContent += `   + ${custom.name} (+$${Number(custom.price || 0).toFixed(2)})\n`
          })
        }
      })
      receiptContent += `
-------------------------------------
Subtotal: $${Number(payment.order.subtotal || 0).toFixed(2)}
Tax: $${Number(payment.order.tax || 0).toFixed(2)}
`
    }

    receiptContent += `
-------------------------------------
Payment Method: ${payment.method}
Amount Paid: $${Number(payment.totalAmount || 0).toFixed(2)}
${payment.tipAmount ? `Tip: $${Number(payment.tipAmount || 0).toFixed(2)}` : ''}

TOTAL: $${(Number(payment.totalAmount || 0) + Number(payment.tipAmount || 0)).toFixed(2)}

=====================================
    Thank you for dining with us!
         Powered by Tabsy
=====================================
`

    return receiptContent
  }

  const handleDownloadReceipt = async () => {
    if (!paymentId) return

    try {
      setDownloadingReceipt(true)

      let receiptData = null
      let fallbackUsed = false

      try {
        // Try authenticated endpoint first
        const response = await api.payment.getReceipt(paymentId)
        if (response.success && response.data) {
          receiptData = response.data
        }
      } catch (authError: any) {
        // If authentication fails, generate receipt from available payment data
        if (authError?.status === 401 || authError?.message?.includes('Unauthorized')) {
          console.log('Authentication failed for receipt, generating from payment data')
          fallbackUsed = true
        } else {
          throw authError
        }
      }

      if (receiptData?.receiptUrl && !fallbackUsed) {
        // If backend provides URL, open it
        window.open(receiptData.receiptUrl, '_blank')
      } else {
        // Create a detailed receipt and trigger download
        const receiptContent = generateDetailedReceipt()

        if (!receiptContent || receiptContent.trim().length === 0) {
          throw new Error('Unable to generate receipt content')
        }

        const blob = new Blob([receiptContent], { type: 'text/plain' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `tabsy-receipt-${payment?.id || paymentId}.txt`
        link.click()
        window.URL.revokeObjectURL(url)
      }

      const successMessage = fallbackUsed
        ? 'Receipt downloaded successfully (generated from payment data)'
        : 'Receipt downloaded successfully'
      toast.success(successMessage)

    } catch (error) {
      console.error('Failed to download receipt:', error)
      toast.error('Failed to download receipt. Please try again later.')
    } finally {
      setDownloadingReceipt(false)
    }
  }

  const handleLeaveFeedback = () => {
    const currentGuestSessionId = api.getGuestSessionId()
    const baseUrl = '/feedback'
    const params = new URLSearchParams()

    // Add restaurant and table info
    if (restaurantId) params.set('restaurant', restaurantId)
    if (tableId) params.set('table', tableId)

    // Add guest session for authentication
    if (currentGuestSessionId) params.set('guestSession', currentGuestSessionId)

    // Prefer table session for group dining feedback, fall back to individual order
    if (tableSessionId) {
      // For group dining - feedback will be associated with the table session
      // This allows feedback for the entire dining experience including multiple orders
      params.set('tableSession', tableSessionId)
      console.log('PaymentSuccessView: Leaving feedback for table session (group dining):', tableSessionId)
    } else if (payment?.orderId) {
      // For individual order feedback
      params.set('order', payment.orderId)
      console.log('PaymentSuccessView: Leaving feedback for individual order:', payment.orderId)
    }

    const feedbackUrl = `${baseUrl}?${params.toString()}`
    router.push(feedbackUrl)
  }

  const handleBackToHome = () => {
    const currentGuestSessionId = api.getGuestSessionId()

    if (tableSessionId) {
      const session = SessionManager.getDiningSession()
      if (session) {
        // Preserve guest session in query params for navigation
        const queryParams = SessionManager.getDiningQueryParams()
        const guestParam = currentGuestSessionId ? `&guestSession=${currentGuestSessionId}` : ''
        router.push(`/table${queryParams}${guestParam}`)
      } else {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }

  const handleOrderAgain = () => {
    const currentGuestSessionId = api.getGuestSessionId()

    if (restaurantId && tableId) {
      // Simply navigate to menu page - let backend handle session management
      const guestParam = currentGuestSessionId ? `&guestSession=${currentGuestSessionId}` : ''
      router.push(`/menu?restaurant=${restaurantId}&table=${tableId}${guestParam}`)
    } else {
      router.push('/')
    }
  }

  const handleViewDetailedReceipt = () => {
    setShowDetailedReceipt(!showDetailedReceipt)
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

  if (!payment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-status-error/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-status-error" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Payment Not Found
            </h1>
            <p className="text-content-secondary">
              Unable to find payment details
            </p>
          </div>
          <Button onClick={handleBackToHome} className="w-full">
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2
          }}
          className="text-center mb-8"
        >
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-status-success/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-status-success" />
            </div>

            {/* Confetti animation */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  rotate: [0, 180, 360],
                  x: [0, Math.cos(i * 45 * Math.PI / 180) * 100],
                  y: [0, Math.sin(i * 45 * Math.PI / 180) * 100]
                }}
                transition={{
                  duration: 2,
                  delay: 0.5 + i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute top-12 left-1/2 w-2 h-2 bg-accent rounded-full"
                style={{ transformOrigin: '50% 50%' }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-content-primary mb-2">
              Payment Successful!
            </h1>
            <p className="text-content-secondary text-lg">
              {payment?.tableBill
                ? "Your table session payment was processed successfully"
                : "Thank you for dining with us"
              }
            </p>
          </motion.div>
        </motion.div>

        {/* Payment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-surface rounded-xl border p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Payment Details</span>
            </h3>
            {(payment.tableBill || payment.order?.items) && (
              <Button
                onClick={handleViewDetailedReceipt}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                {showDetailedReceipt ? 'Hide Details' : 'Show Details'}
              </Button>
            )}
          </div>

          {/* Split Payment Banner */}
          {payment.splitInfo && (
            <div className="mb-4 p-3 bg-status-info/10 border border-status-info/20 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <Users className="w-4 h-4 text-status-info" />
                <span className="text-status-info font-medium">
                  Split Payment - Your portion of ${payment.splitInfo.totalParticipants} people
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {payment.tableBill ? (
              // For Table Session Payments - Show Session Details
              <>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Table Session</span>
                  <span className="font-medium text-content-primary">#{payment.tableBill.sessionCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Table</span>
                  <span className="font-medium text-content-primary">Table {tableId}</span>
                </div>
              </>
            ) : payment.orderId && (
              // For Individual Order Payments - Show Order ID
              <div className="flex justify-between">
                <span className="text-content-secondary">Order</span>
                <span className="font-medium text-content-primary">#{payment.orderId}</span>
              </div>
            )}

            {/* For Table Session - Show Table Bill Summary */}
            {payment.tableBill ? (
              <>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Subtotal</span>
                  <span className="font-medium text-content-primary">${payment.tableBill.summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Tax</span>
                  <span className="font-medium text-content-primary">${payment.tableBill.summary.tax.toFixed(2)}</span>
                </div>
                {payment.tableBill.summary.tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-content-secondary">Tip</span>
                    <span className="font-medium text-content-primary">${payment.tableBill.summary.tip.toFixed(2)}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* For Individual Order - Show Order Amount */}
                <div className="flex justify-between">
                  <span className="text-content-secondary">Amount</span>
                  <span className="font-medium text-content-primary">${(() => {
                    if (payment.order) {
                      const subtotal = Number(payment.order.subtotal || 0);
                      const tax = Number(payment.order.tax || 0);
                      return (subtotal + tax).toFixed(2);
                    } else {
                      // Use payment amount without trying to derive tip
                      return Number(payment.amount || payment.totalAmount || 0).toFixed(2);
                    }
                  })()}</span>
                </div>

                {/* Only show tip if explicitly provided by backend and > 0 */}
                {payment.tipAmount && Number(payment.tipAmount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-content-secondary">Tip</span>
                    <span className="font-medium text-content-primary">${Number(payment.tipAmount).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between">
              <span className="text-content-secondary">Payment Method</span>
              <span className="font-medium text-content-primary">{payment.method}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-content-secondary">Date</span>
              <span className="font-medium text-content-primary">
                {new Date(payment.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-content-primary">Total Paid</span>
                <span className="text-content-primary">
                  ${(() => {
                    // Always show the actual payment amount that was just processed
                    // Don't rely on tableBill.summary.totalPaid as it may not be updated yet
                    // since payment might still be in PROCESSING status
                    return Number(payment.amount || payment.totalAmount || 0).toFixed(2);
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Receipt with Slide Animation */}
          <AnimatePresence>
            {showDetailedReceipt && (
              <motion.div
                initial={{
                  height: 0,
                  opacity: 0,
                  marginTop: 0
                }}
                animate={{
                  height: "auto",
                  opacity: 1,
                  marginTop: 24
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  marginTop: 0
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0.0, 0.2, 1], // Custom bezier curve for smooth professional feel
                  opacity: { duration: 0.3 },
                }}
                style={{ overflow: "hidden" }}
                className="bg-surface-secondary rounded-lg border border-border-secondary"
              >
                <div className="p-4">
                  {payment.tableBill ? (
                    // Table Session Bill Details
                    <div>
                      <h4 className="font-medium text-content-primary mb-3">Table Session Orders</h4>
                      <div className="space-y-4">
                        {Object.entries(payment.tableBill.billByRound).map(([roundNum, round]) => (
                          <div key={roundNum}>
                            <h5 className="text-sm font-medium text-content-primary mb-2">Round {roundNum}</h5>
                            <div className="space-y-2">
                              {round.orders.map(order => (
                                <div key={order.orderId} className="border border-border-secondary/50 rounded p-2">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-medium text-content-primary">
                                      Order #{order.orderNumber} by {order.placedBy}
                                    </span>
                                    <span className="text-xs font-medium text-content-primary">
                                      ${Number(order.total || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {order.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-xs text-content-secondary">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>${Number(item.subtotal || 0).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-border-secondary">
                              <span>Round {roundNum} Total</span>
                              <span>${round.roundTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border-secondary space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-content-secondary">Subtotal</span>
                          <span className="text-content-primary">${payment.tableBill.summary.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-content-secondary">Tax</span>
                          <span className="text-content-primary">${payment.tableBill.summary.tax.toFixed(2)}</span>
                        </div>
                        {payment.tableBill.summary.tip > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-content-secondary">Tip</span>
                            <span className="text-content-primary">${payment.tableBill.summary.tip.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Grand Total</span>
                          <span>${payment.tableBill.summary.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : payment.order?.items && (
                    // Individual Order Details (fallback)
                    <div>
                      <h4 className="font-medium text-content-primary mb-3">Order Items</h4>
                      <div className="space-y-2">
                        {payment.order.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-content-primary">
                                {item.quantity}x {item.menuItem?.name || item.name}
                              </div>
                              {item.customizations?.length > 0 && (
                                <div className="text-xs text-content-secondary mt-1">
                                  {item.customizations.map((custom: any, idx: number) => (
                                    <div key={idx}>+ {custom.name} (+${Number(custom.price || 0).toFixed(2)})</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-medium text-content-primary">
                              ${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border-secondary space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-content-secondary">Subtotal</span>
                          <span className="text-content-primary">${Number(payment.order.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-content-secondary">Tax</span>
                          <span className="text-content-primary">${Number(payment.order.tax || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="space-y-4"
        >
          {/* Primary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handleDownloadReceipt}
              variant="outline"
              size="lg"
              className="flex items-center justify-center space-x-2"
              disabled={downloadingReceipt}
            >
              {downloadingReceipt ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download Receipt</span>
            </Button>

            <Button
              onClick={handleLeaveFeedback}
              size="lg"
              className="flex items-center justify-center space-x-2"
            >
              <Star className="w-4 h-4" />
              <span>Leave Feedback</span>
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handleOrderAgain}
              variant="outline"
              size="lg"
              className="flex items-center justify-center space-x-2"
            >
              <Utensils className="w-4 h-4" />
              <span>Order Again</span>
            </Button>

            <Button
              onClick={handleBackToHome}
              variant="outline"
              size="lg"
              className="flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>
        </motion.div>

        {/* Thank You Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20"
        >
          <h3 className="font-semibold text-content-primary mb-2">
            We hope you enjoyed your meal!
          </h3>
          <p className="text-content-secondary text-sm">
            Your feedback helps us serve you better. Thank you for choosing Tabsy for your dining experience.
          </p>
        </motion.div>
      </div>
    </div>
  )
}