'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, TrendingUp, Clock, Search } from 'lucide-react'
import SearchBar from '@/components/navigation/SearchBar'
import MenuItemCard from '@/components/cards/MenuItemCard'
import CategoryCard from '@/components/cards/CategoryCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useApi } from '@/components/providers/api-provider'
import { MenuItem, MenuCategory, AllergyInfo } from '@tabsy/shared-types'
import { SessionManager } from '@/lib/session'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [menuSuggestions, setMenuSuggestions] = useState<MenuItem[]>([])
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([])

  // Popular searches from localStorage or default
  const popularSearches = [
    'Pizza', 'Burger', 'Pasta', 'Salad', 'Dessert', 'Coffee', 'Appetizer', 'Drinks'
  ]

  // Load recent searches from localStorage and menu categories
  useEffect(() => {
    const stored = localStorage.getItem('tabsy-recent-searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse recent searches:', e)
      }
    }

    // Load menu categories and all items for auto-completion
    const loadMenuData = async () => {
      if (!restaurantId) return

      try {
        const menuResponse = await api.menu.getActiveMenu(restaurantId)
        if (menuResponse.success && menuResponse.data) {
          let categories = []
          let allItems: MenuItem[] = []

          if (Array.isArray(menuResponse.data)) {
            const firstMenu = menuResponse.data[0]
            categories = firstMenu?.categories || []
          } else if (menuResponse.data.categories) {
            categories = menuResponse.data.categories
          }

          // Extract all menu items from categories for auto-completion
          categories.forEach((category: MenuCategory) => {
            if (category.items) {
              allItems.push(...category.items)
            }
          })

          setMenuCategories(categories)
          setAllMenuItems(allItems)
        }
      } catch (error) {
        console.error('Failed to load menu data:', error)
      }
    }

    loadMenuData()
  }, [restaurantId, api])

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

      // Use real API call to search menu items
      const response = await api.menu.getItems(restaurantId, {
        search: query,
        available: true
      })

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

  // Handle getting suggestions for auto-completion
  const handleGetSuggestions = (query: string) => {
    if (!query.trim() || query.length < 2) {
      setMenuSuggestions([])
      return
    }

    const filtered = allMenuItems.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 5) // Limit to 5 suggestions

    setMenuSuggestions(filtered)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (item: MenuItem) => {
    setSearchQuery(item.name)
    setMenuSuggestions([])
    handleSearch(item.name)
    saveRecentSearch(item.name)
  }

  // Handle category filter (placeholder for future implementation)
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
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
                    price: item.price ?? item.basePrice,
                    image: item.image || item.imageUrl,
                    category: item.categoryId,
                    dietaryIndicators: item.dietaryTypes?.map(type => type.replace('_', ' ').toLowerCase()),
                    allergyInfo: convertAllergyInfoToArray(item.allergyInfo),
                    spicyLevel: item.spicyLevel,
                    preparationTime: item.preparationTime,
                    isPopular: false,
                    isNew: false
                  }}
                  onAddToCart={() => {}}
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
    </div>
  )
}