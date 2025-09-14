'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApi } from '@/components/providers/api-provider'
import { Button } from '@tabsy/ui-components'
import { ShoppingCart, ArrowLeft, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { MenuItem, MenuCategory, MenuItemStatus, DietaryType, AllergenType } from '@tabsy/shared-types'

interface Restaurant {
  id: string
  name: string
  description: string
}

interface Table {
  id: string
  number: string
}

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

export function MenuView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  useEffect(() => {
    const loadData = async () => {
      if (!restaurantId || !tableId) {
        setError('Missing restaurant or table information')
        setLoading(false)
        return
      }

      try {
        // Load restaurant info
        const restaurantResponse = await api.restaurant.getById(restaurantId)
        if (restaurantResponse.success && restaurantResponse.data) {
          setRestaurant(restaurantResponse.data)
        }

        // Load table info  
        const tableResponse = await api.table.getById(restaurantId, tableId)
        if (tableResponse.success && tableResponse.data) {
          setTable(tableResponse.data)
        }

        // Load menu items
        const menuResponse = await api.menu.getActiveMenu(restaurantId)
        if (menuResponse.success && menuResponse.data) {
          const menuData = menuResponse.data
          const activeCategories = menuData.categories.filter((cat: any) => cat.isActive)
          setMenuCategories(activeCategories)
          
          // Extract unique category names
          const categoryNames = activeCategories.map((cat: any) => cat.name)
          setCategories(categoryNames)
          
          if (categoryNames.length > 0) {
            setSelectedCategory(categoryNames[0] || null)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to load menu data:', err)
        setError('Failed to load menu')
        setLoading(false)
      }
    }

    loadData()
  }, [restaurantId, tableId, api])

  const addToCart = (item: MenuItem, categoryName: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id)
      
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      } else {
        const cartItem: CartItem = {
          id: item.id,
          name: item.name,
          description: item.description,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          categoryName,
          quantity: 1,
          allergens: item.allergens,
          dietaryTypes: item.dietaryTypes,
        }
        return [...prevCart, cartItem]
      }
    })
    
    toast.success(`Added ${item.name} to cart`)
  }

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === itemId)
      
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        )
      } else {
        return prevCart.filter(cartItem => cartItem.id !== itemId)
      }
    })
  }

  const getCartItemQuantity = (itemId: string): number => {
    const cartItem = cart.find(item => item.id === itemId)
    return cartItem ? cartItem.quantity : 0
  }

  const getTotalPrice = (): number => {
    return cart.reduce((total, item) => total + (item.basePrice * item.quantity), 0)
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    // Store cart in sessionStorage and navigate to order review
    sessionStorage.setItem('tabsy-cart', JSON.stringify(cart))
    router.push(`/order?restaurant=${restaurantId}&table=${tableId}`)
  }

  // Get items for selected category
  const getFilteredItems = (): MenuItem[] => {
    if (!selectedCategory) return []
    
    const category = menuCategories.find(cat => cat.name === selectedCategory)
    return category ? category.items.filter(item => item.status === MenuItemStatus.AVAILABLE) : []
  }

  const filteredItems = getFilteredItems()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{restaurant?.name || 'Menu'}</h1>
                <p className="text-sm text-gray-500">Table {table?.number}</p>
              </div>
            </div>
            
            <Button
              onClick={handleCheckout}
              className="flex items-center space-x-2"
              disabled={cart.length === 0}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart ({cart.length})</span>
              {cart.length > 0 && (
                <span className="ml-2 font-semibold">
                  ${getTotalPrice().toFixed(2)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Categories */}
        {categories.length > 1 && (
          <div className="mb-6">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="grid gap-4">
          {filteredItems.map(item => {
            const quantity = getCartItemQuantity(item.id)
            const currentCategory = menuCategories.find(cat => cat.items.some(catItem => catItem.id === item.id))
            
            return (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      <span className="text-lg font-bold text-primary ml-4">
                        ${item.basePrice.toFixed(2)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>

                    {item.dietaryTypes && item.dietaryTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.dietaryTypes.map(diet => (
                          <span
                            key={diet}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                          >
                            {diet.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.allergens && item.allergens.length > 0 && (
                      <div className="text-xs text-orange-600 mb-3">
                        Contains: {item.allergens.map(allergen => allergen.replace('_', ' ')).join(', ')}
                      </div>
                    )}

                    {/* Add to Cart Controls */}
                    <div className="flex items-center justify-between">
                      <div>
                        {item.status !== MenuItemStatus.AVAILABLE && (
                          <span className="text-red-500 text-sm font-medium">
                            {item.status === MenuItemStatus.OUT_OF_STOCK ? 'Out of Stock' : 'Currently unavailable'}
                          </span>
                        )}
                      </div>
                      
                      {item.status === MenuItemStatus.AVAILABLE && (
                        <div className="flex items-center space-x-3">
                          {quantity > 0 ? (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFromCart(item.id)}
                                className="w-8 h-8 p-0"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              
                              <span className="text-lg font-semibold min-w-[2rem] text-center">
                                {quantity}
                              </span>
                              
                              <Button
                                size="sm"
                                onClick={() => addToCart(item, currentCategory?.name || 'Unknown')}
                                className="w-8 h-8 p-0"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(item, currentCategory?.name || 'Unknown')}
                              className="flex items-center space-x-1"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {item.imageUrl && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No items available in this category</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 md:hidden">
          <Button
            onClick={handleCheckout}
            size="lg"
            className="rounded-full shadow-lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {cart.length} • ${getTotalPrice().toFixed(2)}
          </Button>
        </div>
      )}
    </div>
  )
}