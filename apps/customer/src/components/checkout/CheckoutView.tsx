'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button, CartItemDisplay } from '@tabsy/ui-components'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeft, Clock, CheckCircle, User, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { useCart } from '@/hooks/useCart'
import { SessionManager } from '@/lib/session'
import { calculateTax } from '@/constants/tax'
import { STORAGE_KEYS } from '@/constants/storage'
import { unifiedSessionStorage } from '@/lib/unifiedSessionStorage'

interface CartItem {
  id: string
  cartItemId: string
  name: string
  description: string
  basePrice: number
  imageUrl?: string
  categoryName: string
  quantity: number
  customizations?: Record<string, any>
  options?: { optionId: string; valueId: string; optionName: string; valueName: string; price: number }[]
  specialInstructions?: string
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
  const { clearCart } = useCart()

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

  const urlRestaurantId = searchParams.get('restaurant')
  const urlTableId = searchParams.get('table')

  // Validate URL parameters and fall back to session if invalid
  const session = SessionManager.getDiningSession()
  const hasValidUrlParams = SessionManager.validateUrlParams({
    restaurant: urlRestaurantId,
    table: urlTableId
  })

  const restaurantId = hasValidUrlParams ? urlRestaurantId : session?.restaurantId
  const tableId = hasValidUrlParams ? urlTableId : session?.tableId

  useEffect(() => {
    // Load cart from sessionStorage
    const savedCart = sessionStorage.getItem(STORAGE_KEYS.CART)
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
    const savedInstructions = sessionStorage.getItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS)
    if (savedInstructions) {
      setSpecialInstructions(savedInstructions)
    }

    setLoading(false)
  }, [router])

  const getSubtotal = (): number => {
    return cart.reduce((total, item) => {
      // Calculate options total for this item
      const optionsTotal = item.options?.reduce((sum, option) => sum + (option.price || 0), 0) || 0
      // Item total = (base price + options total) * quantity
      return total + ((Number(item.basePrice) + optionsTotal) * item.quantity)
    }, 0)
  }

  const getTax = (): number => {
    return calculateTax(getSubtotal()) // 10% tax (matches backend)
  }

  const getTotal = (): number => {
    return getSubtotal() + getTax()
  }

  const getTotalItems = (): number => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handlePlaceOrder = async () => {
    console.log('handlePlaceOrder called')
    console.log('Cart:', cart)
    console.log('Guest info:', guestInfo)
    console.log('Restaurant ID:', restaurantId)
    console.log('Table ID:', tableId)

    // Clear any invalid temporary sessions for fresh start
    const existingSession = sessionStorage.getItem('tabsy-session')
    if (existingSession) {
      try {
        const parsed = JSON.parse(existingSession)
        if (parsed.sessionId?.startsWith('temp-')) {
          console.log('Clearing temporary session for fresh API session creation')
          sessionStorage.removeItem('tabsy-session')
        }
      } catch (e) {
        console.log('Clearing invalid session data')
        sessionStorage.removeItem('tabsy-session')
      }
    }

    if (cart.length === 0) {
      console.log('Cart is empty - returning early')
      toast.error('Cart is empty')
      return
    }

    // Validate guest info (name is required for orders)
    if (!guestInfo.name.trim()) {
      console.log('Guest name is missing - returning early')
      toast.error('Please enter your name')
      return
    }

    console.log('Starting order placement...')
    setPlacing(true)

    try {
      // Get existing session ID from API client (created by TableSessionManager)
      // DUAL-READ: Try unified storage first, with automatic legacy fallback
      let existingSessionId = api.getGuestSessionId()
      console.log('Existing session ID from API client:', existingSessionId)

      if (!existingSessionId) {
        console.warn('[CheckoutView] No guest session in API client memory, attempting recovery...')

        // DUAL-READ: Use unified storage (automatically falls back to legacy keys)
        const session = unifiedSessionStorage.getSession()
        if (session?.guestSessionId) {
          console.log('[CheckoutView] ✅ Session recovered from unified storage:', session.guestSessionId)
          api.setGuestSession(session.guestSessionId)
          existingSessionId = session.guestSessionId
        } else {
          // Final fallback: Check standalone session ID (legacy)
          const standaloneSessionId = sessionStorage.getItem('tabsy-guest-session-id')
          if (standaloneSessionId) {
            console.log('[CheckoutView] ✅ Session recovered from legacy standalone key:', standaloneSessionId)
            api.setGuestSession(standaloneSessionId)
            existingSessionId = standaloneSessionId
          }
        }

        // If still no session, throw error
        if (!existingSessionId) {
          console.error('[CheckoutView] ❌ Session recovery failed. No session found in any storage location.')
          throw new Error('No guest session available. Please refresh the page and try again.')
        }

        console.log('[CheckoutView] ✅ Session recovery successful:', existingSessionId)
      }

      // Use the existing session instead of creating a new one
      const session = {
        sessionId: existingSessionId,
        tableId: tableId!,
        restaurantId: restaurantId!
      }
      console.log('Using existing guest session:', session)

      // Get session data for proper order association
      const sessionData = SessionManager.getDiningSession()
      console.log('Session data for order:', sessionData)

      // Prepare order data according to backend OrderRequest type
      // Note: tableSessionId and guestSessionId are handled by backend middleware via x-session-id header
      const orderData = {
        restaurantId: restaurantId!,
        tableId: tableId!,
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          options: item.options ? item.options.filter(option =>
            option.optionId && option.valueId && option.valueId.trim()
          ) : undefined,
          specialInstructions: item.specialInstructions?.trim() || undefined
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

      console.log('Order data to send:', cleanOrderData)
      console.log('API client:', api)

      // Place the order
      console.log('Making API call to api.order.create...')
      const response = await api.order.create(cleanOrderData)
      console.log('API response:', response)

      if (response.success && response.data) {
        // Clear cart using useCart hook and clear special instructions
        clearCart()
        sessionStorage.removeItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS)

        // Store order info for tracking in sessionStorage
        sessionStorage.setItem('tabsy-current-order', JSON.stringify(response.data))

        // Save order to SessionManager for navigation access
        SessionManager.setCurrentOrder({
          orderId: response.data.id,
          orderNumber: response.data.orderNumber,
          status: response.data.status,
          createdAt: Date.now()
        })

        // Add order to history for tracking multiple orders
        SessionManager.addOrderToHistory(response.data.id)

        toast.success('Order placed successfully!', {
          description: `Order #${response.data.orderNumber} has been sent to the kitchen`,
          duration: 3000
        })

        // Add a small delay to ensure the toast is visible before navigation
        setTimeout(() => {
          // Navigate to order tracking (use replace to prevent back navigation to checkout)
          router.replace(`/order/${response.data!.id}?restaurant=${restaurantId}&table=${tableId}`)
        }, 500)
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
        <LoadingSpinner size="xl" />
      </div>
    )
  }

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
                    className="w-full p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
                    className="w-full p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
                    className="w-full p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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

              <div className="space-y-4">
                {cart.map((item) => (
                  <CartItemDisplay
                    key={item.cartItemId}
                    name={item.name}
                    description={item.description}
                    basePrice={Number(item.basePrice)}
                    quantity={item.quantity}
                    categoryName={item.categoryName}
                    options={item.options}
                    specialInstructions={item.specialInstructions}
                  />
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
                <p className="text-content-secondary bg-surface-secondary p-3 rounded-lg">
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
                className={`w-full relative overflow-hidden transition-all duration-300 ${
                  placing
                    ? 'bg-primary/80 cursor-not-allowed transform'
                    : 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                }`}
                disabled={placing || !guestInfo.name.trim()}
                aria-label={placing ? 'Placing your order, please wait' : 'Place order'}
                aria-busy={placing}
              >
                <motion.div
                  className="flex items-center justify-center space-x-3"
                  initial={false}
                  animate={placing ? { opacity: 1 } : { opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {placing ? (
                    <>
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative"
                      >
                        <LoadingSpinner size="sm" color="white" />
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-white/30"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                      </motion.div>
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="font-medium"
                      >
                        Placing Order...
                      </motion.span>
                    </>
                  ) : (
                    <>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </motion.div>
                      <span className="font-semibold">Place Order</span>
                    </>
                  )}
                </motion.div>

                {/* Subtle loading pulse effect */}
                {placing && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-surface/10 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
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