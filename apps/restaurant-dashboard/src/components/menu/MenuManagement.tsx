'use client';

import { useState } from 'react';
import { useAuth } from '@tabsy/ui-components';
import { tabsyClient } from '@tabsy/api-client';
import { Button } from '@tabsy/ui-components';
import { MenuCategory, MenuItem, MenuItemStatus } from '@tabsy/shared-types';
import {
  Filter,
  RefreshCw,
  AlertCircle,
  Plus,
  Search,
  Grid,
  List,
  Package,
  Utensils,
  TrendingUp,
  BarChart3,
  Eye,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { createMenuHooks } from '@tabsy/react-query-hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MenuCard } from './MenuCard';
import { MenuDetailSlidePanel } from './MenuDetailSlidePanel';
import { CreateCategoryModal } from './CreateCategoryModal';
import { CreateItemModal } from './CreateItemModal';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSkeleton, MenuCardSkeleton, StatisticsSkeleton } from '../ui/LoadingSkeleton';

interface MenuManagementProps {
  restaurantId: string;
}

type ViewFilter = 'all' | 'categories' | 'items';
type ViewMode = 'grid' | 'list';

type FilteredDataItem = { type: 'category'; data: MenuCategory } | { type: 'item'; data: MenuItem };

export function MenuManagement({ restaurantId }: MenuManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Create hooks using factory pattern
  const menuHooks = createMenuHooks(useQuery);
  const queryClient = useQueryClient();

  // Authentication
  const { session, user, isLoading: authLoading } = useAuth();

  // Sync authentication token with global API client
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  const isTokenSynced = Boolean(session?.token && tabsyClient.getAuthToken() === session.token);

  // Fetch categories
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = menuHooks.useMenuCategories(restaurantId, {
    enabled: !!restaurantId && !!session?.token && !authLoading && isTokenSynced,
  });

  // Fetch items
  const {
    data: itemsResponse,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = menuHooks.useMenuItems(
    restaurantId,
    {},
    {
      enabled: !!restaurantId && !!session?.token && !authLoading && isTokenSynced,
    },
  );

  // Extract data from responses
  const categories = categoriesResponse?.data || [];
  const items = itemsResponse?.data || [];

  // Debug logging to see what fields are returned
  if (items.length > 0) {
    console.log('Sample menu item from API:', items[0]);
    console.log('Item has basePrice?', 'basePrice' in items[0]);
    console.log('Item has price?', 'price' in items[0]);
  }

  // Filter and search logic
  const filteredCategories = categories.filter((category: MenuCategory) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredItems = items.filter(
    (item: MenuItem) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Combined filtered data based on view filter
  const getFilteredData = () => {
    switch (viewFilter) {
      case 'categories':
        return filteredCategories.map((cat: MenuCategory) => ({
          type: 'category' as const,
          data: cat,
        }));
      case 'items':
        return filteredItems.map((item: MenuItem) => ({ type: 'item' as const, data: item }));
      default:
        return [
          ...filteredCategories.map((cat: MenuCategory) => ({
            type: 'category' as const,
            data: cat,
          })),
          ...filteredItems.map((item: MenuItem) => ({ type: 'item' as const, data: item })),
        ];
    }
  };

  const handleRefresh = () => {
    refetchCategories();
    refetchItems();
  };

  const handleEdit = (data: MenuCategory | MenuItem) => {
    console.log('handleEdit called with:', data);

    // Check if it's a MenuItem by looking for MenuItem-specific fields
    if (
      'categoryId' in data ||
      'status' in data ||
      'basePrice' in data ||
      'preparationTime' in data
    ) {
      // It's a menu item
      console.log('Editing item:', data);
      setEditingItem(data as MenuItem);
      setShowCreateItemModal(true);
    } else {
      // Otherwise, it's a category (has displayOrder, isActive, but no categoryId/status)
      console.log('Editing category:', data);
      setEditingCategory(data as MenuCategory);
      setShowCreateCategoryModal(true);
    }
  };

  const handleDelete = async (id: string, type: 'category' | 'item') => {
    // Show confirmation dialog
    const confirmMessage =
      type === 'category'
        ? 'Are you sure you want to delete this category? This action cannot be undone.'
        : 'Are you sure you want to delete this menu item? This action cannot be undone.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (type === 'category') {
        await tabsyClient.menu.deleteCategory(restaurantId, id);
        toast.success('Category deleted successfully');
        // Close the detail panel if it's open
        if (selectedCategory?.id === id) {
          setSelectedCategory(null);
        }
      } else {
        await tabsyClient.menu.deleteItem(restaurantId, id);
        toast.success('Item deleted successfully');
        // Close the detail panel if it's open
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      }

      // Refresh data
      handleRefresh();
    } catch (error: any) {
      toast.error(`Failed to delete ${type}: ${error.message}`);
    }
  };

  const handleToggleStatus = async (id: string, type: 'category' | 'item') => {
    try {
      if (type === 'category') {
        // Find the category to get current status
        const category = categories.find((cat: MenuCategory) => cat.id === id);
        if (category) {
          await tabsyClient.menu.updateCategory(restaurantId, id, {
            active: !(category as any).active,
          });
          toast.success('Category status updated');
        }
      } else {
        // Find the item to get current status and toggle active field
        const item = items.find((itm: MenuItem) => itm.id === id);
        if (item) {
          // Backend uses 'active' field for menu items, not 'status'
          // We'll toggle based on current active state
          const newActive = !(item as any).active;
          await tabsyClient.menu.updateItem(restaurantId, id, {
            active: newActive,
          } as any);
          toast.success(`Item ${newActive ? 'activated' : 'deactivated'}`);
        }
      }

      // Refresh data
      handleRefresh();
    } catch (error: any) {
      toast.error(`Failed to update ${type} status: ${error.message}`);
    }
  };

  // Show loading state during authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
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
    );
  }

  // Calculate statistics
  const totalCategories = categories.length;
  const activeCategories = categories.filter((cat: MenuCategory) => (cat as any).active).length;
  const totalItems = items.length;
  const availableItems = items.filter((item: MenuItem) => (item as any).active).length;
  const averageItemsPerCategory =
    totalCategories > 0 ? (totalItems / totalCategories).toFixed(1) : '0';

  return (
    <>
      <div className="space-y-8">
        {/* Modern Header with Statistics */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 lg:gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10">
                  <Utensils className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
                  <p className="text-foreground/80 mt-1">
                    Organize and optimize your restaurant's menu
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                onClick={handleRefresh}
                disabled={categoriesLoading || itemsLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:scale-105 transition-all duration-200"
              >
                <RefreshCw
                  className={`h-4 w-4 ${categoriesLoading || itemsLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          {categoriesLoading || itemsLoading ? (
            <StatisticsSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="stat-card transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Total Categories</p>
                    <p className="text-3xl font-bold text-foreground">{totalCategories}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="flex items-center mt-2 text-success text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>{activeCategories} active</span>
                </div>
              </div>

              <div className="stat-card transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Menu Items</p>
                    <p className="text-3xl font-bold text-foreground">{totalItems}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/10">
                    <Utensils className="h-6 w-6 text-secondary" />
                  </div>
                </div>
                <div className="flex items-center mt-2 text-success text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>{availableItems} available</span>
                </div>
              </div>

              <div className="stat-card transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Avg Items/Category</p>
                    <p className="text-3xl font-bold text-foreground">{averageItemsPerCategory}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-accent/10">
                    <BarChart3 className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <div className="flex items-center mt-2 text-muted-foreground text-sm">
                  <Eye className="h-3 w-3 mr-1" />
                  <span>Well organized</span>
                </div>
              </div>

              <div className="stat-card transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Menu Health</p>
                    <p className="text-3xl font-bold text-foreground">
                      {totalItems > 0 ? Math.round((availableItems / totalItems) * 100) : 0}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10">
                    <Sparkles className="h-6 w-6 text-success" />
                  </div>
                </div>
                <div className="flex items-center mt-2 text-success text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Items available</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Filters and Actions */}
        <div className="glass-card p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Left side - Filters and Search */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filters:</span>
                </div>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {(['all', 'categories', 'items'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setViewFilter(filter)}
                      className={`filter-button ${
                        viewFilter === filter ? 'filter-button-active' : 'filter-button-inactive'
                      }`}
                    >
                      {filter === 'all'
                        ? 'All Items'
                        : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Search */}
              <div className="search-gradient-border w-full max-w-md">
                <div className="search-inner p-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search categories and items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 text-sm bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - View Mode and Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-first sm:order-last">
                <Button
                  onClick={() => setShowCreateCategoryModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Category</span>
                  <span className="sm:hidden">Category</span>
                </Button>
                <Button
                  onClick={() => setShowCreateItemModal(true)}
                  size="sm"
                  className="btn-primary flex items-center justify-center gap-2 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Item</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {(categoriesLoading || itemsLoading) && <MenuCardSkeleton count={8} />}

        {/* Error State */}
        {(categoriesError || itemsError) && !categoriesLoading && !itemsLoading && (
          <EmptyState
            type="error"
            title="Failed to load menu data"
            description="We couldn't load your menu information. Please check your connection and try again."
            actionLabel="Try Again"
            onAction={handleRefresh}
            className="py-12"
          />
        )}

        {/* Main Content */}
        {!categoriesLoading && !itemsLoading && !(categoriesError || itemsError) && (
          <>
            {getFilteredData().length === 0 ? (
              <EmptyState
                type={
                  searchQuery
                    ? 'no-results'
                    : viewFilter === 'categories'
                      ? 'categories'
                      : viewFilter === 'items'
                        ? 'items'
                        : 'no-data'
                }
                title={
                  searchQuery
                    ? 'No matching results'
                    : viewFilter === 'categories'
                      ? 'No categories yet'
                      : viewFilter === 'items'
                        ? 'No menu items yet'
                        : 'Your menu is empty'
                }
                description={
                  searchQuery
                    ? 'No menu items match your search for {query}. Try different keywords.'
                    : viewFilter === 'categories'
                      ? 'Start organizing your menu by creating your first category.'
                      : viewFilter === 'items'
                        ? 'Add your first menu item to get started.'
                        : 'Build your restaurant menu by adding categories and items.'
                }
                searchQuery={searchQuery}
                actionLabel={
                  searchQuery
                    ? undefined
                    : viewFilter === 'categories' || viewFilter === 'all'
                      ? 'Create First Category'
                      : 'Add First Item'
                }
                onAction={
                  searchQuery
                    ? undefined
                    : viewFilter === 'categories' || viewFilter === 'all'
                      ? () => setShowCreateCategoryModal(true)
                      : () => setShowCreateItemModal(true)
                }
                className="py-16"
              />
            ) : (
              <div
                className={`transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr'
                    : 'space-y-4'
                }`}
              >
                {getFilteredData().map((item: FilteredDataItem, index: number) => (
                  <div
                    key={`${item.type}-${item.data.id}`}
                    className="animate-in fade-in-0 slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <MenuCard
                      {...(item.type === 'category'
                        ? {
                            type: 'category' as const,
                            data: item.data as MenuCategory,
                            onEdit: (category: MenuCategory) => handleEdit(category),
                            onDelete: (id: string) => handleDelete(id, 'category'),
                            onSelect: (category: MenuCategory) => setSelectedCategory(category),
                          }
                        : {
                            type: 'item' as const,
                            data: item.data as MenuItem,
                            onEdit: (menuItem: MenuItem) => handleEdit(menuItem),
                            onDelete: (id: string) => handleDelete(id, 'item'),
                            onSelect: (menuItem: MenuItem) => setSelectedItem(menuItem),
                          })}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Slide Panels - Outside spaced container */}
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

      {/* Create/Edit Modals */}
      <CreateCategoryModal
        open={showCreateCategoryModal}
        onClose={() => {
          setShowCreateCategoryModal(false);
          setEditingCategory(null);
        }}
        restaurantId={restaurantId}
        editMode={!!editingCategory}
        initialData={editingCategory}
        onSuccess={() => {
          setShowCreateCategoryModal(false);
          setEditingCategory(null);
          handleRefresh();
        }}
      />

      <CreateItemModal
        open={showCreateItemModal}
        onClose={() => {
          setShowCreateItemModal(false);
          setEditingItem(null);
        }}
        restaurantId={restaurantId}
        categories={categories}
        selectedCategory={null}
        editMode={!!editingItem}
        initialData={editingItem}
        onSuccess={() => {
          setShowCreateItemModal(false);
          setEditingItem(null);
          handleRefresh();
        }}
      />
    </>
  );
}
