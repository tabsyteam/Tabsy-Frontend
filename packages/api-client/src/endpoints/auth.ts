import type { 
  LoginCredentials, 
  RegisterData, 
  LoginResponse,
  RefreshTokenResponse,
  User 
} from '@tabsy/shared-types'
import { TabsyApiClient } from '../client'

export interface TokenValidationResponse {
  valid: boolean
  user?: User
  expiresAt?: number
}

export class AuthAPI {
  constructor(private client: TabsyApiClient) {}

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', credentials)
    return response.data!
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/register', data)
    return response.data!
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await this.client.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken
    })
    return response.data!
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/users/me')
    return response.data!
  }

  async validateToken(): Promise<TokenValidationResponse> {
    const response = await this.client.get<TokenValidationResponse>('/auth/validate')
    return response.data!
  }
}
