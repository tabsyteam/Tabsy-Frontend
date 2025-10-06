'use client'

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '@/components/providers/api-provider'
import { Button } from '@tabsy/ui-components'
import {
  ArrowLeft,
  Filter,
  Grid,
  List,
  SlidersHorizontal,
  Star,
  MapPin,
  Clock,
  Users,
  X,
  Check,
  Search,
  ShoppingBag
} from 'lucide-react'
import { toast } from 'sonner'
import { MenuItem, MenuCategory, MenuItemStatus, DietaryType, AllergyInfo, SpiceLevel, Restaurant, Table } from '@tabsy/shared-types'
import { ItemDetailModal } from './ItemDetailModal'
import { CartDrawer } from '../cart/CartDrawer'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator'
import { useCart } from '@/hooks/useCart'
import { useMenuItemActions } from '@/hooks/useMenuItemActions'
import { unifiedSessionStorage } from '@/lib/unifiedSessionStorage'
import { SessionManager } from '@/lib/session'
import { useMenuData } from '@/hooks/useMenuData'
import { useTableInfo } from '@/hooks/useTableInfo'
import { useGuestSession } from '@/hooks/useGuestSession'
import { RestaurantProvider, useRestaurantOptional } from '@/contexts/RestaurantContext'

// Import our new modern components
import SearchBar from '@/components/navigation/SearchBar'
import BottomNav from '@/components/navigation/BottomNav'
import MenuItemCard from '@/components/cards/MenuItemCard'
import CategoryCard from '@/components/cards/CategoryCard'
import { STORAGE_KEYS } from '@/constants/storage'


interface Category {
  id: string
  name: string
  description?: string
  image?: string
  icon?: string
  itemCount?: number
  isActive?: boolean
}

interface FilterState {
  dietary: DietaryType[]
  spiceLevel: number[]
  priceRange: { min: number; max: number }
  showFavoritesOnly: boolean
}

const convertAllergyInfoToArray = (allergyInfo?: AllergyInfo): string[] | undefined => {
  if (!allergyInfo) return undefined

  const allergies: string[] = []

  if (allergyInfo.containsEggs) allergies.push('Eggs')
  if (allergyInfo.containsNuts) allergies.push('Nuts')
  if (allergyInfo.containsDairy) allergies.push('Dairy')
  if (allergyInfo.containsGluten) allergies.push('Gluten')
  if (allergyInfo.containsSeafood) allergies.push('Seafood')

  if (allergyInfo.other && allergyInfo.other.length > 0) {
    allergies.push(...allergyInfo.other)
  }

  return allergies.length > 0 ? allergies : undefined
}

const searchAllergyInfo = (query: string, allergyInfo?: AllergyInfo): boolean => {
  if (!allergyInfo) return false

  const lowerQuery = query.toLowerCase()

  if (allergyInfo.containsEggs && 'eggs'.includes(lowerQuery)) return true
  if (allergyInfo.containsNuts && 'nuts'.includes(lowerQuery)) return true
  if (allergyInfo.containsDairy && 'dairy'.includes(lowerQuery)) return true
  if (allergyInfo.containsGluten && 'gluten'.includes(lowerQuery)) return true
  if (allergyInfo.containsSeafood && 'seafood'.includes(lowerQuery)) return true

  return allergyInfo.other?.some(allergen => allergen.toLowerCase().includes(lowerQuery)) || false
}

const isItemNew = (createdAt: string): boolean => {
  try {
    const createdDate = new Date(createdAt)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))

    return createdDate >= thirtyDaysAgo
  } catch (error) {
    console.warn('[MenuView] Invalid createdAt date:', createdAt)
    return false
  }
}

export function MenuView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()
  const { cart, cartCount, addToCart, updateCartItem, updateQuantity, getItemQuantity, removeFromCart } = useCart()
  const searchBarRef = useRef<HTMLDivElement>(null)

  // Get currency from context with sessionStorage fallback (prevents $ flash on navigation)
  const restaurantContext = useRestaurantOptional()
  const restaurantCurrency = restaurantContext?.currency || 'USD'

  // URL parameters with validation
  const urlRestaurantId = searchParams.get('restaurant')
  const urlTableId = searchParams.get('table')
  const urlTableSessionId = searchParams.get('tableSession')
  const urlGuestSessionId = searchParams.get('guestSession')
  const qrCode = searchParams.get('qr')

  // Validate URL parameters and fall back to session if invalid
  const session = SessionManager.getDiningSession()
  const hasValidUrlParams = SessionManager.validateUrlParams({
    restaurant: urlRestaurantId,
    table: urlTableId
  })

  const restaurantId = hasValidUrlParams ? urlRestaurantId : session?.restaurantId
  const tableId = hasValidUrlParams ? urlTableId : session?.tableId

  // ✅ NEW: Use React Query hooks for data fetching (prevents duplicate API calls)
  const {
    data: tableInfoData,
    isLoading: isLoadingTable,
    error: tableError
  } = useTableInfo({
    qrCode,
    enabled: !!qrCode
  })

  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError
  } = useGuestSession({
    qrCode: qrCode || '',
    tableId: tableId || '',
    restaurantId: restaurantId || '',
    enabled: !!qrCode && !!tableId && !!restaurantId
  })

  const {
    data: menuCategories = [],
    isLoading: isLoadingMenu,
    error: menuError,
    refetch: refetchMenu
  } = useMenuData({
    restaurantId,
    enabled: !!restaurantId
  })

  // Derive state from React Query data
  const restaurant = tableInfoData?.restaurant || null
  const table = tableInfoData?.table || null
  const loading = isLoadingTable || isLoadingSession || isLoadingMenu
  const error = tableError?.message || sessionError?.message || menuError?.message || null

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dietary: [],
    spiceLevel: [],
    priceRange: { min: 0, max: 100 },
    showFavoritesOnly: false
  })

  // Modal state
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedCartItem, setSelectedCartItem] = useState<any>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCartDrawer, setShowCartDrawer] = useState(false)

  // Voice search state
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchSupported, setVoiceSearchSupported] = useState(false)

  // Scroll shadow state
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)
  const categoriesScrollRef = useRef<HTMLDivElement>(null)

  // Pull to refresh - now uses React Query refetch
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetchMenu()
      toast.success('Menu refreshed!', { icon: '🔄' })
    }
  })

  // Session state
  const [sessionReady, setSessionReady] = useState(false)

  // Load favorites from localStorage
  const loadFavoritesFromStorage = useCallback((): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES(restaurantId))
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch (error) {
      console.error('Failed to load favorites:', error)
      return new Set()
    }
  }, [restaurantId])

  // Save favorites to localStorage
  const saveFavoritesToStorage = useCallback((favSet: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES(restaurantId), JSON.stringify(Array.from(favSet)))
    } catch (error) {
      console.error('Failed to save favorites:', error)
    }
  }, [restaurantId])

  // Load recent searches
  const loadRecentSearches = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES(restaurantId))
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load recent searches:', error)
      return []
    }
  }, [restaurantId])

  // Save recent search
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return

    try {
      const recent = loadRecentSearches()
      const filtered = recent.filter(item => item !== query)
      const updated = [query, ...filtered].slice(0, 5)
      localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES(restaurantId), JSON.stringify(updated))
      setRecentSearches(updated)
    } catch (error) {
      console.error('Failed to save recent search:', error)
    }
  }, [restaurantId, loadRecentSearches])

  // ✅ REMOVED: Old loadMenuData function - now handled by React Query hooks
  // Session management effects
  useEffect(() => {
    // Set guest session in API client when session data is available
    if (sessionData?.sessionId) {
      console.log('[MenuView] Setting guest session from React Query:', sessionData.sessionId)
      api.setGuestSession(sessionData.sessionId)
      setSessionReady(true)
    }
  }, [sessionData, api])

  // Cache menu data for cart editing
  useEffect(() => {
    if (menuCategories && menuCategories.length > 0) {
      try {
        const menuDataToCache = {
          categories: menuCategories,
          cachedAt: new Date().toISOString()
        }
        sessionStorage.setItem(STORAGE_KEYS.MENU_DATA, JSON.stringify(menuDataToCache))
        console.log('[MenuView] Menu data cached for cart editing')
      } catch (error) {
        console.error('[MenuView] Failed to cache menu data:', error)
      }
    }
  }, [menuCategories])

  // Load favorites and recent searches
  useEffect(() => {
    if (restaurantId) {
      setFavorites(loadFavoritesFromStorage())
      setRecentSearches(loadRecentSearches())
    }
  }, [restaurantId, loadFavoritesFromStorage, loadRecentSearches])

  // Voice search setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setVoiceSearchSupported(!!SpeechRecognition)
    }
  }, [])

  // Initialize dining session when valid URL parameters are present
  useEffect(() => {
    if (hasValidUrlParams && urlRestaurantId && urlTableId) {
      // Get existing session to preserve sessionId and other important fields
      const existingSession = SessionManager.getDiningSession()

      // Only update if no existing session, or if restaurant/table changed
      if (!existingSession ||
          existingSession.restaurantId !== urlRestaurantId ||
          existingSession.tableId !== urlTableId ||
          existingSession.tableSessionId !== urlTableSessionId) {

        // Preserve existing session data if available
        SessionManager.setDiningSession({
          restaurantId: urlRestaurantId,
          tableId: urlTableId,
          restaurantName: restaurant?.name,
          tableName: table?.number,
          // Use URL parameters if available, otherwise preserve existing
          sessionId: existingSession?.sessionId,
          tableSessionId: urlTableSessionId || existingSession?.tableSessionId,
          createdAt: existingSession?.createdAt || Date.now() // Preserve original creation time or use current
        })
      }
    }
  }, [hasValidUrlParams, urlRestaurantId, urlTableId, urlTableSessionId, restaurant?.name, table?.number])

  // Process categories for display
  const processedCategories = useMemo((): Category[] => {
    // Ensure menuCategories is defined and is an array
    const safeCategories = menuCategories || []

    const allCategory: Category = {
      id: 'all',
      name: 'All',
      itemCount: safeCategories.reduce((total, cat) => total + (cat.items?.length || 0), 0),
      isActive: selectedCategory === 'all'
    }

    const categoryItems: Category[] = safeCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      itemCount: cat.items?.length || 0,
      isActive: selectedCategory === cat.id,
      icon: cat.name
    }))

    return [allCategory, ...categoryItems]
  }, [menuCategories, selectedCategory])

  // Filter and search menu items
  const filteredMenuItems = useMemo(() => {
    let items: MenuItem[] = []

    // Get items from selected category or all categories
    const safeMenuCategories = menuCategories || []
    if (selectedCategory === 'all') {
      items = safeMenuCategories.flatMap(cat => cat.items || [])
    } else {
      const category = safeMenuCategories.find(cat => cat.id === selectedCategory)
      items = category?.items || []
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        searchAllergyInfo(query, item.allergyInfo) ||
        item.dietaryTypes?.some(diet => diet.toLowerCase().includes(query))
      )
    }

    // Apply dietary filters
    if (filters.dietary.length > 0) {
      items = items.filter(item =>
        item.dietaryTypes?.some(diet => filters.dietary.includes(diet as DietaryType))
      )
    }

    // Apply spice level filters
    if (filters.spiceLevel.length > 0) {
      items = items.filter(item =>
        item.spicyLevel && filters.spiceLevel.includes(item.spicyLevel)
      )
    }

    // Apply price range filter
    items = items.filter(item =>
      (item.price ?? item.basePrice) >= filters.priceRange.min && (item.price ?? item.basePrice) <= filters.priceRange.max
    )

    // Apply favorites filter
    if (filters.showFavoritesOnly) {
      items = items.filter(item => favorites.has(item.id))
    }

    return items
  }, [menuCategories, selectedCategory, searchQuery, filters, favorites])

  // Cart operations using context
  const handleAddToCart = useCallback((item: MenuItem, quantity: number = 1) => {
    console.log('[MenuView] -- Adding to cart:', { item, quantity })
    // Find the category name for this item
    const categoryName = menuCategories
      ?.find(category => category.items?.some(categoryItem => categoryItem.id === item.id))
      ?.name || 'Unknown Category'

    addToCart(item, quantity, {}, categoryName)
  }, [addToCart, menuCategories])

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

  // Search handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      saveRecentSearch(query)
    }
  }, [saveRecentSearch])

  const handleVoiceSearch = useCallback(() => {
    if (!voiceSearchSupported) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      toast.info('Listening...', { icon: '🎤' })
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) {
        setSearchQuery(transcript)
        setShowSearch(true)
        saveRecentSearch(transcript)
        toast.success(`Voice search: "${transcript}"`, { icon: '🎤' })
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
      toast.error('Voice search failed. Please try again.')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }, [voiceSearchSupported, saveRecentSearch])

  // Filter handlers
  const toggleFilter = useCallback(() => {
    setShowFilters(!showFilters)
  }, [showFilters])

  const clearFilters = useCallback(() => {
    setFilters({
      dietary: [],
      spiceLevel: [],
      priceRange: { min: 0, max: 100 },
      showFavoritesOnly: false
    })
  }, [])

  const hasActiveFilters = useMemo(() => {
    return filters.dietary.length > 0 ||
           filters.spiceLevel.length > 0 ||
           filters.priceRange.min > 0 ||
           filters.priceRange.max < 100 ||
           filters.showFavoritesOnly
  }, [filters])

  // Check scroll shadows
  const updateScrollShadows = useCallback(() => {
    const container = categoriesScrollRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const scrollThreshold = 5 // Minimum scroll distance to show fade

    setShowLeftShadow(scrollLeft > scrollThreshold)
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - scrollThreshold)
  }, [])

  // Update shadows on categories change and mount
  useEffect(() => {
    updateScrollShadows()
    // Small delay to ensure proper calculation after render
    const timeout = setTimeout(updateScrollShadows, 100)
    return () => clearTimeout(timeout)
  }, [processedCategories, updateScrollShadows])


  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Enhanced Loading Header */}
        <header className="bg-surface border-b border sticky top-0 z-40 backdrop-blur-lg bg-opacity-95">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <motion.div
                  className="h-8 w-48 bg-gradient-to-r from-surface-secondary to-surface-tertiary rounded-lg mb-3"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="flex items-center gap-3">
                  <motion.div
                    className="h-7 w-20 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-secondary rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className="h-4 w-20 bg-surface-secondary rounded"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-12 h-12 rounded-full bg-surface-secondary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="w-12 h-12 rounded-full bg-surface-secondary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
            </div>

            {/* Enhanced Search Bar Skeleton */}
            <motion.div
              className="h-12 bg-gradient-to-r from-surface-secondary to-surface-tertiary rounded-2xl relative overflow-hidden"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-surface/30 to-transparent"
                animate={{ x: [-200, 400] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </header>

        {/* Enhanced Loading Categories */}
        <section className="relative py-3">
          <div
            className="flex gap-2 overflow-x-auto scrollbar-hide py-2"
            style={{
              paddingLeft: '1rem',
              paddingRight: '1rem',
              marginLeft: '0.5rem',
              marginRight: '0.5rem'
            }}
          >
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0">
                <motion.div
                  className="h-10 w-20 bg-gradient-to-r from-surface-secondary to-surface-tertiary rounded-full"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Enhanced Loading Grid */}
        <main className="px-4 py-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl overflow-hidden shadow-sm border border relative"
              >
                {/* Image skeleton with shimmer */}
                <div className="aspect-[4/3] bg-gradient-to-br from-surface-secondary to-surface-tertiary relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-surface/20 to-transparent"
                    animate={{ x: [-100, 200] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                {/* Content skeleton */}
                <div className="p-3 space-y-2">
                  <motion.div
                    className="h-4 bg-gradient-to-r from-surface-secondary to-surface-tertiary rounded w-3/4"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  />
                  <motion.div
                    className="h-3 bg-gradient-to-r from-surface-secondary to-surface-tertiary rounded w-1/2"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.2 }}
                  />

                  {/* Badges skeleton */}
                  <div className="flex gap-1 pt-1">
                    {[...Array(2)].map((_, j) => (
                      <motion.div
                        key={j}
                        className="h-5 w-12 bg-gradient-to-r from-status-success/20 to-status-success/40 rounded-full"
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: j * 0.2 }}
                      />
                    ))}
                  </div>

                  {/* Price and button skeleton */}
                  <div className="flex items-center justify-between pt-2">
                    <motion.div
                      className="h-6 w-14 bg-gradient-to-r from-primary/30 to-accent/30 rounded"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="h-8 w-8 bg-gradient-to-r from-primary/30 to-accent/30 rounded-lg"
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [0.98, 1.02, 0.98]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-h1 font-bold text-status-error mb-4">Oops!</h1>
          <p className="text-body text-content-secondary mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="btn-food bg-primary text-primary-foreground"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <RestaurantProvider restaurant={restaurant} table={table} isLoading={loading}>
      <div className="min-h-screen bg-background pb-24" ref={pullToRefresh.bind}>
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        pullDistance={pullToRefresh.pullDistance}
        canRefresh={pullToRefresh.canRefresh}
        progress={pullToRefresh.progress}
      />

      {/* Restaurant Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border-b border sticky top-0 z-40 backdrop-blur-lg bg-opacity-95"
      >
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-h1 font-bold text-content-primary mb-2">
                {restaurant?.name || 'Menu'}
              </h1>
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-primary bg-opacity-10 text-primary px-3 py-1.5 rounded-full"
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span className="text-caption font-semibold">
                      Table {table?.number}
                    </span>
                  </div>
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-2 h-2 bg-secondary rounded-full"
                />
                <span className="text-caption text-content-secondary font-medium">
                  Now serving
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleFilter}
                className={`p-3 rounded-full transition-all duration-200 ${
                  hasActiveFilters
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-secondary text-content-secondary hover:bg-interactive-hover'
                }`}
              >
                <Filter size={20} />
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full"></div>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
                className="p-3 rounded-full bg-surface-secondary text-content-secondary hover:bg-interactive-hover transition-all duration-200"
              >
                {layout === 'grid' ? <List size={20} /> : <Grid size={20} />}
              </motion.button>
            </div>
          </div>

          {/* Search Bar */}
          <div ref={searchBarRef}>
            <SearchBar
              placeholder="Search for delicious food..."
              onSearch={handleSearch}
              onVoiceSearch={voiceSearchSupported ? handleVoiceSearch : undefined}
              showRecentSearches={true}
              recentSearches={recentSearches}
              autoFocus={showSearch}
            />
          </div>
        </div>
      </motion.header>

      {/* Categories */}
      <motion.section
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="relative py-3"
      >
        {/* Subtle scroll fade indicators */}
        <AnimatePresence>
          {showLeftShadow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
              style={{
                background: 'linear-gradient(to right, rgba(var(--background), 0.9) 0%, rgba(var(--background), 0) 100%)'
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRightShadow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
              style={{
                background: 'linear-gradient(to left, rgba(var(--background), 0.9) 0%, rgba(var(--background), 0) 100%)'
              }}
            />
          )}
        </AnimatePresence>

        <div
          ref={categoriesScrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide py-2"
          onScroll={updateScrollShadows}
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            marginLeft: '0.5rem',
            marginRight: '0.5rem'
          }}
        >
          {processedCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex-shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              <CategoryCard
                category={category}
                onClick={setSelectedCategory}
                layout="horizontal"
                showItemCount={true}
              />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border bg-surface-secondary"
          >
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-h3 font-semibold">Filters</h3>
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                >
                  Clear All
                </Button>
              </div>

              {/* Quick Filters */}
              <div className="space-y-4">
                {/* Favorites Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, showFavoritesOnly: !prev.showFavoritesOnly }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      filters.showFavoritesOnly
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface border border hover:bg-interactive-hover'
                    }`}
                  >
                    <Star size={16} />
                    <span className="text-body-sm font-medium">Favorites Only</span>
                  </button>
                </div>

                {/* Dietary Filters */}
                <div>
                  <h4 className="text-body-sm font-medium text-content-secondary mb-2">Dietary</h4>
                  <div className="flex flex-wrap gap-2">
                    {['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE'].map((diet) => (
                      <button
                        key={diet}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            dietary: prev.dietary.includes(diet as DietaryType)
                              ? prev.dietary.filter(d => d !== diet)
                              : [...prev.dietary, diet as DietaryType]
                          }))
                        }}
                        className={`px-3 py-1.5 rounded-full text-caption transition-all duration-200 ${
                          filters.dietary.includes(diet as DietaryType)
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-surface border border hover:bg-interactive-hover'
                        }`}
                      >
                        {diet.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spice Level */}
                <div>
                  <h4 className="text-body-sm font-medium text-content-secondary mb-2">Spice Level</h4>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            spiceLevel: prev.spiceLevel.includes(level)
                              ? prev.spiceLevel.filter(l => l !== level)
                              : [...prev.spiceLevel, level]
                          }))
                        }}
                        className={`px-3 py-1.5 rounded-full text-caption transition-all duration-200 ${
                          filters.spiceLevel.includes(level)
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-surface border border hover:bg-interactive-hover'
                        }`}
                      >
                        {'🌶️'.repeat(level)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      {(searchQuery || hasActiveFilters) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 border-b border bg-surface-secondary"
        >
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-content-secondary">
              {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
            </span>
            {(searchQuery || hasActiveFilters) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  clearFilters()
                }}
                className="text-primary text-body-sm font-medium hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Menu Items Grid */}
      <main className="px-4 py-6">
        {filteredMenuItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-content-tertiary" />
            </div>
            <h3 className="text-h3 font-semibold text-content-primary mb-2">
              No items found
            </h3>
            <p className="text-body text-content-secondary mb-4">
              {searchQuery
                ? `No items match "${searchQuery}"`
                : 'Try adjusting your filters or search terms'
              }
            </p>
            <Button
              onClick={() => {
                setSearchQuery('')
                clearFilters()
                setSelectedCategory('all')
              }}
              variant="outline"
              className="btn-food"
            >
              Show All Items
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`grid ${
              layout === 'grid'
                ? 'grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 gap-4'
            }`}
          >
            {filteredMenuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MenuItemCard
                  item={{
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: (() => {
                      // Smart price handling: detect if price is in cents and convert to dollars
                      const rawPrice = item.price ?? item.basePrice;
                      let finalPrice = rawPrice;

                      // If price looks like it's in cents (e.g., 1499 for $14.99), convert it
                      if (rawPrice > 100 && rawPrice % 1 === 0) {
                        // Whole number over 100 - likely cents, convert to dollars
                        finalPrice = rawPrice / 100;
                      }

                      return finalPrice;
                    })(),
                    image: item.image,
                    category: '', // This would need to be resolved
                    dietaryIndicators: item.dietaryTypes,
                    allergyInfo: convertAllergyInfoToArray(item.allergyInfo),
                    spicyLevel: item.spicyLevel,
                    preparationTime: item.preparationTime, // Use real preparation time from backend
                    isPopular: item.tags?.includes('popular') || false,
                    isNew: isItemNew(item.createdAt),
                    options: item.options // ✅ ADD THIS - Pass options to MenuItemCard
                  }}
                  quantity={getItemQuantity(item.id)}
                  onQuantityChange={(itemId, newQuantity) => {
                    // Set absolute quantity for items without special instructions
                    const existingItems = cart.filter(cartItem => cartItem.id === itemId)
                    if (existingItems.length > 0) {
                      // Update existing item with absolute quantity
                      handleUpdateQuantity(itemId, newQuantity)
                    } else {
                      console.log('[MenuView] No existing cart item found, adding new item with quantity:', newQuantity)
                      // Add new item with specified quantity
                      handleAddToCart(item, newQuantity)
                    }
                  }}
                  onAddToCart={(menuItem, quantity) => handleAddToCart(item, quantity)}
                  onToggleFavorite={toggleFavorite}
                  onItemClick={(menuItem) => {
                    console.log('[MenuView] onItemClick called with menuItem:', menuItem)
                    console.log('[MenuView] Original item from API:', item)

                    // Map the data structure to match what ItemDetailModal expects
                    const modalItem = {
                      ...item,
                      basePrice: item.price || item.basePrice || 0,
                      dietaryTypes: item.dietaryTypes || [],
                      options: item.options || [],
                      imageUrl: item.image || item.imageUrl,
                      spicyLevel: item.spicyLevel || 0,
                      allergyInfo: item.allergyInfo || undefined,
                      nutritionalInfo: item.nutritionalInfo || undefined
                    }

                    // Check if this item is already in cart (find first matching item for customization editing)
                    const existingCartItems = cart.filter(cartItem => cartItem.id === item.id)
                    const existingCartItem = existingCartItems.length > 0 ? existingCartItems[0] : null

                    console.log('[MenuView] Mapped item for modal:', modalItem)
                    console.log('[MenuView] Existing cart item:', existingCartItem)

                    setSelectedItem(modalItem)
                    setSelectedCartItem(existingCartItem)
                    setShowItemModal(true)
                    console.log('[MenuView] Modal should now be visible')
                  }}
                  isFavorite={favorites.has(item.id)}
                  layout={layout}
                  showQuickAdd={true}
                  currency={restaurantCurrency}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <motion.button
          initial={{ scale: 0, y: 100 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0, y: 100 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCartDrawer(true)}
          className="fixed bottom-24 right-4 z-40 bg-primary text-primary-foreground p-4 rounded-full shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 bg-status-error text-status-error-foreground text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1 ring-2 ring-primary"
            >
              {cartCount > 99 ? '99+' : cartCount}
            </motion.div>
          </div>
          <span className="sr-only">View Cart ({cartCount} items)</span>
        </motion.button>
      )}

      {/* Bottom Navigation */}
      <BottomNav cartItemCount={cartCount} />

      {/* Modals */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false)
          setSelectedCartItem(null)
        }}
        existingQuantity={selectedItem ? getItemQuantity(selectedItem.id) : 0}
        isFavorite={selectedItem ? favorites.has(selectedItem.id) : false}
        onToggleFavorite={toggleFavorite}
        existingCartItem={selectedCartItem}
        onAddToCart={(item, quantity, customizations, options) => {
          console.log('[MenuView] -- onAddToCart from ItemDetailModal:', { item, quantity, customizations, options })

          if (!item) {
            console.error('No item provided to add to cart')
            return
          }
          const categoryName = menuCategories
            ?.find(category => category.items?.some(categoryItem => categoryItem.id === item.id))
            ?.name || 'Unknown Category'

          // Extract special instructions from customizations
          const specialInstructions = customizations?.specialInstructions

          // Let the cart hook handle ALL consolidation logic with enhanced options
          addToCart(item, quantity, customizations, categoryName, specialInstructions, options)
        }}
        onUpdateCartItem={(cartItemId, item, quantity, customizations, specialInstructions, options) => {
          console.log('[MenuView] -- onUpdateCartItem from ItemDetailModal:', { cartItemId, item, quantity, customizations, specialInstructions, options })

          if (!item) {
            console.error('No item provided to update in cart')
            return
          }

          // Use the cart hook's updateCartItem function
          updateCartItem(cartItemId, item, quantity, customizations, specialInstructions, options)
        }}
      />

      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        onEditItem={(cartItem) => {
          console.log('[MenuView] Editing cart item:', cartItem)

          // Map cart item back to MenuItem format for the modal
          const modalItem = {
            id: cartItem.id,
            name: cartItem.name,
            description: cartItem.description,
            basePrice: cartItem.basePrice,
            price: cartItem.basePrice,
            image: cartItem.imageUrl,
            imageUrl: cartItem.imageUrl,
            dietaryTypes: cartItem.dietaryTypes || [],
            options: [], // Will be loaded from the original menu item
            spicyLevel: cartItem.spicyLevel || 0,
            allergyInfo: cartItem.allergyInfo,
            nutritionalInfo: undefined, // Will be loaded from original menu item
            categoryId: cartItem.categoryId
          }

          // Find the original menu item to get options and other data
          const originalMenuItem = menuCategories
            ?.flatMap(cat => cat.items || [])
            .find(item => item.id === cartItem.id)

          if (originalMenuItem) {
            modalItem.options = originalMenuItem.options || []
            modalItem.nutritionalInfo = originalMenuItem.nutritionalInfo
          }

          setSelectedItem(modalItem)
          setSelectedCartItem(cartItem)
          setShowItemModal(true)
          setShowCartDrawer(false) // Close cart drawer when opening edit modal
        }}
      />
    </div>
    </RestaurantProvider>
  )
}