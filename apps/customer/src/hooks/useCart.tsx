'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'
import { DietaryType, AllergyInfo, MenuItem, OrderItemOption } from '@tabsy/shared-types'

// Type guard to ensure a value is a string
const isValidString = (value: unknown): value is string => {
  return typeof value === 'string'
}

// Utility to safely extract and normalize special instructions
const normalizeSpecialInstructions = (instructions: unknown): string | undefined => {
  if (!instructions) return undefined
  if (!isValidString(instructions)) return undefined

  const trimmed = instructions.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

// Simple helper to check if items can be consolidated
const canConsolidateItems = (existingItem: CartItem, newItem: { specialInstructions?: unknown }): boolean => {
  const existingInstructions = normalizeSpecialInstructions(existingItem.specialInstructions)
  const newInstructions = normalizeSpecialInstructions(newItem.specialInstructions)

  console.log('[CART DEBUG] canConsolidateItems:', {
    existingItem: existingItem.name,
    existingCartItemId: existingItem.cartItemId,
    existingSpecialInstructions: existingInstructions,
    newSpecialInstructions: newInstructions,
    canConsolidate: !existingInstructions && !newInstructions
  })

  return !existingInstructions && !newInstructions
}

export interface CartItem {
  id: string
  cartItemId: string // Unique identifier for this specific cart entry
  name: string
  description: string
  basePrice: number
  imageUrl?: string
  categoryId: string
  categoryName: string
  quantity: number
  customizations?: Record<string, any>
  options?: OrderItemOption[] // Enhanced unified format
  specialInstructions?: string // Per-item special instructions
  allergyInfo?: AllergyInfo
  dietaryTypes: DietaryType[]
  preparationTime?: number
  spicyLevel?: number
}

interface CartContextType {
  cart: CartItem[]
  cartCount: number
  cartTotal: number
  addToCart: (item: MenuItem, quantity?: number, customizations?: Record<string, any>, categoryName?: string, specialInstructions?: string, options?: OrderItemOption[]) => void
  updateCartItem: (cartItemId: string, item: MenuItem, quantity: number, customizations?: Record<string, any>, specialInstructions?: string, options?: OrderItemOption[]) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  removeFromCart: (cartItemId: string) => void
  clearCart: () => void
  getItemQuantity: (itemId: string) => number
  findCartItemsForMenuItem: (itemId: string) => CartItem[]
  getCartItem: (cartItemId: string) => CartItem | undefined
  isLoading: boolean
  error: string | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

interface CartProviderProps {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load cart from sessionStorage on mount
  useEffect(() => {
    try {
      const savedCart = sessionStorage.getItem('tabsy-cart')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        setCart(Array.isArray(parsedCart) ? parsedCart : [])
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error)
      setError('Failed to load cart')
      // Clear corrupted data
      sessionStorage.removeItem('tabsy-cart')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        sessionStorage.setItem('tabsy-cart', JSON.stringify(cart))
        setError(null)
      } catch (error) {
        console.error('Failed to save cart to storage:', error)
        setError('Failed to save cart')
      }
    }
  }, [cart, isLoading])

  // Add item to cart
  const addToCart = useCallback((
    item: MenuItem,
    quantity: number = 1,
    customizations: Record<string, any> = {},
    categoryName: string = 'Unknown Category',
    specialInstructions?: string,
    options?: OrderItemOption[]
  ) => {
    try {
      // Smart price handling: detect if price is in cents and convert to dollars
      const rawPrice = item.price ?? item.basePrice;
      let finalPrice = rawPrice;

      // If price looks like it's in cents (e.g., 1499 for $14.99), convert it
      if (rawPrice > 100 && rawPrice % 1 === 0) {
        // Whole number over 100 - likely cents, convert to dollars
        finalPrice = rawPrice / 100;
      }

      // Extract and normalize special instructions with type safety
      const extractedInstructions = specialInstructions || customizations?.specialInstructions
      const finalSpecialInstructions = normalizeSpecialInstructions(extractedInstructions)

      const cartItem: CartItem = {
        id: item.id,
        cartItemId: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.name,
        description: item.description,
        basePrice: finalPrice,
        imageUrl: item.image || item.imageUrl,
        categoryId: item.categoryId,
        categoryName: categoryName,
        quantity: Math.max(1, quantity),
        customizations: customizations || {},
        options: options || [], // Enhanced unified format
        specialInstructions: finalSpecialInstructions?.trim() || undefined,
        allergyInfo: item.allergyInfo,
        dietaryTypes: item.dietaryTypes || [],
        preparationTime: item.preparationTime,
        spicyLevel: item.spicyLevel
      }

      setCart(prev => {
        console.log('[CART DEBUG] Adding item:', item.name, {
          finalSpecialInstructions,
          existingCartItems: prev.filter(cartItem => cartItem.id === item.id),
          quantity
        })

        // Find existing item with same ID that can be consolidated
        const existingIndex = prev.findIndex(existingCartItem =>
          existingCartItem.id === item.id
        )

        if (existingIndex >= 0) {
          console.log('[CART DEBUG] Found existing item - consolidating')
          // Update existing item
          const updated = [...prev]
          const existingItem = updated[existingIndex]
          if (!existingItem) return prev // Safety check

          updated[existingIndex] = {
            ...existingItem,
            quantity: quantity,
            specialInstructions: finalSpecialInstructions || existingItem.specialInstructions
          }
          return updated
        } else {
          console.log('[CART DEBUG] No consolidatable item found - adding new')
          // Add new item
          return [...prev, cartItem]
        }
      })

      toast.success(`Added ${item.name} to cart`, {
        icon: '🛒',
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      toast.error('Failed to add item to cart')
    }
  }, [])

  // Update entire cart item (for customization editing)
  const updateCartItem = useCallback((
    cartItemId: string,
    item: MenuItem,
    quantity: number,
    customizations: Record<string, any> = {},
    specialInstructions?: string,
    options?: OrderItemOption[]
  ) => {
    try {
      // Smart price handling: detect if price is in cents and convert to dollars
      const rawPrice = item.price ?? item.basePrice;
      let finalPrice = rawPrice;

      if (rawPrice > 100 && rawPrice % 1 === 0) {
        finalPrice = rawPrice / 100;
      }

      const finalSpecialInstructions = specialInstructions && specialInstructions.trim()
        ? specialInstructions.trim()
        : undefined

      setCart(prev => prev.map(cartItem => {
        if (cartItem.cartItemId === cartItemId) {
          return {
            ...cartItem,
            quantity: Math.max(1, quantity),
            customizations: customizations || {},
            options: options || [],
            specialInstructions: finalSpecialInstructions,
            basePrice: finalPrice
          }
        }
        return cartItem
      }))

      toast.success(`Updated ${item.name}`, {
        icon: '✏️',
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to update cart item:', error)
      toast.error('Failed to update cart item')
    }
  }, [])

  // Update item quantity
  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeFromCart(cartItemId)
        return
      }

      setCart(prev => prev.map(item =>
        item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item
      ))
    } catch (error) {
      console.error('Failed to update quantity:', error)
      toast.error('Failed to update quantity')
    }
  }, [])

  // Get specific cart item by cartItemId
  const getCartItem = useCallback((cartItemId: string) => {
    return cart.find(item => item.cartItemId === cartItemId)
  }, [cart])

  // Remove item from cart
  const removeFromCart = useCallback((cartItemId: string) => {
    try {
      setCart(prev => {
        const item = prev.find(item => item.cartItemId === cartItemId)
        const filtered = prev.filter(item => item.cartItemId !== cartItemId)

        if (item) {
          toast.success(`Removed ${item.name} from cart`, {
            icon: '🗑️',
            duration: 2000
          })
        }

        return filtered
      })
    } catch (error) {
      console.error('Failed to remove item from cart:', error)
      toast.error('Failed to remove item from cart')
    }
  }, [])

  // Clear entire cart
  const clearCart = useCallback(() => {
    try {
      setCart([])
      toast.success('Cart cleared', {
        icon: '🗑️',
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to clear cart:', error)
      toast.error('Failed to clear cart')
    }
  }, [])

  // Get quantity of specific item (returns quantity of first matching item without special instructions)
  const getItemQuantity = useCallback((itemId: string) => {
    // Find the first item without special instructions (for display purposes)
    const plainItem = cart.find(item => item.id === itemId)
    return plainItem?.quantity || 0
  }, [cart])

  // Find all cart items for a specific menu item
  const findCartItemsForMenuItem = useCallback((itemId: string) => {
    return cart.filter(item => item.id === itemId)
  }, [cart])

  // Calculate cart metrics
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => {
    // Calculate total option prices for this item
    const optionsTotal = item.options?.reduce((sum, option) => sum + (option.price || 0), 0) || 0
    // Item total = (base price + options total) * quantity
    return total + ((item.basePrice + optionsTotal) * item.quantity)
  }, 0)

  const value: CartContextType = {
    cart,
    cartCount,
    cartTotal,
    addToCart,
    updateCartItem,
    updateQuantity,
    removeFromCart,
    clearCart,
    getItemQuantity,
    findCartItemsForMenuItem,
    getCartItem,
    isLoading,
    error
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}