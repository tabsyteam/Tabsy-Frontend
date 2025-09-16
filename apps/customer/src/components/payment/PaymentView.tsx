'use client'

import { useEffect, useState } from 'react'
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
  Banknote
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { PaymentMethod } from '@tabsy/shared-types'

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

export function PaymentView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedTip, setSelectedTip] = useState<number>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CARD)
  const [error, setError] = useState<string | null>(null)

  const orderId = searchParams.get('order')
  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  // Calculate tip options based on subtotal
  const getTipOptions = (): TipOption[] => {
    if (!order) return []

    const subtotal = order.subtotal
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
    if (!order) return 0
    const tipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()
    return order.total + tipAmount
  }

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('Order ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await api.order.getById(orderId)

        if (response.success && response.data) {
          setOrder(transformApiOrderToLocal(response.data))
        } else {
          throw new Error(
            typeof response.error === 'string'
              ? response.error
              : response.error?.message || 'Order not found'
          )
        }
      } catch (err: any) {
        console.error('Failed to load order:', err)
        setError(err?.response?.status === 404 ? 'Order not found' : 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, api])

  const handleTipSelection = (amount: number) => {
    setSelectedTip(amount)
    setCustomTip('')
  }

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value)
    setSelectedTip(0)
  }

  const handlePayment = async () => {
    if (!order || !orderId) {
      toast.error('Order information is missing')
      return
    }

    setProcessing(true)

    try {
      const tipAmount = selectedTip > 0 ? selectedTip : getCustomTipAmount()
      const finalAmount = order.total + tipAmount

      // Create payment intent
      const paymentData = {
        orderId,
        amount: finalAmount,
        currency: 'usd',
        paymentMethod: selectedPaymentMethod
      }

      const response = await api.payment.createForOrder(orderId, paymentData)

      if (response.success && response.data) {
        // Add tip if there's one
        if (tipAmount > 0) {
          await api.payment.addTip(response.data.id, tipAmount)
        }

        toast.success('Payment processed successfully!', {
          description: 'Thank you for your payment',
          duration: 4000
        })

        // Navigate to success page
        router.push(`/payment/success?payment=${response.data.id}&restaurant=${restaurantId}&table=${tableId}`)
      } else {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Payment failed'
        )
      }
    } catch (error: any) {
      console.error('Payment error:', error)

      let errorMessage = 'Payment failed. Please try again.'

      if (error?.response?.status === 400) {
        errorMessage = 'Invalid payment details. Please check and try again.'
      } else if (error?.response?.status === 402) {
        errorMessage = 'Payment declined. Please try a different payment method.'
      }

      toast.error('Payment Failed', {
        description: errorMessage
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleBack = () => {
    router.push(`/order/${orderId}?restaurant=${restaurantId}&table=${tableId}`)
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

  if (error || !order) {
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
              {error}
            </p>
          </div>
          <Button onClick={() => router.back()} className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const tipOptions = getTipOptions()

  return (
    <div className="min-h-screen bg-background">
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
                Order #{order.orderNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Order Summary</span>
              </h3>

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
                    className="flex-1 p-3 border border-border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
                  variant={selectedPaymentMethod === PaymentMethod.CARD ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod(PaymentMethod.CARD)}
                  className="h-16 flex-col"
                  disabled={processing}
                >
                  <CreditCard className="w-6 h-6 mb-1" />
                  <span className="text-sm">Card</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.DIGITAL_WALLET ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod(PaymentMethod.DIGITAL_WALLET)}
                  className="h-16 flex-col"
                  disabled={processing}
                >
                  <Smartphone className="w-6 h-6 mb-1" />
                  <span className="text-sm">Apple Pay</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === PaymentMethod.CASH ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod(PaymentMethod.CASH)}
                  className="h-16 flex-col"
                  disabled={processing}
                >
                  <Banknote className="w-6 h-6 mb-1" />
                  <span className="text-sm">Cash</span>
                </Button>
              </div>

              {selectedPaymentMethod === PaymentMethod.CASH && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-yellow-800">
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
                  <span>Order Total</span>
                  <span>${order.total.toFixed(2)}</span>
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
              </div>

              <Button
                onClick={handlePayment}
                size="lg"
                className="w-full"
                disabled={processing}
              >
                {processing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ${getFinalTotal().toFixed(2)}</span>
                  </div>
                )}
              </Button>

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