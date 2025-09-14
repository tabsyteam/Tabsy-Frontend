import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  User,
  UserRole,
  UserStatus,
  CreateUserRequest,
  UpdateUserRequest
} from '@tabsy/shared-types'

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
   * GET /user/me - Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.client.get('/user/me')
  }

  /**
   * GET /user/ - List users (admin)
   */
  async list(filters?: UserListFilters): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }
    
    const url = `/user${params.toString() ? `?${params.toString()}` : ''}`
    return this.client.get(url)
  }

  /**
   * POST /user/ - Create user (admin)
   */
  async create(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.client.post('/user', data)
  }

  /**
   * GET /user/:id - Get user by ID (admin)
   */
  async getById(id: string): Promise<ApiResponse<User>> {
    return this.client.get(`/user/${id}`)
  }

  /**
   * PUT /user/:id - Update user (admin)
   */
  async update(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.client.put(`/user/${id}`, data)
  }

  /**
   * DELETE /user/:id - Delete user (admin)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/user/${id}`)
  }

  /**
   * Helper method: Update user status (separate endpoint)
   */
  async updateStatus(id: string, status: UserStatus): Promise<ApiResponse<User>> {
    return this.client.put(`/user/${id}/status`, { status })
  }

  /**
   * Helper method: Update user roles (separate endpoint)
   */
  async updateRoles(id: string, roles: UserRole[]): Promise<ApiResponse<User>> {
    return this.client.put(`/user/${id}/roles`, { roles })
  }
}
