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
  expiresAt: string;
  createdAt?: string;
}

export interface CreateGuestSessionRequest {
  qrCode?: string;  // Optional - only required for QR code validation
  tableId: string;
  restaurantId: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}