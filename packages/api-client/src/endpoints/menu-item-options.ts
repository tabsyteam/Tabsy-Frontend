import type { TabsyApiClient } from '../client'
import type { ApiResponse } from '@tabsy/shared-types'

export interface MenuItemOption {
  id: string
  name: string
  description?: string
  required: boolean
  multiple: boolean
  maxSelections?: number
  menuItemId: string
  values: MenuItemOptionValue[]
  createdAt: string
  updatedAt: string
}

export interface MenuItemOptionValue {
  id: string
  name: string
  description?: string
  additionalPrice: number
  available: boolean
  optionId: string
  createdAt: string
  updatedAt: string
}

export interface CreateMenuItemOptionRequest {
  name: string
  description?: string
  required: boolean
  multiple: boolean
  maxSelections?: number
  values: CreateMenuItemOptionValueRequest[]
}

export interface CreateMenuItemOptionValueRequest {
  name: string
  description?: string
  additionalPrice: number
  available?: boolean
}

export interface BulkCreateMenuItemOptionsRequest {
  menuItemId: string
  options: CreateMenuItemOptionRequest[]
}

export class MenuItemOptionsAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * POST /menu-item-options/ - Create menu item option
   */
  async create(menuItemId: string, data: CreateMenuItemOptionRequest): Promise<ApiResponse<MenuItemOption>> {
    return this.client.post('/menu-item-options', {
      ...data,
      menuItemId
    })
  }

  /**
   * POST /menu-item-options/bulk - Bulk create options
   */
  async bulkCreate(data: BulkCreateMenuItemOptionsRequest): Promise<ApiResponse<MenuItemOption[]>> {
    return this.client.post('/menu-item-options/bulk', data)
  }

  /**
   * GET /menu-item-options/:id - Get menu item option by ID
   */
  async getById(id: string): Promise<ApiResponse<MenuItemOption>> {
    return this.client.get(`/menu-item-options/${id}`)
  }

  /**
   * PUT /menu-item-options/:id - Update menu item option
   */
  async update(id: string, data: Partial<CreateMenuItemOptionRequest>): Promise<ApiResponse<MenuItemOption>> {
    return this.client.put(`/menu-item-options/${id}`, data)
  }

  /**
   * DELETE /menu-item-options/:id - Delete menu item option
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/menu-item-options/${id}`)
  }

  /**
   * GET /menu-items/:menuItemId/options - Get options for a menu item
   */
  async getByMenuItem(menuItemId: string): Promise<ApiResponse<MenuItemOption[]>> {
    return this.client.get(`/menu-items/${menuItemId}/options`)
  }

  /**
   * POST /menu-item-options/:optionId/values - Add option value
   */
  async addValue(optionId: string, data: CreateMenuItemOptionValueRequest): Promise<ApiResponse<MenuItemOptionValue>> {
    return this.client.post(`/menu-item-options/${optionId}/values`, data)
  }

  /**
   * PUT /menu-item-options/:optionId/values/:valueId - Update option value
   */
  async updateValue(optionId: string, valueId: string, data: Partial<CreateMenuItemOptionValueRequest>): Promise<ApiResponse<MenuItemOptionValue>> {
    return this.client.put(`/menu-item-options/${optionId}/values/${valueId}`, data)
  }

  /**
   * DELETE /menu-item-options/:optionId/values/:valueId - Delete option value
   */
  async deleteValue(optionId: string, valueId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/menu-item-options/${optionId}/values/${valueId}`)
  }
}