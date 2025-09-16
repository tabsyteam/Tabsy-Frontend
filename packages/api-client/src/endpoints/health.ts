import type { TabsyApiClient } from '../client'
import type { ApiResponse } from '@tabsy/shared-types'

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  uptime: number
  database: {
    connected: boolean
    latency: number
  }
  redis: {
    connected: boolean
    latency: number
  }
  services: {
    stripe: boolean
    notifications: boolean
    websocket: boolean
  }
}

export class HealthAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /health - Health check
   */
  async check(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.client.get('/health')
  }

  /**
   * GET /ready - Readiness probe
   */
  async readiness(): Promise<ApiResponse<{ ready: boolean }>> {
    return this.client.get('/ready')
  }

  /**
   * GET /live - Liveness probe
   */
  async liveness(): Promise<ApiResponse<{ alive: boolean }>> {
    return this.client.get('/live')
  }
}
