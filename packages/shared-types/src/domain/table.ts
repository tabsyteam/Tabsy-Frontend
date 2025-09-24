export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE'
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
  status: GuestTableSessionStatus
  startedAt: string
  expiresAt: string
  lastActivityAt: string
  metadata?: Record<string, any>
}

export enum GuestTableSessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}

export interface TableSessionStatusInfo {
  needsAttention: boolean
  activeSessions: number
  oldSessions: number
  recommendations: string[]
}

export interface ActiveSession {
  sessionId: string
  createdAt: string
  expiresAt: string
  ageMinutes: number
  isOld: boolean
}

export interface TableSessionStatusResponse {
  tableId: string
  restaurantId: string
  sessionStatus: TableSessionStatusInfo
  activeSessions: ActiveSession[]
  totalActiveSessions: number
}

// Multi-User Table Session Types (properly organized here)
export enum TableSessionStatus {
  ACTIVE = 'ACTIVE',
  ORDERING_LOCKED = 'ORDERING_LOCKED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CLOSED = 'CLOSED'
}

export interface MultiUserTableSession {
  id: string;
  tableId: string;
  restaurantId: string;
  sessionCode: string;
  status: TableSessionStatus;
  hostUserId?: string;
  totalAmount: number;
  paidAmount: number;
  closedAt?: string;              // Show when session was closed
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

export interface TableSessionUser {
  id: string;
  guestSessionId: string;
  userName: string;
  isHost: boolean;
  createdAt: string;
  lastActivity: string;
}

export interface TableSessionBill {
  sessionId: string;
  sessionCode: string;
  billByRound: {
    [roundNumber: number]: {
      roundTotal: number;
      orders: {
        orderId: string;
        orderNumber: string;
        placedBy: string;
        total: number;
        items: {
          id: string;
          name: string;
          quantity: number;
          subtotal: number;
        }[];
      }[];
    };
  };
  summary: {
    subtotal: number;
    tax: number;
    tip: number;
    grandTotal: number;
    totalPaid: number;
    remainingBalance: number;
    isFullyPaid: boolean;
  };
}

export interface SplitPaymentOption {
  type: 'equal' | 'by_items' | 'by_percentage' | 'by_amount';
  participants: string[]; // Guest session IDs
  percentages?: { [guestSessionId: string]: number };
  amounts?: { [guestSessionId: string]: number };
  itemAssignments?: { [itemId: string]: string }; // itemId -> guestSessionId
}
