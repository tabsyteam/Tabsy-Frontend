// Legacy auth types - consider migrating to auth/index.ts
import { User, UserRole } from './domain/user';

export interface AuthSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

// JWT Token payload
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  restaurantId?: string;
  iat: number;
  exp: number;
}

// Auth API endpoints response types
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RefreshTokenResponse {
  token: string;
  expiresAt: number;
}
