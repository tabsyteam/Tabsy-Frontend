import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  TableSession,
  TableSessionUser,
  Order,
  TableSessionBill,
  PaymentMethod,
  PaymentStatus
} from '@tabsy/shared-types'

export interface CreateTableSessionRequest {
  tableId: string
  restaurantId: string
  userName?: string
}

export interface LockOrderRequest {
  guestSessionId: string
}

export interface CloseTableSessionRequest {
  reason?: string
}

export interface TableSessionResponse {
  tableSessionId: string
  status: string
  expiresAt: string
  guestSessionId: string
  isHost: boolean
}

export interface TableSessionUsersResponse {
  tableSessionId: string
  tableSession: {
    id: string
    createdAt: string
    expiresAt: string
    status: string
    totalAmount: number
    paidAmount: number
  }
  users: TableSessionUser[]
  totalUsers: number
}

export interface TableSessionOrdersResponse {
  tableSessionId: string
  ordersByRound: { [key: number]: Order[] }
  totalAmount: number
  paidAmount: number
  status: string
}

export interface CreateTableSessionPaymentRequest {
  paymentMethod: PaymentMethod
  includeOrders?: string[]
  amount?: number
  tipAmount?: number
}

export interface TableSessionPaymentResponse {
  id: string
  clientSecret: string
  amount: number
  tableSessionId: string
  status: PaymentStatus
  ordersIncluded: string[]
  breakdown: {
    subtotal: number
    tax: number
    tip: number
    total: number
  }
}

export interface TableSessionPaymentStatusResponse {
  tableSessionId: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  canAcceptNewPayment: boolean
  lastPaymentAt?: string
  payments: Array<{
    id: string
    amount: number
    status: PaymentStatus
    paymentMethod: PaymentMethod
    createdAt: string
    paidBy?: string
  }>
  paymentSummary: {
    byMethod: Record<string, number>
    byUser: Record<string, number>
  }
}

export interface CancelTableSessionPaymentRequest {
  reason?: string
}

export class TableSessionAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * POST /table-sessions/create - Create new shared table session
   * Note: This is mainly for admin/staff use. Customers use QR endpoint instead.
   */
  async create(data: CreateTableSessionRequest): Promise<ApiResponse<TableSessionResponse>> {
    return this.client.post<TableSessionResponse>('/table-sessions/create', data)
  }

  /**
   * GET /table-sessions/:sessionId/users - Get all users in table session
   */
  async getUsers(sessionId: string): Promise<ApiResponse<TableSessionUsersResponse>> {
    return this.client.get(`/table-sessions/${sessionId}/users`)
  }

  /**
   * GET /table-sessions/:sessionId/orders - Get all orders for table session
   */
  async getOrders(sessionId: string): Promise<ApiResponse<TableSessionOrdersResponse>> {
    return this.client.get(`/table-sessions/${sessionId}/orders`)
  }

  /**
   * POST /table-sessions/:sessionId/lock-order - Lock current cart for ordering
   */
  async lockOrder(sessionId: string, data: LockOrderRequest): Promise<ApiResponse<{ tableSessionId: string; status: string }>> {
    return this.client.post(`/table-sessions/${sessionId}/lock-order`, data)
  }

  /**
   * GET /table-sessions/:sessionId/bill - Get consolidated bill for table session
   */
  async getBill(sessionId: string): Promise<ApiResponse<TableSessionBill>> {
    return this.client.get(`/table-sessions/${sessionId}/bill`)
  }

  /**
   * POST /table-sessions/:sessionId/close - Close table session (staff/admin only)
   */
  async close(sessionId: string, data?: CloseTableSessionRequest): Promise<ApiResponse<{ tableSessionId: string; status: string; endedSessions: number }>> {
    return this.client.post(`/table-sessions/${sessionId}/close`, data || {})
  }

  /**
   * POST /table-sessions/:sessionId/payment - Create table-wide payment intent
   */
  async createPayment(
    sessionId: string,
    data: CreateTableSessionPaymentRequest,
    options?: { guestSessionId?: string }
  ): Promise<ApiResponse<TableSessionPaymentResponse>> {
    const headers: Record<string, string> = {}
    if (options?.guestSessionId) {
      headers['x-session-id'] = options.guestSessionId
    }

    return this.client.post(`/table-sessions/${sessionId}/payment`, data, { headers })
  }

  /**
   * GET /table-sessions/:sessionId/payment-status - Get table session payment status
   */
  async getPaymentStatus(sessionId: string): Promise<ApiResponse<TableSessionPaymentStatusResponse>> {
    return this.client.get(`/table-sessions/${sessionId}/payment-status`)
  }

  /**
   * POST /table-sessions/:sessionId/payments/:paymentId/cancel - Cancel table session payment
   */
  async cancelPayment(
    sessionId: string,
    paymentId: string,
    data?: CancelTableSessionPaymentRequest
  ): Promise<ApiResponse<{ paymentId: string; cancelled: boolean }>> {
    return this.client.post(`/table-sessions/${sessionId}/payments/${paymentId}/cancel`, data || {})
  }

}