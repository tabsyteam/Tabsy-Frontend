export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export interface Table {
  id: string
  restaurantId: string
  number: string
  capacity: number
  status: TableStatus
  qrCode: string
  position?: TablePosition
  shape: TableShape
  isActive: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TablePosition {
  x: number
  y: number
  rotation?: number
}

export enum TableShape {
  ROUND = 'ROUND',
  SQUARE = 'SQUARE',
  RECTANGULAR = 'RECTANGULAR'
}

export interface CreateTableRequest {
  restaurantId: string
  number: string
  capacity: number
  position?: TablePosition
  shape: TableShape
  notes?: string
}

export interface UpdateTableRequest {
  number?: string
  capacity?: number
  status?: TableStatus
  position?: TablePosition
  shape?: TableShape
  isActive?: boolean
  notes?: string
}

export interface QRCodeInfo {
  qrCode: string
  table: Table
  restaurant: {
    id: string
    name: string
    description: string
    branding: {
      logoUrl?: string
      primaryColor: string
      secondaryColor: string
    }
  }
  isValid: boolean
  expiresAt?: string
}

export interface TableSession {
  id: string
  tableId: string
  restaurantId: string
  sessionToken: string
  guestCount?: number
  status: TableSessionStatus
  startedAt: string
  expiresAt: string
  lastActivityAt: string
  metadata?: Record<string, any>
}

export enum TableSessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}
