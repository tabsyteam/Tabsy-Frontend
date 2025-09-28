import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Restaurant,
  User,
  Order,
  Payment,
  PaymentStatus,
  OrderStatus,
  UserRole,
  UserStatus
} from '@tabsy/shared-types'
import { createQueryString, createFilterParams } from '@tabsy/shared-utils'

// Simplified interfaces for MVP Admin API
export interface DashboardMetrics {
  totalRevenue: number
  revenueGrowth: number
  totalRestaurants: number
  restaurantsGrowth: number
  totalUsers: number
  usersGrowth: number
  activeOrders: number
  ordersToday: number
  ordersGrowth: number
  averageOrderValue: number
  systemLoad: number
  systemLoadStatus: 'normal' | 'elevated' | 'critical'
}

export class AdminAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /admin/dashboard - Get dashboard metrics (simplified endpoint)
   */
  async getDashboardMetrics(): Promise<ApiResponse<any>> {
    return this.client.get('/admin/dashboard')
  }

  /**
   * GET /admin/restaurants - Get all restaurants with filters
   */
  async getRestaurants(filters?: {
    page?: number
    limit?: number
    search?: string
    active?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<ApiResponse<Restaurant[]>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/admin/restaurants${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  /**
   * PUT /admin/restaurants/:id/status - Update restaurant status
   */
  async updateRestaurantStatus(id: string, active: boolean): Promise<ApiResponse<Restaurant>> {
    return this.client.put(`/admin/restaurants/${id}/status`, { active })
  }

  /**
   * GET /admin/users - Get all users with filters
   */
  async getUsers(filters?: {
    page?: number
    limit?: number
    search?: string
    role?: UserRole
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<ApiResponse<User[]>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/admin/users${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  /**
   * PUT /admin/users/:id - Update user
   */
  async updateUser(id: string, data: {
    role?: UserRole
    active?: boolean
  }): Promise<ApiResponse<User>> {
    return this.client.put(`/admin/users/${id}`, data)
  }
}