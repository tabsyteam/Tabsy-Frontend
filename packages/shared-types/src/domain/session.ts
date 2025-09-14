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

export interface GuestSession extends Session {
  guestId: string;
  guestName?: string;
  guestPhone?: string;
}

export interface CreateGuestSessionRequest {
  restaurantId: string;
  tableId: string;
  guestName?: string;
  guestPhone?: string;
}