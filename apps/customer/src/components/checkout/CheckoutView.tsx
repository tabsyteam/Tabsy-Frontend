'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import { ArrowLeft, Clock, CheckCircle, User, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'

interface CartItem {
  id: string
  name: string
  description: string
  basePrice: number
  imageUrl?: string
  categoryName: string
  quantity: number
  customizations?: Record<string, any>
}

interface GuestInfo {
  name: string
  phone: string
  email: string
}

export function CheckoutView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()

  const [cart, setCart] = useState<CartItem[]>([])
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    name: '',
    phone: '',
    email: ''
  })
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<number>(20)

  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  useEffect(() => {
    // Load cart from sessionStorage
    const savedCart = sessionStorage.getItem('tabsy-cart')
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart)
        setCart(cartData)

        // Calculate estimated time based on cart size
        const baseTime = 15
        const timePerItem = cartData.reduce((total: number, item: CartItem) => total + item.quantity, 0) * 2
        setEstimatedTime(Math.min(baseTime + timePerItem, 45))
      } catch (error) {
        console.error('Failed to parse cart:', error)
        toast.error('Failed to load cart')
        router.push('/cart')
        return
      }
    } else {
      toast.error('Cart is empty')
      router.push('/cart')
      return
    }

    // Load special instructions
    const savedInstructions = sessionStorage.getItem('tabsy-special-instructions')
    if (savedInstructions) {
      setSpecialInstructions(savedInstructions)
    }

    setLoading(false)
  }, [router])

  const getSubtotal = (): number => {
    return cart.reduce((total, item) => total + (Number(item.basePrice) * item.quantity), 0)
  }

  const getTax = (): number => {
    return getSubtotal() * 0.08 // 8% tax
  }

  const getTotal = (): number => {
    return getSubtotal() + getTax()
  }

  const getTotalItems = (): number => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    // Validate guest info (name is required for orders)
    if (!guestInfo.name.trim()) {
      toast.error('Please enter your name')
      return
    }

    setPlacing(true)

    try {
      // Get session from sessionStorage
      const sessionData = sessionStorage.getItem('tabsy-session')
      if (!sessionData) {
        toast.error('Session expired. Please scan the QR code again.')
        router.push('/')
        return
      }

      const session = JSON.parse(sessionData)

      // Prepare order data according to backend OrderRequest type
      const orderData = {
        restaurantId: restaurantId!,
        tableId: tableId!,
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          options: item.customizations ? Object.entries(item.customizations).map(([optionId, valueId]) => ({
            optionId,
            valueId: String(valueId)
          })) : undefined,
          specialInstructions: undefined
        })),
        specialInstructions: specialInstructions.trim() || undefined,
        customerName: guestInfo.name.trim() || undefined,
        customerPhone: guestInfo.phone.trim() || undefined,
        customerEmail: guestInfo.email.trim() || undefined
      }

      // Clean up undefined fields to avoid validation issues
      const cleanOrderData = JSON.parse(JSON.stringify(orderData, (key, value) => {
        return value === undefined ? undefined : value;
      }))

      // Place the order
      const response = await api.order.create(cleanOrderData)

      if (response.success && response.data) {
        // Clear cart and instructions from sessionStorage
        sessionStorage.removeItem('tabsy-cart')
        sessionStorage.removeItem('tabsy-special-instructions')

        // Store order info for tracking
        sessionStorage.setItem('tabsy-current-order', JSON.stringify(response.data))

        toast.success('Order placed successfully!', {
          description: `Order #${response.data.orderNumber} has been sent to the kitchen`,
          duration: 4000
        })

        // Navigate to order tracking
        router.push(`/order/${response.data.id}?restaurant=${restaurantId}&table=${tableId}`)
      } else {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to place order'
        )
      }
    } catch (error: any) {
      console.error('Order placement error:', error)

      let errorMessage = 'Failed to place order. Please try again.'

      if (error?.response?.status === 400) {
        errorMessage = 'Invalid order data. Please check your cart and try again.'
      } else if (error?.response?.status === 403) {
        errorMessage = 'Session expired. Please scan the QR code again.'
        setTimeout(() => router.push('/'), 2000)
      }

      toast.error('Order Failed', {
        description: errorMessage
      })
    } finally {
      setPlacing(false)
    }
  }

  const handleBack = () => {
    router.push(`/cart?restaurant=${restaurantId}&table=${tableId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

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
              disabled={placing}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Review Order</h1>
              <p className="text-sm text-content-tertiary">
                {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details & Guest Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Guest Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your name"
                    className="w-full p-3 border border-border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="w-full p-3 border border-border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-content-primary mb-2">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full p-3 border border-border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <p className="text-xs text-content-tertiary mt-3">
                * Required field. Phone and email are optional but helpful for order updates.
              </p>
            </motion.div>

            {/* Order Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4">
                Order Items
              </h3>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-3 border-b last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium text-content-primary">{item.name}</h4>
                      <p className="text-sm text-content-secondary">{item.categoryName}</p>
                      <div className="flex items-center space-x-2 text-sm text-content-tertiary">
                        <span>${Number(item.basePrice).toFixed(2)} each</span>
                        <span>•</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-content-primary">
                        ${(Number(item.basePrice) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Special Instructions */}
            {specialInstructions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface rounded-xl border p-6"
              >
                <h3 className="text-lg font-semibold text-content-primary mb-3">
                  Special Instructions
                </h3>
                <p className="text-content-secondary bg-gray-50 p-3 rounded-lg">
                  {specialInstructions}
                </p>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface rounded-xl border p-6 sticky top-24"
            >
              <h3 className="text-xl font-semibold text-content-primary mb-6">
                Order Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-content-secondary">
                  <span>Subtotal ({getTotalItems()} items)</span>
                  <span>${getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-content-secondary">
                  <span>Tax</span>
                  <span>${getTax().toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold text-content-primary">
                    <span>Total</span>
                    <span>${getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Estimated Time */}
              <div className="bg-primary/5 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-content-primary">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Estimated prep time: {estimatedTime} minutes
                  </span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                size="lg"
                className="w-full"
                disabled={placing || !guestInfo.name.trim()}
              >
                {placing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Placing Order...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Place Order</span>
                  </div>
                )}
              </Button>

              <p className="text-xs text-content-tertiary mt-3 text-center">
                By placing this order, you agree to our terms of service
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}