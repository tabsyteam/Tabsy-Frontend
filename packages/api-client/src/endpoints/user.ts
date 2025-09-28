import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  User,
  UserRole,
  UserStatus,
  CreateUserRequest,
  UpdateUserRequest
} from '@tabsy/shared-types'
import { createQueryString, createFilterParams } from '@tabsy/shared-utils'

export interface UserListFilters {
  role?: UserRole
  status?: UserStatus
  restaurantId?: string
  search?: string
  page?: number
  limit?: number
}

export class UserAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /users/me - Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.client.get('/users/me')
  }

  /**
   * GET /users/ - List users (admin)
   */
  async list(filters?: UserListFilters): Promise<ApiResponse<User[]>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/users${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  /**
   * POST /users/ - Create user (admin)
   */
  async create(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.client.post('/users', data)
  }

  /**
   * GET /users/:id - Get user by ID (admin)
   */
  async getById(id: string): Promise<ApiResponse<User>> {
    return this.client.get(`/users/${id}`)
  }

  /**
   * PUT /users/:id - Update user (admin)
   */
  async update(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.client.put(`/users/${id}`, data)
  }

  /**
   * DELETE /users/:id - Delete user (admin)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/users/${id}`)
  }

  /**
   * Helper method: Update user status (separate endpoint)
   */
  async updateStatus(id: string, status: UserStatus): Promise<ApiResponse<User>> {
    return this.client.put(`/users/${id}/status`, { status })
  }

  /**
   * Helper method: Update user roles (separate endpoint)
   */
  async updateRoles(id: string, roles: UserRole[]): Promise<ApiResponse<User>> {
    return this.client.put(`/users/${id}/roles`, { roles })
  }
}
