import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Notification,
  NotificationPreferences
} from '@tabsy/shared-types'

export interface SendNotificationRequest {
  recipientId?: string
  recipientType: 'USER' | 'RESTAURANT' | 'ALL'
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  data?: Record<string, any>
}

export interface NotificationFilters {
  type?: string
  priority?: string
  read?: boolean
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface TestNotificationRequest {
  type: 'EMAIL' | 'PUSH' | 'SMS'
  recipient: string
  template: string
  data?: Record<string, any>
}

export class NotificationAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * POST /notification/ - Send notification
   */
  async send(data: SendNotificationRequest): Promise<ApiResponse<Notification>> {
    return this.client.post('/notification', data)
  }

  /**
   * GET /notification/ - Get user notifications
   */
  async getUserNotifications(filters?: NotificationFilters): Promise<ApiResponse<Notification[]>> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }
    
    const url = `/notification${params.toString() ? `?${params.toString()}` : ''}`
    return this.client.get(url)
  }

  /**
   * PATCH /notification/:id - Mark notification as read
   */
  async markAsRead(id: string): Promise<ApiResponse<Notification>> {
    return this.client.patch(`/notification/${id}`, { read: true })
  }

  /**
   * DELETE /notification/ - Clear notifications
   */
  async clearAll(): Promise<ApiResponse<void>> {
    return this.client.delete('/notification')
  }

  /**
   * GET /notification/preferences - Get notification preferences
   */
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return this.client.get('/notification/preferences')
  }

  /**
   * PUT /notification/preferences - Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    return this.client.put('/notification/preferences', preferences)
  }

  /**
   * POST /notification/test - Test notification
   */
  async test(data: TestNotificationRequest): Promise<ApiResponse<void>> {
    return this.client.post('/notification/test', data)
  }

  /**
   * Helper method: Get restaurant notifications
   */
  async getRestaurantNotifications(restaurantId: string, filters?: NotificationFilters): Promise<ApiResponse<Notification[]>> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }
    
    const url = `/notification/restaurant/${restaurantId}${params.toString() ? `?${params.toString()}` : ''}`
    return this.client.get(url)
  }

  /**
   * Helper method: Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<ApiResponse<void>> {
    return this.client.patch('/notification/bulk', { ids, action: 'mark_read' })
  }
}
