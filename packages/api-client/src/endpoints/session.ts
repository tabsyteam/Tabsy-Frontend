import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  GuestSession
} from '@tabsy/shared-types'

export interface CreateGuestSessionRequest {
  qrCode: string
  tableId: string
  restaurantId: string
  customerInfo?: {
    name?: string
    phone?: string
    email?: string
  }
}

export interface UpdateGuestSessionRequest {
  customerInfo?: {
    name?: string
    phone?: string
    email?: string
  }
  preferences?: {
    language?: string
    dietary?: string[]
  }
}

export interface SessionValidationResponse {
  isValid: boolean
  session?: GuestSession
  reason?: string
  expiresAt?: string
}

export class SessionAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * POST /session/guest - Create guest session
   */
  async createGuest(data: CreateGuestSessionRequest): Promise<ApiResponse<GuestSession>> {
    const response = await this.client.post<GuestSession>('/session/guest', data)
    
    // Store session info for subsequent requests
    if (response.success && response.data?.id) {
      // You might want to store this in localStorage or context
      this.client.setGuestSession(response.data.id)
    }
    
    return response
  }

  /**
   * GET /session/:sessionId/validate - Validate session
   */
  async validate(sessionId: string): Promise<ApiResponse<SessionValidationResponse>> {
    return this.client.get(`/session/${sessionId}/validate`)
  }

  /**
   * GET /session/:sessionId - Get session details
   */
  async getById(sessionId: string): Promise<ApiResponse<GuestSession>> {
    return this.client.get(`/session/${sessionId}`)
  }

  /**
   * PATCH /session/:sessionId - Update session
   */
  async update(sessionId: string, data: UpdateGuestSessionRequest): Promise<ApiResponse<GuestSession>> {
    return this.client.patch(`/session/${sessionId}`, data)
  }

  /**
   * DELETE /session/:sessionId - Delete session
   */
  async delete(sessionId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/session/${sessionId}`)
    
    // Clear stored session info
    if (response.success) {
      this.client.clearGuestSession()
    }
    
    return response
  }

  /**
   * Helper method: Extend session (ping to keep alive)
   */
  async ping(sessionId: string): Promise<ApiResponse<GuestSession>> {
    return this.client.patch(`/session/${sessionId}`, { lastActivity: new Date().toISOString() })
  }
}
