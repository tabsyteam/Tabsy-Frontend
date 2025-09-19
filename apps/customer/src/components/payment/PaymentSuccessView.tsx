'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
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
  Utensils
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'

interface Payment {
  id: string
  orderId: string
  amount: number
  tip?: number
  status: string
  paymentMethod: string
  createdAt: string
}

// Transform API payment response to local Payment interface
const transformApiPaymentToLocal = (apiPayment: any): Payment => ({
  id: apiPayment.id,
  orderId: apiPayment.orderId,
  amount: apiPayment.amount,
  tip: apiPayment.tipAmount,
  status: apiPayment.status,
  paymentMethod: apiPayment.method,
  createdAt: apiPayment.createdAt
})

export function PaymentSuccessView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)

  const paymentId = searchParams.get('payment')
  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  useEffect(() => {
    const loadPayment = async () => {
      if (!paymentId) {
        toast.error('Payment ID is missing')
        router.push('/')
        return
      }

      try {
        setLoading(true)
        const response = await api.payment.getById(paymentId)

        if (response.success && response.data) {
          setPayment(transformApiPaymentToLocal(response.data))
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
  }, [paymentId, api, router])

  const handleDownloadReceipt = async () => {
    if (!paymentId) return

    try {
      setDownloadingReceipt(true)
      const response = await api.payment.getReceipt(paymentId)

      if (response.success && response.data) {
        // Create a download link for the receipt
        const receiptData = response.data
        if (receiptData.receiptUrl) {
          // If backend provides URL, open it
          window.open(receiptData.receiptUrl, '_blank')
        } else {
          // Create a simple receipt and trigger download
          const receiptContent = `
TABSY RECEIPT
Order: ${payment?.orderId}
Amount: $${payment?.amount.toFixed(2)}
${payment?.tip ? `Tip: $${payment.tip.toFixed(2)}` : ''}
Date: ${new Date(payment?.createdAt || '').toLocaleDateString()}
          `

          const blob = new Blob([receiptContent], { type: 'text/plain' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `tabsy-receipt-${payment?.orderId}.txt`
          link.click()
          window.URL.revokeObjectURL(url)
        }

        toast.success('Receipt downloaded successfully')
      }
    } catch (error) {
      console.error('Failed to download receipt:', error)
      toast.error('Failed to download receipt')
    } finally {
      setDownloadingReceipt(false)
    }
  }

  const handleLeaveFeedback = () => {
    router.push(`/feedback?order=${payment?.orderId}&restaurant=${restaurantId}&table=${tableId}`)
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  const handleOrderAgain = () => {
    router.push(`/menu?restaurant=${restaurantId}&table=${tableId}`)
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
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-red-600" />
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
            <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
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
              Thank you for dining with us
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
          <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
            <Receipt className="w-5 h-5" />
            <span>Payment Details</span>
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-content-secondary">Order</span>
              <span className="font-medium text-content-primary">#{payment.orderId}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-content-secondary">Amount</span>
              <span className="font-medium text-content-primary">${payment.amount.toFixed(2)}</span>
            </div>

            {payment.tip && payment.tip > 0 && (
              <div className="flex justify-between">
                <span className="text-content-secondary">Tip</span>
                <span className="font-medium text-content-primary">${payment.tip.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-content-secondary">Payment Method</span>
              <span className="font-medium text-content-primary">{payment.paymentMethod}</span>
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
                  ${(payment.amount + (payment.tip || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
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