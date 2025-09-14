import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Table,
  Restaurant,
  GuestSession,
  CreateGuestSessionRequest
} from '@tabsy/shared-types'

export interface QRCodeTableInfo {
  table: Table
  restaurant: Restaurant
  isActive: boolean
}

export class QRAccessAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /qr/:qrCode - Access table via QR code (public endpoint)
   * This is the main entry point for customers scanning QR codes
   */
  async getTableInfo(qrCode: string): Promise<ApiResponse<QRCodeTableInfo>> {
    return this.client.get(`/qr/${qrCode}`)
  }

  /**
   * POST /qr/session - Create session from QR code
   * Creates a guest session for table-based ordering
   */
  async createGuestSession(data: CreateGuestSessionRequest): Promise<ApiResponse<GuestSession>> {
    return this.client.post('/qr/session', data)
  }
}
