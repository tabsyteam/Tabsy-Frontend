'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Clock, MapPin, Users } from 'lucide-react'
import { toast } from 'sonner'
import { DietaryType, AllergenType } from '@tabsy/shared-types'

interface CartItem {
  id: string
  name: string
  description: string
  basePrice: number
  imageUrl?: string
  categoryName: string
  quantity: number
  customizations?: Record<string, any>
  allergens: AllergenType[]
  dietaryTypes: DietaryType[]
}

interface TableInfo {
  restaurant: {
    id: string
    name: string
    logo?: string
  }
  table: {
    id: string
    number: string
  }
}

export function CartView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [specialInstructions, setSpecialInstructions] = useState('')

  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  useEffect(() => {
    // Load cart from sessionStorage
    const savedCart = sessionStorage.getItem('tabsy-cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (error) {
        console.error('Failed to parse cart:', error)
        toast.error('Failed to load cart')
      }
    }

    // Load table info from sessionStorage
    const savedTableInfo = sessionStorage.getItem('tabsy-table-info')
    if (savedTableInfo) {
      try {
        setTableInfo(JSON.parse(savedTableInfo))
      } catch (error) {
        console.error('Failed to parse table info:', error)
      }
    }

    setLoading(false)
  }, [])

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      sessionStorage.setItem('tabsy-cart', JSON.stringify(cart))
    }
  }, [cart, loading])

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const removeItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId))
    toast.success('Item removed from cart')
  }

  const clearCart = () => {
    setCart([])
    toast.success('Cart cleared')
  }

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

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    // Store special instructions
    if (specialInstructions.trim()) {
      sessionStorage.setItem('tabsy-special-instructions', specialInstructions.trim())
    }

    // Navigate to checkout
    router.push(`/checkout?restaurant=${restaurantId}&table=${tableId}`)
  }

  const handleContinueShopping = () => {
    router.push(`/menu?restaurant=${restaurantId}&table=${tableId}`)
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleContinueShopping}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Your Order</h1>
                <p className="text-sm text-content-tertiary">
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {cart.length === 0 ? (
          /* Empty Cart */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-content-primary mb-2">
              Your cart is empty
            </h2>
            <p className="text-content-secondary mb-6 max-w-md mx-auto">
              Start adding some delicious items from the menu to get started!
            </p>
            <Button onClick={handleContinueShopping} size="lg">
              Browse Menu
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Restaurant & Table Info */}
              {tableInfo && (
                <div className="bg-surface rounded-xl border p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    {tableInfo.restaurant.logo ? (
                      <img
                        src={tableInfo.restaurant.logo}
                        alt={tableInfo.restaurant.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-content-primary">
                        {tableInfo.restaurant.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-content-secondary">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>Table {tableInfo.table.number}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Dine-in</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items List */}
              <AnimatePresence>
                {cart.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="bg-surface rounded-xl border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* Item Image */}
                      {item.imageUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-content-primary mb-1">
                              {item.name}
                            </h3>
                            <p className="text-sm text-content-secondary mb-2">
                              {item.categoryName}
                            </p>

                            {/* Dietary Types */}
                            {item.dietaryTypes && item.dietaryTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {item.dietaryTypes.map(diet => (
                                  <span
                                    key={diet}
                                    className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full"
                                  >
                                    {diet.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Quantity Controls and Price */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 p-0 hover:bg-white"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>

                            <span className="text-sm font-semibold min-w-[2rem] text-center">
                              {item.quantity}
                            </span>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 p-0 hover:bg-white"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-content-secondary">
                              ${Number(item.basePrice).toFixed(2)} each
                            </div>
                            <div className="font-semibold text-content-primary">
                              ${(Number(item.basePrice) * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Special Instructions */}
              <div className="bg-surface rounded-xl border p-4">
                <h3 className="font-semibold text-content-primary mb-3">
                  Special Instructions
                </h3>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special requests or dietary requirements?"
                  className="w-full p-3 border border-border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-content-tertiary mt-1">
                  {specialInstructions.length}/200 characters
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-surface rounded-xl border p-6 sticky top-24">
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

                <div className="space-y-3">
                  <Button
                    onClick={handleCheckout}
                    size="lg"
                    className="w-full"
                  >
                    Proceed to Checkout
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleContinueShopping}
                    size="lg"
                    className="w-full"
                  >
                    Continue Shopping
                  </Button>
                </div>

                {/* Estimated Time */}
                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-content-secondary">
                    <Clock className="w-4 h-4" />
                    <span>Estimated prep time: 15-25 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}