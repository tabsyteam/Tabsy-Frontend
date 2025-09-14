import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Table,
  TableStatus,
  GuestSession
} from '@tabsy/shared-types'

export interface CreateTableRequest {
  tableNumber: string
  capacity: number
  location?: string
  description?: string
}

export interface UpdateTableRequest {
  tableNumber?: string
  capacity?: number
  location?: string
  description?: string
  status?: TableStatus
}

export interface QRCodeResponse {
  qrCode: string
  qrCodeUrl: string
  tableId: string
  restaurantId: string
}

export class TableAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /restaurants/:restaurantId/tables - List tables
   */
  async list(restaurantId: string): Promise<ApiResponse<Table[]>> {
    return this.client.get(`/restaurants/${restaurantId}/tables`)
  }

  /**
   * POST /restaurants/:restaurantId/tables - Create table
   */
  async create(restaurantId: string, data: CreateTableRequest): Promise<ApiResponse<Table>> {
    return this.client.post(`/restaurants/${restaurantId}/tables`, data)
  }

  /**
   * GET /restaurants/:restaurantId/tables/:tableId - Get table by ID
   */
  async getById(restaurantId: string, tableId: string): Promise<ApiResponse<Table>> {
    return this.client.get(`/restaurants/${restaurantId}/tables/${tableId}`)
  }

  /**
   * PUT /restaurants/:restaurantId/tables/:tableId - Update table
   */
  async update(restaurantId: string, tableId: string, data: UpdateTableRequest): Promise<ApiResponse<Table>> {
    return this.client.put(`/restaurants/${restaurantId}/tables/${tableId}`, data)
  }

  /**
   * DELETE /restaurants/:restaurantId/tables/:tableId - Delete table
   */
  async delete(restaurantId: string, tableId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/restaurants/${restaurantId}/tables/${tableId}`)
  }

  /**
   * PUT /restaurants/:restaurantId/tables/:tableId/status - Update table status
   */
  async updateStatus(restaurantId: string, tableId: string, status: TableStatus): Promise<ApiResponse<Table>> {
    return this.client.put(`/restaurants/${restaurantId}/tables/${tableId}/status`, { status })
  }

  /**
   * GET /restaurants/:restaurantId/tables/:tableId/qrcode - Get QR code
   */
  async getQRCode(restaurantId: string, tableId: string): Promise<ApiResponse<QRCodeResponse>> {
    return this.client.get(`/restaurants/${restaurantId}/tables/${tableId}/qrcode`)
  }

  /**
   * GET /restaurants/:restaurantId/tables/:tableId/qr - Get QR code (alt endpoint)
   */
  async getQR(restaurantId: string, tableId: string): Promise<ApiResponse<QRCodeResponse>> {
    return this.client.get(`/restaurants/${restaurantId}/tables/${tableId}/qr`)
  }

  /**
   * GET /restaurants/:restaurantId/tables/:tableId/qrcode-image - Get QR image
   */
  async getQRCodeImage(restaurantId: string, tableId: string): Promise<ApiResponse<Blob>> {
    return this.client.get(`/restaurants/${restaurantId}/tables/${tableId}/qrcode-image`, {
      responseType: 'blob'
    })
  }

  /**
   * POST /restaurants/:restaurantId/tables/:tableId/reset - Reset table
   */
  async reset(restaurantId: string, tableId: string): Promise<ApiResponse<void>> {
    return this.client.post(`/restaurants/${restaurantId}/tables/${tableId}/reset`)
  }

  /**
   * GET /restaurants/:tableId/sessions - Get table sessions
   */
  async getSessions(tableId: string): Promise<ApiResponse<GuestSession[]>> {
    return this.client.get(`/restaurants/${tableId}/sessions`)
  }
}
