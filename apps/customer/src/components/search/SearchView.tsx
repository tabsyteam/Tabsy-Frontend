'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, TrendingUp, Clock, Search } from 'lucide-react'
import { toast } from 'sonner'
import SearchBar from '@/components/navigation/SearchBar'
import MenuItemCard from '@/components/cards/MenuItemCard'
import CategoryCard from '@/components/cards/CategoryCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ItemDetailModal } from '@/components/menu/ItemDetailModal'
import { useApi } from '@/components/providers/api-provider'
import { useCart } from '@/hooks/useCart'
import { useMenuItemActions } from '@/hooks/useMenuItemActions'
import { MenuItem, MenuCategory, AllergyInfo } from '@tabsy/shared-types'
import { dualReadSession } from '@/lib/unifiedSessionStorage'
import { SessionManager } from '@/lib/session'
import { useMenuData } from '@/hooks/useMenuData' // ✅ NEW: React Query hook
import { useRestaurantOptional } from '@/contexts/RestaurantContext'

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

export function SearchView() {
  const { api } = useApi()
  const searchParams = useSearchParams()
  const { cart, cartCount, getItemQuantity } = useCart()

  // Get currency from context with sessionStorage fallback
  const restaurantContext = useRestaurantOptional()
  const currency = restaurantContext?.currency || 'USD'

  // Get restaurantId from URL parameters or session
  const urlRestaurantId = searchParams.get('restaurant')
  const urlTableId = searchParams.get('table')
  const session = SessionManager.getDiningSession()

  // Validate URL parameters
  const hasValidUrlParams = SessionManager.validateUrlParams({
    restaurant: urlRestaurantId,
    table: urlTableId
  })

  const restaurantId = hasValidUrlParams ? urlRestaurantId : session?.restaurantId

  // ✅ NEW: Use React Query hook for menu data (prevents duplicate API calls)
  const {
    data: menuCategories = [],
    isLoading: loadingMenu,
    error: menuError
  } = useMenuData({
    restaurantId,
    enabled: !!restaurantId
  })

  // Extract all menu items for search/autocomplete
  const allMenuItems = React.useMemo(() => {
    const items: MenuItem[] = []
    menuCategories.forEach((category: MenuCategory) => {
      if (category.items) {
        items.push(...category.items)
      }
    })
    return items
  }, [menuCategories])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [menuSuggestions, setMenuSuggestions] = useState<MenuItem[]>([])
  const [suggestionTimeout, setSuggestionTimeout] = useState<NodeJS.Timeout | null>(null)

  // Menu item actions (favorites, cart, modal)
  const {
    favorites,
    toggleFavorite,
    handleAddToCart,
    handleQuantityChange,
    selectedItem,
    showItemModal,
    selectedCartItem,
    handleItemClick,
    closeModal,
    handleAddToCartFromModal
  } = useMenuItemActions({ restaurantId, menuCategories })

  // Popular searches from localStorage or default
  const popularSearches = [
    'Pizza', 'Burger', 'Pasta', 'Salad', 'Dessert', 'Coffee', 'Appetizer', 'Drinks'
  ]

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('tabsy-recent-searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse recent searches:', e)
      }
    }
  }, [])

  // ✅ REMOVED: Old loadMenuData function - now handled by useMenuData hook
  // Menu categories and items are automatically loaded via React Query

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout)
      }
    }
  }, [suggestionTimeout])

  // Save search query to recent searches
  const saveRecentSearch = (query: string) => {
    if (!query.trim() || query.length < 2) return

    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem('tabsy-recent-searches', JSON.stringify(updated))
  }

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    if (query.length < 2) return

    try {
      setLoading(true)

      // Save to recent searches
      if (query.length >= 3) {
        saveRecentSearch(query)
      }

      // Check if we have a restaurantId
      if (!restaurantId) {
        console.error('No restaurant ID available for search')
        setSearchResults([])
        // Show user-friendly message instead of just logging
        return
      }

      // Build filters object with search query and selected category
      const filters: any = {
        search: query,
        available: true
      };

      // Add category filter if a specific category is selected
      if (selectedCategory !== 'all') {
        filters.categoryId = selectedCategory;
      }

      // Use real API call to search menu items
      const response = await api.menu.getItems(restaurantId, filters)

      if (response.success && response.data) {
        setSearchResults(response.data)
      } else {
        console.error('Search failed:', response.message)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // Handle getting suggestions for auto-completion with debouncing
  const handleGetSuggestions = useCallback((query: string) => {
    // Clear existing timeout
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout)
    }

    if (!query.trim() || query.length < 2) {
      setMenuSuggestions([])
      setSuggestionTimeout(null)
      return
    }

    // Set new timeout for debouncing
    const timeout = setTimeout(() => {
      const filtered = allMenuItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5) // Limit to 5 suggestions

      setMenuSuggestions(filtered)
      setSuggestionTimeout(null)
    }, 300) // 300ms debounce

    setSuggestionTimeout(timeout)
  }, [allMenuItems, suggestionTimeout])

  // Handle suggestion selection
  const handleSuggestionSelect = (item: MenuItem) => {
    setSearchQuery(item.name)
    setMenuSuggestions([])
    handleSearch(item.name)
    saveRecentSearch(item.name)
  }

  // Handle category filter
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    // If there's an active search query, re-run search with new category filter
    if (searchQuery) {
      handleSearch(searchQuery)
    }
  }

  // Show message if no restaurant ID is available
  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto bg-surface-secondary rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-content-tertiary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Find Your Favorites
            </h1>
            <p className="text-content-secondary mb-4">
              Search through menu items, filter by dietary preferences, and discover new dishes once you're seated.
            </p>
            <div className="text-sm text-content-tertiary space-y-1">
              <p>• Search by dish name or ingredient</p>
              <p>• Filter by dietary restrictions</p>
              <p>• Discover popular items</p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium py-3 px-6 rounded-lg transition-colors w-full"
          >
            Scan QR Code to Browse Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-20 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-content-primary mb-4">Search Menu</h1>

          {/* Search Bar */}
          <SearchBar
            placeholder="Search for delicious food..."
            onSearch={handleSearch}
            onFilter={() => setShowFilters(!showFilters)}
            showRecentSearches={true}
            recentSearches={recentSearches}
            menuSuggestions={menuSuggestions}
            onGetSuggestions={handleGetSuggestions}
            onSuggestionSelect={handleSuggestionSelect}
            autoFocus={true}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Category Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-surface rounded-xl border p-4">
                <h3 className="text-lg font-semibold text-content-primary mb-4">Filter by Category</h3>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                  {/* All Categories */}
                  <CategoryCard
                    category={{
                      id: 'all',
                      name: 'All',
                      itemCount: menuCategories.reduce((total, cat) => total + (cat.items?.length || 0), 0),
                      isActive: selectedCategory === 'all'
                    }}
                    onClick={handleCategoryChange}
                    layout="horizontal"
                    showItemCount={true}
                    className="min-w-max"
                  />
                  {/* Menu Categories */}
                  {menuCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={{
                        id: category.id,
                        name: category.name,
                        description: category.description,
                        itemCount: category.items?.length || 0,
                        isActive: selectedCategory === category.id,
                        icon: category.name
                      }}
                      onClick={handleCategoryChange}
                      layout="horizontal"
                      showItemCount={true}
                      className="min-w-max"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {!loading && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-surface-secondary rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-content-tertiary" />
            </div>
            <h3 className="text-lg font-semibold text-content-primary mb-2">
              No results found
            </h3>
            <p className="text-content-secondary">
              Try adjusting your search terms or browse our menu categories
            </p>
          </div>
        )}

        {!loading && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-content-primary">
                Search Results ({searchResults.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={{
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
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
                    image: item.image || item.imageUrl,
                    category: item.categoryId,
                    dietaryIndicators: item.dietaryTypes?.map(type => type.replace('_', ' ').toLowerCase()),
                    allergyInfo: convertAllergyInfoToArray(item.allergyInfo),
                    spicyLevel: item.spicyLevel,
                    preparationTime: item.preparationTime,
                    isPopular: item.tags?.includes('popular') || false,
                    isNew: (() => {
                      if (!item.createdAt) return false;
                      const createdDate = new Date(item.createdAt);
                      const now = new Date();
                      const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                      return daysDiff <= 7; // Consider items new if created within last 7 days
                    })(),
                    options: item.options || []
                  }}
                  quantity={getItemQuantity(item.id)}
                  onQuantityChange={(itemId, newQuantity) => {
                    handleQuantityChange(itemId, newQuantity, item)
                  }}
                  onAddToCart={(menuItem, quantity) => handleAddToCart(item, quantity)}
                  onToggleFavorite={toggleFavorite}
                  onItemClick={(menuItem) => {
                    handleItemClick(menuItem, item)
                  }}
                  isFavorite={favorites.has(item.id)}
                  layout="grid"
                  showQuickAdd={true}
                  currency={currency}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* No Search Query - Show Popular Searches */}
        {!searchQuery && !loading && (
          <div className="space-y-8">
            {/* Popular Searches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-xl border p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-content-tertiary" />
                <h3 className="text-lg font-semibold text-content-primary">
                  Popular Searches
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {popularSearches.map((search, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSearch(search)}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-xl bg-background hover:bg-interactive-hover transition-colors duration-200 text-left border"
                  >
                    <span className="text-body-sm font-medium text-content-primary">
                      {search}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface rounded-xl border p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={20} className="text-content-tertiary" />
                  <h3 className="text-lg font-semibold text-content-primary">
                    Recent Searches
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 8).map((search, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleSearch(search)}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-full bg-background-secondary text-caption text-content-secondary hover:bg-interactive-hover transition-colors duration-200 border"
                    >
                      {search}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Search Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4">
                Search Tips
              </h3>
              <ul className="space-y-2 text-content-secondary">
                <li>• Search by dish name, ingredients, or cuisine type</li>
                <li>• Use filters to narrow down by category</li>
                <li>• Try popular search terms if you're not sure what to order</li>
                <li>• Browse our full menu if you want to explore all options</li>
              </ul>
            </motion.div>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={showItemModal}
        onClose={closeModal}
        existingQuantity={selectedItem ? getItemQuantity(selectedItem.id) : 0}
        existingCartItem={selectedCartItem}
        onAddToCart={handleAddToCartFromModal}
      />
    </div>
  )
}