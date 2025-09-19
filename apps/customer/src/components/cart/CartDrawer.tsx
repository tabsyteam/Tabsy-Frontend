'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@tabsy/ui-components'
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Clock,
  Leaf,
  Zap,
  Utensils
} from 'lucide-react'
import { toast } from 'sonner'
import { DietaryType, AllergyInfo } from '@tabsy/shared-types'
import { haptics } from '@/lib/haptics'
import { useCart } from '@/hooks/useCart'


interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const getAllergensList = (allergyInfo?: AllergyInfo): string[] => {
  if (!allergyInfo) return []

  const allergens: string[] = []

  if (allergyInfo.containsEggs) allergens.push('Eggs')
  if (allergyInfo.containsNuts) allergens.push('Nuts')
  if (allergyInfo.containsDairy) allergens.push('Dairy')
  if (allergyInfo.containsGluten) allergens.push('Gluten')
  if (allergyInfo.containsSeafood) allergens.push('Seafood')
  if (allergyInfo.other && allergyInfo.other.length > 0) {
    allergens.push(...allergyInfo.other)
  }

  return allergens
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cart, cartCount, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart()
  const [specialInstructions, setSpecialInstructions] = useState('')

  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
    haptics.buttonPress()
    updateQuantity(cartItemId, newQuantity)
  }

  const handleRemoveItem = (cartItemId: string) => {
    haptics.removeFromCart()
    removeFromCart(cartItemId)
  }

  const handleClearCart = () => {
    haptics.warning()
    clearCart()
  }

  const getTotalPrice = (): number => {
    return cartTotal
  }

  const getTotalItems = (): number => {
    return cartCount
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      haptics.error()
      toast.error('Your cart is empty')
      return
    }

    haptics.buttonPressImportant()

    // Store special instructions in sessionStorage (cart is already managed by context)
    sessionStorage.setItem('tabsy-special-instructions', specialInstructions)

    // Close drawer and navigate to checkout
    onClose()
    router.push(`/checkout?restaurant=${restaurantId}&table=${tableId}`)
  }

  const getDietaryIcon = (dietary: DietaryType) => {
    switch (dietary) {
      case DietaryType.VEGAN:
      case DietaryType.VEGETARIAN:
        return <Leaf className="w-3 h-3" />
      case DietaryType.GLUTEN_FREE:
        return <Zap className="w-3 h-3" />
      default:
        return <Utensils className="w-3 h-3" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-default">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-content-primary">Your Cart</h2>
                {cart.length > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                /* Empty Cart */
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-content-primary mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-content-secondary mb-4">
                    Browse the menu and add some delicious items to get started
                  </p>
                  <Button onClick={onClose} variant="outline">
                    Browse Menu
                  </Button>
                </div>
              ) : (
                /* Cart Items */
                <div className="p-4 space-y-4">
                  {cart.map((item, index) => (
                    <motion.div
                      key={item.cartItemId}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-background rounded-lg border p-4"
                    >
                      <div className="flex gap-3">
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
                            <h3 className="font-medium text-content-primary truncate pr-2">
                              {item.name}
                            </h3>
                            <span className="text-sm font-semibold text-primary flex-shrink-0">
                              ${(Number(item.basePrice) * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          <p className="text-sm text-content-secondary mb-2 line-clamp-2">
                            {item.description}
                          </p>

                          {/* Dietary and Allergen Info */}
                          {(item.dietaryTypes?.length > 0 || getAllergensList(item.allergyInfo).length > 0) && (
                            <div className="space-y-1 mb-3">
                              {item.dietaryTypes && item.dietaryTypes.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.dietaryTypes.map(diet => (
                                    <span
                                      key={diet}
                                      className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full"
                                    >
                                      {getDietaryIcon(diet)}
                                      <span>{diet.replace('_', ' ')}</span>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {getAllergensList(item.allergyInfo).length > 0 && (
                                <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                  <span className="font-medium">Contains:</span> {getAllergensList(item.allergyInfo).join(', ')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Customizations */}
                          {item.customizations && Object.keys(item.customizations).length > 0 && (
                            <div className="text-xs text-content-tertiary mb-2 bg-gray-50 p-2 rounded">
                              <span className="font-medium">Customizations:</span>
                              {Object.entries(item.customizations).map(([key, value]) => (
                                <div key={key}>{key}: {String(value)}</div>
                              ))}
                            </div>
                          )}

                          {/* Special Instructions */}
                          {item.specialInstructions && (
                            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
                              <span className="font-medium">Special Instructions:</span>
                              <div className="mt-1">{item.specialInstructions}</div>
                            </div>
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 bg-surface rounded-lg p-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity - 1)}
                                className="w-7 h-7 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>

                              <span className="text-sm font-medium min-w-[2rem] text-center">
                                {item.quantity}
                              </span>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity + 1)}
                                className="w-7 h-7 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveItem(item.cartItemId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Special Instructions */}
                  <div className="pt-4 border-t border-default">
                    <label className="block text-sm font-medium text-content-primary mb-2">
                      Special Instructions (Optional)
                    </label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Any special requests for your order..."
                      className="w-full p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                      rows={3}
                      maxLength={250}
                    />
                    <div className="text-xs text-content-tertiary mt-1">
                      {specialInstructions.length}/250 characters
                    </div>
                  </div>

                  {/* Clear Cart */}
                  {cart.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleClearCart}
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cart
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="border-t border-default p-4 space-y-4">
                {/* Total */}
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span className="text-content-primary">Total</span>
                  <span className="text-primary">${getTotalPrice().toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={handleCheckout}
                  size="lg"
                  className="w-full"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Button>

                <p className="text-xs text-content-tertiary text-center">
                  Review your order details on the next page
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}