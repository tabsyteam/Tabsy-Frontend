'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '@/components/providers/api-provider'
import { Button } from '@tabsy/ui-components'
import { ShoppingCart, ArrowLeft, Plus, Minus, Search, X, Utensils, Clock, Leaf, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { MenuItem, MenuCategory, MenuItemStatus, DietaryType, AllergenType } from '@tabsy/shared-types'
import { ItemDetailModal } from './ItemDetailModal'
import { CartDrawer } from '../cart/CartDrawer'
import { useWebSocket } from '@tabsy/api-client'
import { MenuCategorySkeleton, HeaderSkeleton } from '../ui/Skeleton'
import { haptics } from '@/lib/haptics'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator'

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
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [cartAnimations, setCartAnimations] = useState<{ [key: string]: boolean }>({})
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCartDrawer, setShowCartDrawer] = useState(false)

  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  // Refresh function for pull-to-refresh
  const refreshData = async () => {
    if (!restaurantId || !tableId) return

    try {
      setError(null)

      // Reload menu items
      const menuResponse = await api.menu.getActiveMenu(restaurantId)
      if (menuResponse.success && menuResponse.data) {
        const menuData = menuResponse.data

        // API returns an array of menus, get the first active menu or just the first menu
        const menus = Array.isArray(menuData) ? menuData : [menuData]
        const activeMenu = menus.find((menu: any) => menu.active) || menus[0]

        if (activeMenu && activeMenu.categories && Array.isArray(activeMenu.categories)) {
          // Filter for active categories and map fields correctly
          const activeCategories = activeMenu.categories
            .filter((cat: any) => cat.active)
            .map((cat: any) => ({
              ...cat,
              // Map database fields to frontend expected fields
              isActive: cat.active,
              items: cat.items?.map((item: any) => ({
                ...item,
                // Map database fields to frontend expected fields
                basePrice: typeof item.price === 'object' ? Number(item.price) : item.price,
                imageUrl: item.image,
                status: item.active ? 'AVAILABLE' : 'OUT_OF_STOCK', // Convert boolean to enum
                allergens: Array.isArray(item.allergyInfo?.other) ? item.allergyInfo.other : [],
                dietaryTypes: Array.isArray(item.dietaryIndicators) ? item.dietaryIndicators : []
              })) || []
            }))

          setMenuCategories(activeCategories)

          // Extract unique category names
          const categoryNames = activeCategories.map((cat: any) => cat.name)
          setCategories(categoryNames)

          if (categoryNames.length > 0 && !selectedCategory) {
            setSelectedCategory(categoryNames[0] || null)
          }
        }
      }

      toast.success('Menu refreshed!', { icon: '✅' })
    } catch (err) {
      console.error('Failed to refresh menu data:', err)
      toast.error('Failed to refresh menu')
      setError('Failed to refresh menu')
    }
  }

  // Pull-to-refresh hook
  const pullToRefresh = usePullToRefresh({
    onRefresh: refreshData,
    threshold: 80,
    enabled: !loading && !error
  })

  // WebSocket integration for real-time menu updates using Socket.IO
  // Get session from sessionStorage for WebSocket auth
  const [sessionId, setSessionId] = useState<string | undefined>()

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('tabsy-session')
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      setSessionId(session.sessionId)
    }
  }, [])

  // Memoize auth config to prevent unnecessary reconnections
  const authConfig = useMemo(() => ({
    namespace: 'customer' as const,
    restaurantId: restaurantId || undefined,
    tableId: tableId || undefined,
    sessionId: sessionId
  }), [restaurantId, tableId, sessionId])

  const {
    isConnected: wsConnected,
    connect: wsConnect,
    disconnect: wsDisconnect,
    client: wsClient
  } = useWebSocket({
    auth: authConfig,
    autoConnect: false, // Don't auto-connect, we'll control it
    onConnect: () => {
      console.log('Connected to menu updates')
    },
    onDisconnect: () => {
      console.log('Disconnected from menu updates')
    },
    onError: (error) => {
      console.error('Menu WebSocket error:', error)
    }
  })

  // Connect WebSocket when component mounts with valid parameters
  useEffect(() => {
    if (restaurantId && tableId && sessionId && !loading) {
      console.log('Connecting WebSocket with:', { restaurantId, tableId, sessionId })
      wsConnect()
    }

    return () => {
      wsDisconnect()
    }
  }, [restaurantId, tableId, loading]) // Removed sessionId from dependencies

  // Listen for session info and menu updates
  useEffect(() => {
    if (!wsClient) return

    const handleSessionInfo = (data: any) => {
      console.log('Received session info:', data)
      if (data.sessionId && data.sessionId !== sessionId) {
        // Update sessionId and sessionStorage with new session
        setSessionId(data.sessionId)
        const sessionStr = sessionStorage.getItem('tabsy-session')
        if (sessionStr) {
          const session = JSON.parse(sessionStr)
          session.sessionId = data.sessionId
          sessionStorage.setItem('tabsy-session', JSON.stringify(session))
          console.log('Updated sessionId in storage:', data.sessionId)
        }
      }
    }

    const handleMenuUpdate = (data: any) => {
      if (data.type === 'menu_update' && data.updatedItems) {
        // Update menu items in real-time
        setMenuCategories(prevCategories => {
          return prevCategories.map(category => ({
            ...category,
            items: category.items.map(item => {
              const updatedItem = data.updatedItems.find((updated: any) => updated.id === item.id)
              if (updatedItem) {
                // Show toast for significant changes
                if (updatedItem.status !== item.status) {
                  if (updatedItem.status === MenuItemStatus.OUT_OF_STOCK) {
                    toast.warning(`${item.name} is now out of stock`, { icon: '⚠️' })
                  } else if (updatedItem.status === MenuItemStatus.AVAILABLE && item.status === MenuItemStatus.OUT_OF_STOCK) {
                    toast.success(`${item.name} is back in stock!`, { icon: '✅' })
                  }
                }
                return { ...item, ...updatedItem }
              }
              return item
            })
          }))
        })
      }
    }

    wsClient.on('session:info', handleSessionInfo)
    wsClient.on('menu:update', handleMenuUpdate)

    return () => {
      wsClient.off('session:info', handleSessionInfo)
      wsClient.off('menu:update', handleMenuUpdate)
    }
  }, [wsClient, sessionId])

  useEffect(() => {
    const loadData = async () => {
      if (!restaurantId || !tableId) {
        setError('Missing restaurant or table information')
        setLoading(false)
        return
      }

      try {
        // Load and set guest session if available
        const sessionStr = sessionStorage.getItem('tabsy-session')
        if (sessionStr) {
          const session = JSON.parse(sessionStr)
          if (session.sessionId) {
            api.setGuestSession(session.sessionId)
          }
        } else {
          // If no session exists, create a guest session without QR code validation
          console.log('MenuView: No session found, creating new guest session for direct access')
          try {
            // Don't send QR code for direct menu access - backend will skip validation
            const guestSessionResponse = await api.session.createGuest({
              tableId: tableId,
              restaurantId: restaurantId
              // Removed qrCode - backend only validates if provided
            })

            if (guestSessionResponse.success && guestSessionResponse.data?.sessionId) {
              const sessionData = {
                sessionId: guestSessionResponse.data.sessionId,
                restaurantId: restaurantId,
                tableId: tableId,
                createdAt: new Date().toISOString()
              }

              sessionStorage.setItem('tabsy-session', JSON.stringify(sessionData))
              api.setGuestSession(sessionData.sessionId) // Ensure session ID is set in API client
              console.log('MenuView: Created and stored guest session:', sessionData)
            } else {
              throw new Error('Failed to create guest session')
            }
          } catch (sessionError) {
            console.error('Failed to create guest session:', sessionError)
            // Set error state and exit entire function
            setError('Failed to create session. Please scan the QR code again.')
            setLoading(false)
            return // Exit entire useEffect, don't continue with menu loading
          }
        }

        // Validate session exists before proceeding
        const currentSessionId = api.getGuestSessionId()
        if (!currentSessionId) {
          console.error('MenuView: No valid session available after creation attempt')
          setError('Authentication required. Please scan the QR code to access the menu.')
          setLoading(false)
          return
        }
        console.log('MenuView: Valid session confirmed:', currentSessionId)

        // Load restaurant and table info from sessionStorage (stored by TableSessionInitializer)
        const tableInfoStr = sessionStorage.getItem('tabsy-table-info')
        if (tableInfoStr) {
          const tableInfo = JSON.parse(tableInfoStr)
          if (tableInfo.restaurant) {
            setRestaurant({
              id: tableInfo.restaurant.id,
              name: tableInfo.restaurant.name,
              description: tableInfo.restaurant.description || ''
            })
          }
          if (tableInfo.table) {
            setTable({
              id: tableInfo.table.id,
              number: tableInfo.table.number
            })
          }
        } else {
          // If not in sessionStorage, try to load from QR endpoint (public, no auth required)
          const qrCode = sessionStorage.getItem('tabsy-qr-code')
          if (qrCode) {
            const qrResponse = await api.qr.getTableInfo(qrCode)
            if (qrResponse.success && qrResponse.data) {
              const { restaurant, table } = qrResponse.data
              setRestaurant({
                id: restaurant.id,
                name: restaurant.name,
                description: restaurant.description || ''
              })
              setTable({
                id: table.id,
                number: table.number
              })
            }
          }
        }

        // Load menu items (this endpoint already supports guest access)
        const menuResponse = await api.menu.getActiveMenu(restaurantId)
        if (menuResponse.success && menuResponse.data) {
          const menuData = menuResponse.data

          // API returns an array of menus, get the first active menu or just the first menu
          const menus = Array.isArray(menuData) ? menuData : [menuData]
          const activeMenu = menus.find((menu: any) => menu.active) || menus[0]

          // Check if categories exist and is an array
          if (activeMenu && activeMenu.categories && Array.isArray(activeMenu.categories)) {
            // Filter for active categories and map fields correctly
            const activeCategories = activeMenu.categories
              .filter((cat: any) => cat.active)
              .map((cat: any) => ({
                ...cat,
                // Map database fields to frontend expected fields
                isActive: cat.active,
                items: cat.items?.map((item: any) => ({
                  ...item,
                  // Map database fields to frontend expected fields
                  basePrice: typeof item.price === 'object' ? Number(item.price) : item.price,
                  imageUrl: item.image,
                  status: item.active ? 'AVAILABLE' : 'OUT_OF_STOCK', // Convert boolean to enum
                  allergens: Array.isArray(item.allergyInfo?.other) ? item.allergyInfo.other : [],
                  dietaryTypes: Array.isArray(item.dietaryIndicators) ? item.dietaryIndicators : []
                })) || []
              }))

            setMenuCategories(activeCategories)

            // Extract unique category names
            const categoryNames = activeCategories.map((cat: any) => cat.name)
            setCategories(categoryNames)

            if (categoryNames.length > 0) {
              setSelectedCategory(categoryNames[0] || null)
            }
          } else {
            console.warn('Menu data does not contain valid categories array:', activeMenu)
            setMenuCategories([])
            setCategories([])
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

  const handleItemClick = (item: MenuItem) => {
    haptics.selectItem()
    setSelectedItem(item)
    setShowItemModal(true)
  }

  const handleCloseModal = () => {
    setShowItemModal(false)
    setSelectedItem(null)
  }

  const addToCart = (item: MenuItem, categoryName: string, quantity: number = 1, customizations?: Record<string, any>) => {
    // Haptic feedback for adding to cart
    haptics.addToCart()

    // Animate the add to cart action
    setCartAnimations(prev => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setCartAnimations(prev => ({ ...prev, [item.id]: false }))
    }, 600)

    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id)

      if (existingItem && !customizations) {
        // Simple quantity increase for existing items without customizations
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
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
          quantity,
          customizations,
          allergens: item.allergens,
          dietaryTypes: item.dietaryTypes,
        }
        return [...prevCart, cartItem]
      }
    })

    toast.success(`Added ${item.name} to cart`, {
      duration: 2000,
      icon: '🛒'
    })
  }

  const removeFromCart = (itemId: string) => {
    haptics.removeFromCart()

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
    return cart.reduce((total, item) => total + (Number(item.basePrice) * item.quantity), 0)
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      haptics.error()
      toast.error('Your cart is empty')
      return
    }

    haptics.modal()
    // Open cart drawer instead of navigating to full page
    setShowCartDrawer(true)
  }

  const handleUpdateCart = (updatedCart: CartItem[]) => {
    setCart(updatedCart)
    // Store cart in sessionStorage
    sessionStorage.setItem('tabsy-cart', JSON.stringify(updatedCart))
  }

  // Scroll to category function
  const scrollToCategory = (categoryName: string) => {
    setSelectedCategory(categoryName)
    const element = categoryRefs.current[categoryName]
    if (element) {
      const headerOffset = 140 // Account for sticky header + category tabs
      const elementPosition = element.offsetTop - headerOffset
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      })
    }
  }

  // Get items for selected category or search
  const getFilteredItems = (): { category: string; items: MenuItem[] }[] => {
    if (searchQuery.trim()) {
      // Search across all categories
      const searchResults: { category: string; items: MenuItem[] }[] = []
      menuCategories.forEach(category => {
        const matchingItems = category.items.filter(item =>
          item.status === MenuItemStatus.AVAILABLE &&
          (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        if (matchingItems.length > 0) {
          searchResults.push({ category: category.name, items: matchingItems })
        }
      })
      return searchResults
    }

    // Show all categories or just selected one
    if (selectedCategory) {
      const category = menuCategories.find(cat => cat.name === selectedCategory)
      return category ? [{
        category: category.name,
        items: category.items.filter(item => item.status === MenuItemStatus.AVAILABLE)
      }] : []
    }

    // Show all categories
    return menuCategories.map(category => ({
      category: category.name,
      items: category.items.filter(item => item.status === MenuItemStatus.AVAILABLE)
    })).filter(cat => cat.items.length > 0)
  }

  // Get dietary icon
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

  const filteredData = getFilteredItems()

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <HeaderSkeleton />

        {/* Categories Skeleton */}
        <div className="bg-surface border-b">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex space-x-2 overflow-x-auto pb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-gray-200 rounded animate-pulse flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>

        {/* Menu Content Skeleton */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <MenuCategorySkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-status-error mb-2">Error</h1>
          <p className="text-content-secondary mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-mesh" ref={pullToRefresh.bind}>
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        pullDistance={pullToRefresh.pullDistance}
        canRefresh={pullToRefresh.canRefresh}
        progress={pullToRefresh.progress}
      />

      {/* Header */}
      <div className="glass-header sticky top-0 z-20 shadow-soft">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Restaurant Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-content-primary mb-1">
                {restaurant?.name || 'Menu'}
              </h1>
              <div className="flex items-center space-x-2">
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  Table {table?.number}
                </div>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                <span className="text-sm text-content-secondary font-medium">
                  Now serving
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Search Button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(!showSearch)}
                  className="w-12 h-12 p-0 rounded-full btn-glass"
                >
                  {showSearch ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </Button>
              </motion.div>

              {/* Cart Button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setShowCartDrawer(true)}
                  disabled={cart.length === 0}
                  className={`relative px-6 py-3 rounded-full transition-all duration-200 ${
                    cart.length > 0
                      ? 'btn-gradient text-white shadow-medium'
                      : 'btn-glass text-content-secondary'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <ShoppingCart className="w-4 h-4" />
                      {cart.length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                          {cart.length}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">
                      {cart.length > 0 ? `$${getTotalPrice().toFixed(2)}` : 'Cart'}
                    </span>
                  </div>
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-content-tertiary w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for dishes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl search-glass focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-content-primary placeholder-content-tertiary font-medium shadow-soft"
                    autoFocus
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-content-tertiary/10 hover:bg-content-tertiary/20 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-content-tertiary" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Categories */}
      {!searchQuery && categories.length > 1 && (
        <div className="glass-surface sticky top-[112px] z-10 shadow-soft">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-3 rounded-full font-medium text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                  !selectedCategory
                    ? 'category-pill-active'
                    : 'category-pill'
                }`}
              >
                All Categories
              </motion.button>
              {categories.map(category => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollToCategory(category)}
                  className={`px-6 py-3 rounded-full font-medium text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                    selectedCategory === category
                      ? 'category-pill-active'
                      : 'category-pill'
                  }`}
                >
                  {category}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search Results Header */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 glass-card rounded-2xl p-6 shadow-medium"
          >
            <h2 className="text-xl font-bold text-content-primary mb-2">
              Search results for "<span className="text-primary">{searchQuery}</span>"
            </h2>
            <p className="text-content-secondary">
              Found <span className="font-semibold text-primary">{filteredData.reduce((total, cat) => total + cat.items.length, 0)}</span> delicious dishes
            </p>
          </motion.div>
        )}

        {/* Menu Categories and Items */}
        <div className="space-y-12">
          {filteredData.map(({ category, items }) => (
            <motion.div
              key={category}
              ref={el => { categoryRefs.current[category] = el }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Category Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-content-primary mb-2">{category}</h2>
                <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
              </div>

              {/* Category Items */}
              <div className="grid gap-6">
                {items.map(item => {
                  const quantity = getCartItemQuantity(item.id)
                  const isAnimating = cartAnimations[item.id]

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="card-modern rounded-3xl shadow-medium group overflow-hidden relative"
                    >
                      {/* Make entire card clickable for item details */}
                      <div
                        className="absolute inset-0 cursor-pointer z-10"
                        onClick={() => handleItemClick(item)}
                      />

                      <div className="p-6 relative z-20">
                        <div className="flex gap-6">
                          {/* Item Image */}
                          {item.imageUrl && (
                            <div className="flex-shrink-0">
                              <div className="relative overflow-hidden rounded-2xl shadow-md">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                />
                                {quantity > 0 && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg"
                                  >
                                    {quantity}
                                  </motion.div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              </div>
                            </div>
                          )}

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="text-xl font-bold text-content-primary truncate pr-2 group-hover:text-primary transition-colors duration-200">
                                {item.name}
                              </h3>
                              <div className="flex flex-col items-end">
                                <span className="text-2xl font-bold text-primary">
                                  ${Number(item.basePrice).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <p className="text-content-secondary text-base mb-4 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>

                            {/* Dietary and Allergen Info */}
                            <div className="space-y-3 mb-4">
                              {item.dietaryTypes && item.dietaryTypes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {item.dietaryTypes.map(diet => (
                                    <span
                                      key={diet}
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full font-semibold border border-primary/20"
                                    >
                                      {getDietaryIcon(diet)}
                                      <span>{diet.replace('_', ' ')}</span>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {item.allergens && item.allergens.length > 0 && (
                                <div className="text-xs text-status-warning-dark bg-status-warning-light px-3 py-2 rounded-xl border border-status-warning-border">
                                  <span className="font-semibold">Contains:</span> {item.allergens.map(allergen => allergen.replace('_', ' ')).join(', ')}
                                </div>
                              )}
                            </div>

                            {/* Add to Cart Controls */}
                            <div className="flex items-center justify-between">
                              <div>
                                {item.status !== MenuItemStatus.AVAILABLE && (
                                  <span className="text-status-error-dark text-sm font-semibold bg-status-error-light px-3 py-2 rounded-full border border-status-error-border">
                                    {item.status === MenuItemStatus.OUT_OF_STOCK ? 'Out of Stock' : 'Currently unavailable'}
                                  </span>
                                )}
                              </div>

                              {item.status === MenuItemStatus.AVAILABLE && (
                                <div className="flex items-center space-x-3">
                                  {quantity > 0 ? (
                                    <div className="flex items-center space-x-3 bg-primary/5 rounded-2xl p-2 border border-primary/20">
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          removeFromCart(item.id)
                                        }}
                                        className="w-10 h-10 btn-glass rounded-full flex items-center justify-center shadow-soft"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </motion.button>

                                      <span className="text-xl font-bold min-w-[2rem] text-center text-primary">
                                        {quantity}
                                      </span>

                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          addToCart(item, category)
                                        }}
                                        className="w-10 h-10 btn-gradient text-white rounded-full flex items-center justify-center shadow-medium"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </motion.button>
                                    </div>
                                  ) : (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        addToCart(item, category)
                                      }}
                                      className="btn-gradient text-white px-6 py-3 rounded-2xl font-semibold shadow-medium hover:shadow-strong transition-all duration-200 flex items-center space-x-2"
                                    >
                                      <Plus className="w-5 h-5" />
                                      <span>Add to Cart</span>
                                    </motion.button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredData.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl flex items-center justify-center">
              {searchQuery ? (
                <Search className="w-10 h-10 text-primary" />
              ) : (
                <Utensils className="w-10 h-10 text-primary" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-content-primary mb-3">
              {searchQuery ? 'No dishes found' : 'No items available'}
            </h3>
            <p className="text-content-secondary text-lg max-w-md mx-auto mb-6">
              {searchQuery ? `We couldn't find any dishes matching "${searchQuery}". Try a different search term.` : 'Check back later for delicious options!'}
            </p>
            {searchQuery && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSearchQuery('')}
                className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-2xl font-semibold shadow-lg transition-all duration-200"
              >
                Clear search
              </motion.button>
            )}
          </motion.div>
        )}
      </div>

      {/* Floating Cart Button (Mobile) */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-8 left-6 right-6 md:hidden z-50"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCartDrawer(true)}
              className="w-full floating-cart text-white font-bold py-5 px-6 rounded-3xl transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-accent text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg"
                    >
                      {cart.length}
                    </motion.div>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold">View Cart</div>
                    <div className="text-sm text-white/80">{cart.length} {cart.length === 1 ? 'item' : 'items'}</div>
                  </div>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm">
                  <span className="text-xl font-bold">
                    ${getTotalPrice().toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={showItemModal}
        onClose={handleCloseModal}
        onAddToCart={(item, quantity, customizations) => {
          const categoryName = menuCategories.find(cat =>
            cat.items.some(catItem => catItem.id === item.id)
          )?.name || 'Menu Item'
          addToCart(item, categoryName, quantity, customizations)
          handleCloseModal()
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        cart={cart}
        onUpdateCart={handleUpdateCart}
      />
    </div>
  )
}

// Add custom styles for hiding scrollbar
const styles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}