import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Notification,
  NotificationPreferences
} from '@tabsy/shared-types'

export interface SendNotificationRequest {
  recipientId?: string
  type: 'ORDER_STATUS' | 'PAYMENT_STATUS' | 'ASSISTANCE_REQUIRED' | 'SYSTEM' | 'MARKETING'
  content: string
  metadata?: {
    restaurantId?: string
    tableId?: string
    orderId?: string
    paymentId?: string
    priority?: 'high' | 'medium' | 'low'
    expiresAt?: string
    actionUrl?: string
    [key: string]: any
  }
  isSystem?: boolean
}

export interface NotificationFilters {
  page?: number
  limit?: number
  unreadOnly?: boolean
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
   * POST /notifications - Send notification
   */
  async send(data: SendNotificationRequest): Promise<ApiResponse<Notification>> {
    return this.client.post('/notifications', data)
  }

  /**
   * GET /notifications - Get user notifications (paginated)
   */
  async getUserNotifications(filters?: NotificationFilters): Promise<ApiResponse<{
    data: Notification[]
    meta: {
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
  }>> {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    const url = `/notifications${params.toString() ? `?${params.toString()}` : ''}`
    return this.client.get(url)
  }

  /**
   * PATCH /notifications/:id - Mark notification as read
   */
  async markAsRead(id: string): Promise<ApiResponse<Notification>> {
    return this.client.patch(`/notifications/${id}`)
  }

  /**
   * DELETE /notifications - Clear notifications
   */
  async clearAll(): Promise<ApiResponse<{ cleared: number }>> {
    return this.client.delete('/notifications')
  }

  /**
   * GET /notifications/preferences - Get notification preferences
   */
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return this.client.get('/notifications/preferences')
  }

  /**
   * PUT /notifications/preferences - Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    return this.client.put('/notifications/preferences', preferences)
  }

  /**
   * POST /notifications/test - Test notification
   */
  async test(data: TestNotificationRequest): Promise<ApiResponse<void>> {
    return this.client.post('/notifications/test', data)
  }
}
