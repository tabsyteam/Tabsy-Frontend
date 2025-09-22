import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  MultiUserTableSession,
  TableSessionUser
} from '@tabsy/shared-types'
import { serializeQueryParams, createPaginationParams, createFilterParams } from '@tabsy/shared-utils'

export interface RestaurantTableSessionsResponse {
  sessions: RestaurantTableSessionOverview[]
  totalSessions: number
  activeSessions: number
  totalRevenue: number
  pagination: {
    page: number
    limit: number
    totalPages: number
    total: number
  }
}

export interface RestaurantTableSessionOverview extends MultiUserTableSession {
  restaurantName: string
  tableName: string
  userCount: number
  orderCount: number
  lastOrderAt?: string
  sessionDuration: number // in minutes
  needsAttention: boolean
  alertReasons: string[]
}

export interface RestaurantSessionMetrics {
  totalSessions: number
  activeSessions: number
  averageSessionDuration: number
  totalRevenue: number
  sessionsToday: number
  sessionsThisWeek: number
  averagePartySize: number
  topRestaurants: {
    restaurantId: string
    restaurantName: string
    sessionCount: number
    revenue: number
  }[]
}

export interface RestaurantSessionFilters {
  status?: string[]
  tableId?: string
  dateFrom?: string
  dateTo?: string
  needsAttention?: boolean
  minAmount?: number
  maxAmount?: number
}

export class RestaurantTableSessionAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /restaurant/table-sessions - Get all table sessions for restaurant with filters and pagination
   */
  async getAllSessions(filters?: RestaurantSessionFilters, page = 1, limit = 20): Promise<ApiResponse<RestaurantTableSessionsResponse>> {
    const queryParams = serializeQueryParams({
      ...createPaginationParams({ page, limit }),
      ...createFilterParams(filters || {})
    })

    return this.client.get(`/restaurant/table-sessions?${queryParams}`)
  }

  /**
   * GET /restaurant/table-sessions/metrics - Get session metrics and analytics for restaurant
   */
  async getSessionMetrics(dateFrom?: string, dateTo?: string): Promise<ApiResponse<RestaurantSessionMetrics>> {
    const queryParams = serializeQueryParams({ dateFrom, dateTo })

    return this.client.get(`/restaurant/table-sessions/metrics?${queryParams}`)
  }

  /**
   * GET /restaurant/table-sessions/:sessionId - Get detailed session information
   */
  async getSessionDetails(sessionId: string): Promise<ApiResponse<{
    session: RestaurantTableSessionOverview
    users: TableSessionUser[]
    orders: any[]
    payments: any[]
    timeline: {
      timestamp: string
      event: string
      description: string
      userId?: string
    }[]
  }>> {
    return this.client.get(`/restaurant/table-sessions/${sessionId}`)
  }

  /**
   * POST /restaurant/table-sessions/:sessionId/close - Force close session (restaurant staff action)
   */
  async forceCloseSession(sessionId: string, reason: string): Promise<ApiResponse<{
    sessionId: string
    status: string
    closedAt: string
  }>> {
    return this.client.post(`/restaurant/table-sessions/${sessionId}/close`, { reason, forceClose: true })
  }

  /**
   * GET /restaurant/table-sessions/alerts - Get sessions that need attention for restaurant
   */
  async getSessionAlerts(): Promise<ApiResponse<{
    alerts: {
      sessionId: string
      alertType: 'LONG_DURATION' | 'PAYMENT_PENDING' | 'INACTIVE_USERS' | 'HIGH_AMOUNT'
      message: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH'
      createdAt: string
    }[]
    totalAlerts: number
  }>> {
    return this.client.get('/restaurant/table-sessions/alerts')
  }

  /**
   * GET /restaurant/table-sessions/:sessionId/payment-summary - Get payment summary for decision making
   */
  async getPaymentSummary(sessionId: string): Promise<ApiResponse<{
    tableSessionId: string
    status: string
    totalOwed: number
    totalPaid: number
    remainingBalance: number
    isFullyPaid: boolean
    orders: Array<{
      orderId: string
      orderNumber: string
      total: number
      paidAmount: number
      remainingAmount: number
      isFullyPaid: boolean
    }>
    session: {
      id: string
      sessionCode: string
      status: string
      createdAt: string
      expiresAt: string
      lastActivity: string
    }
    recommendations: string[]
  }>> {
    return this.client.get(`/restaurant/table-sessions/${sessionId}/payment-summary`)
  }
}