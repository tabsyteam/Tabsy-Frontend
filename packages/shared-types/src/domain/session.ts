export interface Session {
  id: string;
  userId: string;
  restaurantId?: string;
  tableId?: string;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

export interface SessionToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface GuestSession {
  sessionId: string;  // Primary field - matches backend response
  tableId: string;
  restaurantId: string;
  tableSessionId: string;  // Link to table session - required from backend
  userName?: string;      // Display user name in UI
  isHost: boolean;        // Show different UI for hosts vs guests
  expiresAt: string;
  createdAt: string;
}

export interface CreateGuestSessionRequest {
  qrCode?: string;  // Optional - only required for QR code validation
  tableId: string;
  restaurantId: string;
  deviceSessionId?: string;  // Optional - unique device identifier for reliable device differentiation
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

// Note: Multi-User Table Session types have been moved to domain/table.ts for proper organization