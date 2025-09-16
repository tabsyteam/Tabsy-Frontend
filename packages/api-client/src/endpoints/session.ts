import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  GuestSession
} from '@tabsy/shared-types'

export interface CreateGuestSessionRequest {
  qrCode?: string  // Optional - only required for QR code validation
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
   * POST /sessions/guest - Create guest session
   */
  async createGuest(data: CreateGuestSessionRequest): Promise<ApiResponse<GuestSession>> {
    const response = await this.client.post<GuestSession>('/sessions/guest', data)

    // Store session info for subsequent requests
    if (response.success && response.data?.sessionId) {
      // You might want to store this in localStorage or context
      this.client.setGuestSession(response.data.sessionId)
    }

    return response
  }

  /**
   * GET /sessions/:sessionId/validate - Validate session
   */
  async validate(sessionId: string): Promise<ApiResponse<SessionValidationResponse>> {
    return this.client.get(`/sessions/${sessionId}/validate`)
  }

  /**
   * GET /sessions/:sessionId - Get session details
   */
  async getById(sessionId: string): Promise<ApiResponse<GuestSession>> {
    return this.client.get(`/sessions/${sessionId}`)
  }

  /**
   * PATCH /sessions/:sessionId - Update session
   */
  async update(sessionId: string, data: UpdateGuestSessionRequest): Promise<ApiResponse<GuestSession>> {
    return this.client.patch(`/sessions/${sessionId}`, data)
  }

  /**
   * DELETE /sessions/:sessionId - Delete session
   */
  async delete(sessionId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/sessions/${sessionId}`)

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
    return this.client.patch(`/sessions/${sessionId}`, { action: 'extend' })
  }
}
