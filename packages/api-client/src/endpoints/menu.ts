import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Menu,
  MenuCategory,
  MenuItem,
  CreateMenuCategoryRequest,
  UpdateMenuCategoryRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest
} from '@tabsy/shared-types'
import { createQueryString, createFilterParams } from '@tabsy/shared-utils'

export interface MenuFilters {
  available?: boolean
  categoryId?: string
  search?: string
  dietary?: string[]
  priceMin?: number
  priceMax?: number
}

export class MenuAPI {
  constructor(private client: TabsyApiClient) {}

  // Menu Management
  /**
   * GET /restaurants/:restaurantId/menus - List menus
   */
  async listMenus(restaurantId: string): Promise<ApiResponse<Menu[]>> {
    return this.client.get(`/restaurants/${restaurantId}/menus`)
  }

  /**
   * POST /restaurants/:restaurantId/menus - Create menu
   */
  async createMenu(restaurantId: string, data: { name: string; description?: string }): Promise<ApiResponse<Menu>> {
    return this.client.post(`/restaurants/${restaurantId}/menus`, data)
  }

  /**
   * PUT /restaurants/:restaurantId/menus/:menuId - Update menu
   */
  async updateMenu(
    restaurantId: string, 
    menuId: string, 
    data: { name?: string; description?: string; isActive?: boolean }
  ): Promise<ApiResponse<Menu>> {
    return this.client.put(`/restaurants/${restaurantId}/menus/${menuId}`, data)
  }

  /**
   * DELETE /restaurants/:restaurantId/menus/:menuId - Delete menu
   */
  async deleteMenu(restaurantId: string, menuId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/restaurants/${restaurantId}/menus/${menuId}`)
  }

  /**
   * GET /restaurants/:restaurantId/menu - Get active menu (public endpoint for customers)
   */
  async getActiveMenu(restaurantId: string, filters?: MenuFilters): Promise<ApiResponse<Menu>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/restaurants/${restaurantId}/menu${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  // Category Management
  /**
   * GET /restaurants/:restaurantId/menu/categories - Get menu categories
   */
  async getCategories(restaurantId: string): Promise<ApiResponse<MenuCategory[]>> {
    return this.client.get(`/restaurants/${restaurantId}/menu/categories`)
  }

  /**
   * POST /restaurants/:restaurantId/menu/categories - Create category
   */
  async createCategory(restaurantId: string, data: CreateMenuCategoryRequest): Promise<ApiResponse<MenuCategory>> {
    return this.client.post(`/restaurants/${restaurantId}/menu/categories`, data)
  }

  /**
   * PUT /restaurants/:restaurantId/menu/categories/:categoryId - Update category
   */
  async updateCategory(
    restaurantId: string, 
    categoryId: string, 
    data: UpdateMenuCategoryRequest
  ): Promise<ApiResponse<MenuCategory>> {
    return this.client.put(`/restaurants/${restaurantId}/menu/categories/${categoryId}`, data)
  }

  /**
   * DELETE /restaurants/:restaurantId/menu/categories/:categoryId - Delete category
   */
  async deleteCategory(restaurantId: string, categoryId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/restaurants/${restaurantId}/menu/categories/${categoryId}`)
  }

  // Menu Item Management
  /**
   * GET /restaurants/:restaurantId/menu/items - Get menu items
   */
  async getItems(restaurantId: string, filters?: MenuFilters): Promise<ApiResponse<MenuItem[]>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/restaurants/${restaurantId}/menu/items${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  /**
   * POST /restaurants/:restaurantId/menu/items - Create menu item
   */
  async createItem(restaurantId: string, data: CreateMenuItemRequest): Promise<ApiResponse<MenuItem>> {
    return this.client.post(`/restaurants/${restaurantId}/menu/items`, data)
  }

  /**
   * PUT /restaurants/:restaurantId/menu/items/:itemId - Update menu item
   */
  async updateItem(
    restaurantId: string, 
    itemId: string, 
    data: UpdateMenuItemRequest
  ): Promise<ApiResponse<MenuItem>> {
    return this.client.put(`/restaurants/${restaurantId}/menu/items/${itemId}`, data)
  }

  /**
   * DELETE /restaurants/:restaurantId/menu/items/:itemId - Delete menu item
   */
  async deleteItem(restaurantId: string, itemId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/restaurants/${restaurantId}/menu/items/${itemId}`)
  }

  /**
   * GET /menu/:id - Get menu by ID (public access)
   */
  async getMenuById(id: string): Promise<ApiResponse<Menu>> {
    return this.client.get(`/menu/${id}`)
  }
}
