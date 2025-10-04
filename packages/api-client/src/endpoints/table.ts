import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Table,
  TableStatus,
  TableShape,
  GuestSession,
  TableSessionStatusResponse
} from '@tabsy/shared-types'

export interface CreateTableRequest {
  tableNumber: string
  seats: number
  position?: {
    x: number
    y: number
    rotation?: number
  }
  shape: TableShape
  locationDescription?: string
}

export interface UpdateTableRequest {
  tableNumber?: string
  seats?: number
  shape?: TableShape
  locationDescription?: string
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
   * Transform backend table response to frontend Table type
   */
  private transformTable(backendTable: any): Table {
    return {
      id: backendTable.id,
      tableNumber: backendTable.tableNumber || backendTable.number,
      capacity: backendTable.seats || backendTable.capacity,
      status: backendTable.status,
      notes: backendTable.locationDescription || backendTable.notes,
      isActive: backendTable.isActive !== undefined ? backendTable.isActive : true,
      restaurantId: backendTable.restaurantId,
      qrCode: backendTable.qrCode,
      position: backendTable.position,
      shape: backendTable.shape || 'rectangle',
      createdAt: backendTable.createdAt,
      updatedAt: backendTable.updatedAt
    } as Table;
  }

  /**
   * GET /restaurants/:restaurantId/tables - List tables
   */
  async list(restaurantId: string): Promise<ApiResponse<Table[]>> {
    const response = await this.client.get<any[]>(`/restaurants/${restaurantId}/tables`)

    // Transform the response data if it exists
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.map(table => this.transformTable(table)) as any;
    }

    return response as ApiResponse<Table[]>;
  }

  /**
   * POST /restaurants/:restaurantId/tables - Create table
   */
  async create(restaurantId: string, data: CreateTableRequest): Promise<ApiResponse<Table>> {
    // Transform frontend data to backend format
    const backendData = {
      tableNumber: data.tableNumber,
      seats: data.seats,
      shape: data.shape,
      locationDescription: data.locationDescription,
      status: 'AVAILABLE' // Default status
    };

    const response = await this.client.post<any>(`/restaurants/${restaurantId}/tables`, backendData)

    if (response.data) {
      response.data = this.transformTable(response.data) as any;
    }

    return response as ApiResponse<Table>;
  }

  /**
   * GET /restaurants/:restaurantId/tables/:tableId - Get table by ID
   */
  async getById(restaurantId: string, tableId: string): Promise<ApiResponse<Table>> {
    const response = await this.client.get<any>(`/restaurants/${restaurantId}/tables/${tableId}`)

    if (response.data) {
      response.data = this.transformTable(response.data) as any;
    }

    return response as ApiResponse<Table>;
  }

  /**
   * PUT /restaurants/:restaurantId/tables/:tableId - Update table
   */
  async update(restaurantId: string, tableId: string, data: UpdateTableRequest): Promise<ApiResponse<Table>> {
    // Transform frontend data to backend format
    const backendData: any = {};
    if (data.tableNumber !== undefined) backendData.tableNumber = data.tableNumber;
    if (data.seats !== undefined) backendData.seats = data.seats;
    if (data.shape !== undefined) backendData.shape = data.shape;
    if (data.locationDescription !== undefined) backendData.locationDescription = data.locationDescription;
    if (data.status !== undefined) backendData.status = data.status;

    const response = await this.client.put<any>(`/restaurants/${restaurantId}/tables/${tableId}`, backendData)

    if (response.data) {
      response.data = this.transformTable(response.data) as any;
    }

    return response as ApiResponse<Table>;
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
    const response = await this.client.put<any>(`/restaurants/${restaurantId}/tables/${tableId}/status`, { status })

    if (response.data) {
      response.data = this.transformTable(response.data) as any;
    }

    return response as ApiResponse<Table>;
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
  async getQRCodeImage(restaurantId: string, tableId: string): Promise<ApiResponse<{dataUrl: string, accessUrl: string}>> {
    // Add cache buster to force fresh response while debugging
    const cacheBuster = Date.now();
    return this.client.get(`/restaurants/${restaurantId}/tables/${tableId}/qrcode-image?_cb=${cacheBuster}`)
  }

  /**
   * POST /restaurants/:restaurantId/tables/:tableId/reset - Reset table
   */
  async reset(restaurantId: string, tableId: string): Promise<ApiResponse<void>> {
    return this.client.post(`/restaurants/${restaurantId}/tables/${tableId}/reset`)
  }

  /**
   * GET /restaurants/:restaurantId/tables/:tableId/sessions - Get table sessions
   */
  async getSessions(restaurantId: string, tableId: string): Promise<ApiResponse<TableSessionStatusResponse>> {
    return this.client.get(`/restaurants/${restaurantId}/tables/${tableId}/sessions`)
  }
}
