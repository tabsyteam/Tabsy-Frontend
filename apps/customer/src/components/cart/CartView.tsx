'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Clock, MapPin, Users, Leaf, Zap, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { DietaryType, AllergyInfo } from '@tabsy/shared-types'
import { CustomizationList } from '@tabsy/ui-components'
import { useCart } from '@/hooks/useCart'
import { SessionManager } from '@/lib/session'
import { ItemDetailModal } from '@/components/menu/ItemDetailModal'
import { calculateTax } from '@/constants/tax'
import { STORAGE_KEYS } from '@/constants/storage'


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

export function CartView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cart, cartCount, cartTotal, updateQuantity, updateCartItem, removeFromCart, clearCart, isLoading, getCartItem } = useCart()
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [specialInstructions, setSpecialInstructions] = useState('')

  // Edit modal state
  const [editingCartItem, setEditingCartItem] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Get restaurant and table ID from URL or session
  const urlRestaurantId = searchParams.get('restaurant')
  const urlTableId = searchParams.get('table')
  const session = SessionManager.getDiningSession()

  const hasValidUrlParams = SessionManager.validateUrlParams({
    restaurant: urlRestaurantId,
    table: urlTableId
  })

  const restaurantId = hasValidUrlParams ? urlRestaurantId : session?.restaurantId
  const tableId = hasValidUrlParams ? urlTableId : session?.tableId

  useEffect(() => {
    // Load table info from sessionStorage
    const savedTableInfo = sessionStorage.getItem(STORAGE_KEYS.TABLE_INFO)
    if (savedTableInfo) {
      try {
        setTableInfo(JSON.parse(savedTableInfo))
      } catch (error) {
        console.error('Failed to parse table info:', error)
      }
    }

    setLoading(false)
  }, [])


  const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
    updateQuantity(cartItemId, newQuantity)
  }

  const handleRemoveItem = (cartItemId: string) => {
    removeFromCart(cartItemId)
  }

  const handleEditItem = (cartItemId: string) => {
    const cartItem = getCartItem(cartItemId)
    if (cartItem) {
      // Try to get the original menu item with options from session storage
      let originalMenuItem = null
      try {
        const cachedMenuData = sessionStorage.getItem(STORAGE_KEYS.MENU_DATA)
        if (cachedMenuData) {
          const menuData = JSON.parse(cachedMenuData)
          // Find the original menu item
          for (const category of menuData.categories || []) {
            const foundItem = category.items?.find((item: any) => item.id === cartItem.id)
            if (foundItem) {
              originalMenuItem = foundItem
              break
            }
          }
        }
      } catch (error) {
        console.error('Failed to load menu data from cache:', error)
      }

      // Reconstruct the MenuItem object for the modal
      const menuItem = originalMenuItem || {
        id: cartItem.id,
        categoryId: cartItem.categoryId,
        name: cartItem.name,
        description: cartItem.description,
        basePrice: cartItem.basePrice,
        price: cartItem.basePrice,
        image: cartItem.imageUrl,
        imageUrl: cartItem.imageUrl,
        dietaryTypes: cartItem.dietaryTypes || [],
        allergyInfo: cartItem.allergyInfo,
        spicyLevel: cartItem.spicyLevel,
        preparationTime: cartItem.preparationTime || 15,
        options: [], // Fallback if no cached data
        tags: [],
        status: 'AVAILABLE',
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      console.log('[CartView] Edit item - found original menu item:', !!originalMenuItem, 'options:', menuItem.options?.length || 0)

      setEditingCartItem({
        menuItem,
        cartItem: {
          cartItemId: cartItem.cartItemId,
          quantity: cartItem.quantity,
          customizations: cartItem.customizations,
          options: cartItem.options,
          specialInstructions: cartItem.specialInstructions
        }
      })
      setShowEditModal(true)
    }
  }

  const handleClearCart = () => {
    clearCart()
  }

  const getSubtotal = (): number => {
    return cartTotal
  }

  const getTax = (): number => {
    return calculateTax(cartTotal) // 10% tax (matches backend)
  }

  const getTotal = (): number => {
    return cartTotal + getTax()
  }

  const getTotalItems = (): number => {
    return cartCount
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    // Store special instructions
    if (specialInstructions.trim()) {
      sessionStorage.setItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS, specialInstructions.trim())
    }

    // Navigate to checkout
    router.push(`/checkout?restaurant=${restaurantId}&table=${tableId}`)
  }

  const handleBrowseMenu = () => {
    if (restaurantId && tableId) {
      router.push(`/menu?restaurant=${restaurantId}&table=${tableId}`)
    } else {
      router.push('/menu')
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show "scan QR" message if no valid session
  if (!restaurantId || !tableId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto bg-surface-secondary rounded-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-content-tertiary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Ready to Order?
            </h1>
            <p className="text-content-secondary mb-4">
              Your cart will appear here once you scan the QR code at your table and start adding delicious items.
            </p>
            <div className="text-sm text-content-tertiary space-y-1">
              <p>• Scan the QR code at your table</p>
              <p>• Browse the menu and add items</p>
              <p>• Review your order here</p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/')}
            className="w-full"
          >
            Scan QR Code to Get Started
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBrowseMenu}
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
                onClick={handleClearCart}
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
            <Button onClick={handleBrowseMenu} size="lg">
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
                    key={item.cartItemId}
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
                              Category: {item.categoryName}
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
                            {item.options && item.options.length > 0 && (
                              <div className="mb-2">
                                <CustomizationList
                                  customizations={item.options}
                                  compact={true}
                                  showPrices={true}
                                  className="text-sm"
                                />
                              </div>
                            )}

                            {/* Special Instructions */}
                            {item.specialInstructions && (
                              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
                                <span className="font-medium">Special Instructions:</span>
                                <div className="mt-1">{item.specialInstructions}</div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-1">
                            {/* Edit Button - only show if item has customizations */}
                            {(item.options && item.options.length > 0) || item.specialInstructions ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item.cartItemId)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                                title="Edit customizations"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                            ) : null}
                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.cartItemId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Quantity Controls and Price */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity - 1)}
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
                              onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity + 1)}
                              className="w-8 h-8 p-0 hover:bg-white"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-semibold text-primary">
                              ${(() => {
                                const optionsTotal = item.options?.reduce((sum, option) => sum + (option.price || 0), 0) || 0
                                return ((Number(item.basePrice) + optionsTotal) * item.quantity).toFixed(2)
                              })()}
                            </div>
                            {item.quantity > 1 && (
                              <div className="text-xs text-content-tertiary">
                                ${(() => {
                                  const optionsTotal = item.options?.reduce((sum, option) => sum + (option.price || 0), 0) || 0
                                  return (Number(item.basePrice) + optionsTotal).toFixed(2)
                                })()} each
                              </div>
                            )}
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
                  className="w-full p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
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
                    onClick={handleBrowseMenu}
                    size="lg"
                    className="w-full"
                  >
                    Add More Items
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

      {/* Edit Item Modal */}
      {editingCartItem && (
        <ItemDetailModal
          item={editingCartItem.menuItem}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingCartItem(null)
          }}
          existingCartItem={editingCartItem.cartItem}
          mode="edit"
          onAddToCart={(item, quantity, customizations, options) => {
            // This won't be called in edit mode
          }}
          onUpdateCartItem={(cartItemId, item, quantity, customizations, specialInstructions, options) => {
            // Update the existing cart item
            updateCartItem(cartItemId, item, quantity, customizations, specialInstructions, options)
            setShowEditModal(false)
            setEditingCartItem(null)
          }}
        />
      )}
    </div>
  )
}