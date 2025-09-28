import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  PaginatedResponse,
  Restaurant,
  CreateRestaurantRequest,
  UpdateRestaurantRequest,
  User
} from '@tabsy/shared-types'
import { createQueryString, createFilterParams } from '@tabsy/shared-utils'

export interface RestaurantListFilters {
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
  type?: string
  page?: number
  limit?: number
  search?: string
}

export interface CallWaiterRequest {
  tableId: string
  orderId?: string
  customerName?: string
  urgency?: 'low' | 'normal' | 'high'
  message?: string
}

export interface CallWaiterResponse {
  requestId: string
  tableId: string
  orderId?: string
  message: string
  estimatedResponseTime: string
}

export class RestaurantAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /restaurants/ - List restaurants
   */
  async list(filters?: RestaurantListFilters): Promise<ApiResponse<Restaurant[]>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/restaurants${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  /**
   * GET /restaurants/:id - Get restaurant by ID
   */
  async getById(id: string): Promise<ApiResponse<Restaurant>> {
    return this.client.get(`/restaurants/${id}`)
  }

  /**
   * POST /restaurants/ - Create restaurant
   */
  async create(data: CreateRestaurantRequest): Promise<ApiResponse<Restaurant>> {
    return this.client.post('/restaurants', data)
  }

  /**
   * PUT /restaurants/:id - Update restaurant
   */
  async update(id: string, data: UpdateRestaurantRequest): Promise<ApiResponse<Restaurant>> {
    return this.client.put(`/restaurants/${id}`, data)
  }

  /**
   * PATCH /restaurants/:id - Partial restaurant update
   */
  async partialUpdate(id: string, data: Partial<UpdateRestaurantRequest>): Promise<ApiResponse<Restaurant>> {
    return this.client.patch(`/restaurants/${id}`, data)
  }

  /**
   * DELETE /restaurants/:id - Delete restaurant
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/restaurants/${id}`)
  }

  /**
   * GET /restaurants/owner/:ownerId - Get restaurants by owner
   */
  async getByOwner(ownerId: string): Promise<ApiResponse<Restaurant[]>> {
    return this.client.get(`/restaurants/owner/${ownerId}`)
  }

  /**
   * GET /restaurants/:id/staff - Get restaurant staff
   */
  async getStaff(restaurantId: string): Promise<ApiResponse<User[]>> {
    return this.client.get(`/restaurants/${restaurantId}/staff`)
  }

  /**
   * POST /restaurants/:id/staff - Add staff member
   */
  async addStaff(restaurantId: string, data: { userId: string; role: string; permissions?: string[] }): Promise<ApiResponse<void>> {
    return this.client.post(`/restaurants/${restaurantId}/staff`, data)
  }

  /**
   * PUT /restaurants/:id/staff/:userId - Update staff member role/permissions
   */
  async updateStaff(restaurantId: string, userId: string, data: { role?: string; permissions?: string[] }): Promise<ApiResponse<void>> {
    return this.client.put(`/restaurants/${restaurantId}/staff/${userId}`, data)
  }

  /**
   * DELETE /restaurants/:id/staff/:userId - Remove staff member
   */
  async removeStaff(restaurantId: string, userId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/restaurants/${restaurantId}/staff/${userId}`)
  }

  /**
   * POST /restaurants/:id/call-waiter - Request waiter assistance
   */
  async callWaiter(restaurantId: string, data: CallWaiterRequest): Promise<ApiResponse<CallWaiterResponse>> {
    return this.client.post(`/restaurants/${restaurantId}/call-waiter`, data)
  }
}
