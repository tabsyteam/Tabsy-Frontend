'use client'

import { useState } from 'react'
import { useAuth } from '@tabsy/ui-components'
import { tabsyClient } from '@tabsy/api-client'
import { Button } from '@tabsy/ui-components'
import { MenuCategory, MenuItem } from '@tabsy/shared-types'
import { Filter, RefreshCw, AlertCircle, Plus, Search, Grid, List } from 'lucide-react'
import { toast } from 'sonner'
import { createMenuHooks } from '@tabsy/react-query-hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MenuCard } from './MenuCard'
import { MenuDetailSlidePanel } from './MenuDetailSlidePanel'
import { CreateCategoryModal } from './CreateCategoryModal'
import { CreateItemModal } from './CreateItemModal'

interface MenuManagementProps {
  restaurantId: string
}

type ViewFilter = 'all' | 'categories' | 'items'

type FilteredDataItem =
  | { type: 'category'; data: MenuCategory }
  | { type: 'item'; data: MenuItem }

export function MenuManagement({ restaurantId }: MenuManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false)
  const [showCreateItemModal, setShowCreateItemModal] = useState(false)

  // Create hooks using factory pattern
  const menuHooks = createMenuHooks(useQuery)
  const queryClient = useQueryClient()

  // Authentication
  const { session, user, isLoading: authLoading } = useAuth()

  // Sync authentication token with global API client
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token)
  }

  const isTokenSynced = Boolean(session?.token && tabsyClient.getAuthToken() === session.token)

  // Fetch categories
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories
  } = menuHooks.useMenuCategories(restaurantId, {
    enabled: !!restaurantId && !!session?.token && !authLoading && isTokenSynced,
  })

  // Fetch items
  const {
    data: itemsResponse,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems
  } = menuHooks.useMenuItems(restaurantId, {}, {
    enabled: !!restaurantId && !!session?.token && !authLoading && isTokenSynced,
  })

  // Extract data from responses
  const categories = categoriesResponse?.data || []
  const items = itemsResponse?.data || []

  // Filter and search logic
  const filteredCategories = categories.filter((category: MenuCategory) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredItems = items.filter((item: MenuItem) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Combined filtered data based on view filter
  const getFilteredData = () => {
    switch (viewFilter) {
      case 'categories':
        return filteredCategories.map((cat: MenuCategory) => ({ type: 'category' as const, data: cat }))
      case 'items':
        return filteredItems.map((item: MenuItem) => ({ type: 'item' as const, data: item }))
      default:
        return [
          ...filteredCategories.map((cat: MenuCategory) => ({ type: 'category' as const, data: cat })),
          ...filteredItems.map((item: MenuItem) => ({ type: 'item' as const, data: item }))
        ]
    }
  }

  const handleRefresh = () => {
    refetchCategories()
    refetchItems()
  }

  const handleEdit = (data: MenuCategory | MenuItem) => {
    if ('itemCount' in data) {
      // It's a category
      setSelectedCategory(data as MenuCategory)
    } else {
      // It's an item
      setSelectedItem(data as MenuItem)
    }
  }

  const handleDelete = async (id: string, type: 'category' | 'item') => {
    try {
      if (type === 'category') {
        // Add delete category API call
        // await tabsyClient.menu.deleteCategory(restaurantId, id)
        toast.success('Category deleted successfully')
      } else {
        // Add delete item API call
        // await tabsyClient.menu.deleteItem(restaurantId, id)
        toast.success('Item deleted successfully')
      }

      // Refresh data
      handleRefresh()
    } catch (error: any) {
      toast.error(`Failed to delete ${type}: ${error.message}`)
    }
  }

  const handleToggleStatus = async (id: string, type: 'category' | 'item') => {
    try {
      if (type === 'category') {
        // Add toggle category status API call
        // await tabsyClient.menu.updateCategory(restaurantId, id, { isActive: !category.isActive })
        toast.success('Category status updated')
      } else {
        // Add toggle item status API call
        // await tabsyClient.menu.updateItem(restaurantId, id, { isAvailable: !item.isAvailable })
        toast.success('Item status updated')
      }

      // Refresh data
      handleRefresh()
    } catch (error: any) {
      toast.error(`Failed to update ${type} status: ${error.message}`)
    }
  }

  // Show loading state during authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Show message if not authenticated
  if (!session?.token) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Authentication required to manage menu</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
          <p className="text-foreground/80 mt-1">
            Manage your restaurant's menu categories and items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            disabled={categoriesLoading || itemsLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(categoriesLoading || itemsLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-4 flex-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filter:</span>
          <div className="flex gap-2">
            {(['all', 'categories', 'items'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setViewFilter(filter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
                  viewFilter === filter
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground/80 hover:bg-primary border-border hover:text-primary-foreground'
                }`}
              >
                {filter === 'all' ? 'All Items' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateCategoryModal(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
          <Button
            onClick={() => setShowCreateItemModal(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {(categoriesLoading || itemsLoading) && (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading menu...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {(categoriesError || itemsError) && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-destructive-foreground">Error loading menu</span>
          </div>
          <p className="text-destructive-foreground/80 mt-1 text-sm">
            {categoriesError?.message || itemsError?.message}
          </p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Menu Grid */}
      {!categoriesLoading && !itemsLoading && !(categoriesError || itemsError) && (
        <div className="h-[calc(100vh-24rem)] overflow-y-auto pr-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {getFilteredData().length === 0 ? (
              <div className="col-span-full flex items-center justify-center h-32 bg-muted/50 rounded-lg border-2 border-dashed border-border">
                <div className="text-center">
                  <p className="text-foreground font-medium">No items found</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {searchQuery
                      ? `No items match "${searchQuery}"`
                      : `No ${viewFilter === 'all' ? 'menu items' : viewFilter} available`
                    }
                  </p>
                </div>
              </div>
            ) : (
              getFilteredData().map((item: FilteredDataItem, index: number) => (
                <MenuCard
                  key={`${item.type}-${item.data.id}`}
                  {...(item.type === 'category' ? {
                    type: 'category' as const,
                    data: item.data as MenuCategory,
                    onEdit: (category: MenuCategory) => handleEdit(category),
                    onDelete: (id: string) => handleDelete(id, 'category'),
                    onSelect: (category: MenuCategory) => setSelectedCategory(category)
                  } : {
                    type: 'item' as const,
                    data: item.data as MenuItem,
                    onEdit: (menuItem: MenuItem) => handleEdit(menuItem),
                    onDelete: (id: string) => handleDelete(id, 'item'),
                    onSelect: (menuItem: MenuItem) => setSelectedItem(menuItem)
                  })}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Detail Slide Panels */}
      <MenuDetailSlidePanel
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        type="category"
        category={selectedCategory}
        onEdit={handleEdit}
        onDelete={(id) => handleDelete(id, 'category')}
        onToggleStatus={(id) => handleToggleStatus(id, 'category')}
      />

      <MenuDetailSlidePanel
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        type="item"
        item={selectedItem}
        onEdit={handleEdit}
        onDelete={(id) => handleDelete(id, 'item')}
        onToggleStatus={(id) => handleToggleStatus(id, 'item')}
      />

      {/* Create Modals */}
      <CreateCategoryModal
        open={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        restaurantId={restaurantId}
        onSuccess={() => {
          setShowCreateCategoryModal(false)
          handleRefresh()
        }}
      />

      <CreateItemModal
        open={showCreateItemModal}
        onClose={() => setShowCreateItemModal(false)}
        restaurantId={restaurantId}
        categories={categories}
        selectedCategory={null}
        onSuccess={() => {
          setShowCreateItemModal(false)
          handleRefresh()
        }}
      />
    </div>
  )
}