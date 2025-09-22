import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { MenuItem, MenuCategory } from '@tabsy/shared-types'
import { useCart } from './useCart'

interface UseMenuItemActionsProps {
  restaurantId: string | null
  menuCategories?: MenuCategory[]
}

export function useMenuItemActions({ restaurantId, menuCategories }: UseMenuItemActionsProps) {
  const { cart, addToCart, updateQuantity, getItemQuantity } = useCart()

  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Modal state for item details
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [selectedCartItem, setSelectedCartItem] = useState<any>(null)

  // Load favorites from localStorage
  const loadFavoritesFromStorage = useCallback((): Set<string> => {
    if (!restaurantId) return new Set()
    try {
      const stored = localStorage.getItem(`tabsy-favorites-${restaurantId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch (error) {
      console.error('Failed to load favorites:', error)
      return new Set()
    }
  }, [restaurantId])

  // Save favorites to localStorage
  const saveFavoritesToStorage = useCallback((favSet: Set<string>) => {
    if (!restaurantId) return
    try {
      localStorage.setItem(`tabsy-favorites-${restaurantId}`, JSON.stringify(Array.from(favSet)))
    } catch (error) {
      console.error('Failed to save favorites:', error)
    }
  }, [restaurantId])

  // Load favorites on component mount
  useEffect(() => {
    if (restaurantId) {
      setFavorites(loadFavoritesFromStorage())
    }
  }, [restaurantId, loadFavoritesFromStorage])

  // Toggle favorite status
  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId)
        toast.success('Removed from favorites', { icon: '💔' })
      } else {
        newFavorites.add(itemId)
        toast.success('Added to favorites', { icon: '❤️' })
      }
      saveFavoritesToStorage(newFavorites)
      return newFavorites
    })
  }, [saveFavoritesToStorage])

  // Add item to cart
  const handleAddToCart = useCallback((item: MenuItem, quantity: number = 1) => {
    console.log('[useMenuItemActions] -- Adding to cart:', { item, quantity })
    // Find the category name for this item
    const categoryName = menuCategories
      ?.find(category => category.items?.some(categoryItem => categoryItem.id === item.id))
      ?.name || 'Unknown Category'
    addToCart(item, quantity, {}, categoryName)
  }, [addToCart, menuCategories])

  // Update item quantity in cart
  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    // Find the first cart item for this menu item (without special instructions for basic quantity updates)
    const cartItems = cart.filter(item => item.id === itemId)
    if (cartItems.length > 0) {
      const cartItem = cartItems[0] // Update the first matching item
      if (cartItem) {
        updateQuantity(cartItem.cartItemId, quantity)
      }
    }
  }, [updateQuantity, cart])

  // Handle quantity change (either update existing or add new)
  const handleQuantityChange = useCallback((itemId: string, newQuantity: number, item: MenuItem) => {
    // Set absolute quantity for items without special instructions
    const existingItems = cart.filter(cartItem => cartItem.id === itemId)
    if (existingItems.length > 0) {
      // Update existing item with absolute quantity
      handleUpdateQuantity(itemId, newQuantity)
    } else {
      console.log('[useMenuItemActions] No existing cart item found, adding new item with quantity:', newQuantity)
      // Add new item with specified quantity
      handleAddToCart(item, newQuantity)
    }
  }, [cart, handleUpdateQuantity, handleAddToCart])

  // Handle item click to open detail modal
  const handleItemClick = useCallback((menuItem: any, originalItem: MenuItem) => {
    console.log('[useMenuItemActions] onItemClick called with menuItem:', menuItem)
    console.log('[useMenuItemActions] Original item from API:', originalItem)

    // Map the data structure to match what ItemDetailModal expects
    const modalItem = {
      ...originalItem,
      basePrice: originalItem.price || originalItem.basePrice || 0,
      dietaryTypes: originalItem.dietaryTypes || [],
      options: originalItem.options || [],
      imageUrl: originalItem.image || originalItem.imageUrl,
      spicyLevel: originalItem.spicyLevel || 0,
      allergyInfo: originalItem.allergyInfo || undefined,
      nutritionalInfo: originalItem.nutritionalInfo || undefined
    }

    // Check if this item is already in cart (find first matching item for customization editing)
    const existingCartItems = cart.filter(cartItem => cartItem.id === originalItem.id)
    const existingCartItem = existingCartItems.length > 0 ? existingCartItems[0] : null

    console.log('[useMenuItemActions] Mapped item for modal:', modalItem)
    console.log('[useMenuItemActions] Existing cart item:', existingCartItem)

    setSelectedItem(modalItem)
    setSelectedCartItem(existingCartItem)
    setShowItemModal(true)
    console.log('[useMenuItemActions] Modal should now be visible')
  }, [cart])

  // Close modal
  const closeModal = useCallback(() => {
    setShowItemModal(false)
    setSelectedCartItem(null)
  }, [])

  // Handle add to cart from modal with customizations
  const handleAddToCartFromModal = useCallback((item: MenuItem, quantity: number, customizations: any, options: any) => {
    console.log('[useMenuItemActions] -- onAddToCart from ItemDetailModal:', { item, quantity, customizations, options })

    if (!item) {
      console.error('No item provided to add to cart')
      return
    }

    const categoryName = menuCategories
      ?.find(category => category.items?.some(categoryItem => categoryItem.id === item.id))
      ?.name || 'Unknown Category'

    // Extract special instructions from customizations if provided
    const specialInstructions = customizations?.specialInstructions || ''

    // Add item with proper parameter order: item, quantity, customizations, categoryName, specialInstructions, options
    addToCart(item, quantity, customizations, categoryName, specialInstructions, options)
    closeModal()
  }, [addToCart, menuCategories, closeModal])

  return {
    // Favorites
    favorites,
    toggleFavorite,

    // Cart operations
    handleAddToCart,
    handleUpdateQuantity,
    handleQuantityChange,
    getItemQuantity,

    // Modal state
    selectedItem,
    showItemModal,
    selectedCartItem,
    handleItemClick,
    closeModal,
    handleAddToCartFromModal
  }
}