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
    clientSecret?: string
  }>
  paymentSummary: {
    byMethod: Record<string, number>
    byUser: Record<string, number>
  }
}

export interface CancelTableSessionPaymentRequest {
  reason?: string
}

export interface UpdatePaymentTipRequest {
  tipAmount: number
}

export interface UpdatePaymentTipResponse {
  id: string
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
  updatedAt: string
}

export interface CreateSplitCalculationRequest {
  splitType: 'EQUAL' | 'BY_ITEMS' | 'BY_PERCENTAGE' | 'BY_AMOUNT'
  participants: string[]
  percentages?: { [userId: string]: number }
  amounts?: { [userId: string]: number }
  itemAssignments?: { [itemId: string]: string }
}

export interface UpdateSplitCalculationRequest {
  percentage?: number
  amount?: number
  itemAssignments?: { [itemId: string]: string }
}

export interface SplitCalculationResponse {
  splitType: 'EQUAL' | 'BY_ITEMS' | 'BY_PERCENTAGE' | 'BY_AMOUNT'
  participants: string[]
  splitAmounts: { [userId: string]: number }
  totalAmount: number
  percentages?: { [userId: string]: number }
  amounts?: { [userId: string]: number }
  itemAssignments?: { [itemId: string]: string }
  valid: boolean
  timestamp: string
  lastUpdatedBy?: string
  lastUpdatedAt?: string
  // New locking fields
  isLocked?: boolean
  lockedAt?: string
  lockedBy?: string
  lockReason?: string
  paymentIntentIds?: string[]
}

export interface SplitCalculationLockRequest {
  lockReason?: string
}

export interface SplitCalculationLockResponse {
  tableSessionId: string
  isLocked: boolean
  lockedAt: string
  lockedBy: string
  lockReason: string
  message: string
}

export interface SplitCalculationLockStatusResponse {
  tableSessionId: string
  isLocked: boolean
  lockedAt?: string
  lockedBy?: string
  lockReason?: string
  paymentIntentIds?: string[]
  canModify: boolean
  message?: string
}

export interface RecoverSplitLockResponse {
  recovered: boolean
  cleaned: boolean
  lockStatus: {
    isLocked: boolean
    lockedBy?: string
    lockReason?: string
  }
  message: string
}

export interface CleanupStaleSplitLocksResponse {
  cleanedCount: number
  affectedTableSessions: string[]
  message: string
}

export interface TableSessionStatusResponse {
  tableSessionId: string
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED' | 'ORDERING_LOCKED' | 'PAYMENT_PENDING' | 'PAYMENT_COMPLETE'
  isActive: boolean
  isClosed: boolean
  isExpired: boolean
  canOrder: boolean
  createdAt: string
  expiresAt: string
  closedAt?: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  userCount: number
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
   * GET /table-sessions/:sessionId/status - Get table session status
   */
  async getStatus(sessionId: string): Promise<ApiResponse<TableSessionStatusResponse>> {
    return this.client.get(`/table-sessions/${sessionId}/status`)
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
   * POST /table-sessions/:sessionId/extend - Extend table session expiry time
   * Extends the session by 30 minutes from current time
   */
  async extend(sessionId: string): Promise<ApiResponse<{ tableSessionId: string; expiresAt: string; message: string }>> {
    return this.client.post(`/table-sessions/${sessionId}/extend`, {})
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

  /**
   * PATCH /table-sessions/:sessionId/payments/:paymentId/tip - Update payment tip amount
   */
  async updatePaymentTip(
    sessionId: string,
    paymentId: string,
    data: UpdatePaymentTipRequest
  ): Promise<ApiResponse<UpdatePaymentTipResponse>> {
    return this.client.patch(`/table-sessions/${sessionId}/payments/${paymentId}/tip`, data)
  }

  /**
   * POST /table-sessions/:sessionId/split-calculation - Create split calculation
   */
  async createSplitCalculation(
    sessionId: string,
    data: CreateSplitCalculationRequest,
    options?: { guestSessionId?: string }
  ): Promise<ApiResponse<SplitCalculationResponse>> {
    const headers: Record<string, string> = {}
    if (options?.guestSessionId) {
      headers['x-session-id'] = options.guestSessionId
    }

    return this.client.post(`/table-sessions/${sessionId}/split-calculation`, data, { headers })
  }

  /**
   * PATCH /table-sessions/:sessionId/split-calculation/:userId - Update user's split
   */
  async updateSplitCalculation(
    sessionId: string,
    userId: string,
    data: UpdateSplitCalculationRequest,
    options?: { guestSessionId?: string }
  ): Promise<ApiResponse<SplitCalculationResponse>> {
    const headers: Record<string, string> = {}
    if (options?.guestSessionId) {
      headers['x-session-id'] = options.guestSessionId
    }

    return this.client.patch(`/table-sessions/${sessionId}/split-calculation/${userId}`, data, { headers })
  }

  /**
   * GET /table-sessions/:sessionId/split-calculation - Get split calculation status
   */
  async getSplitCalculation(sessionId: string): Promise<ApiResponse<SplitCalculationResponse | null>> {
    return this.client.get(`/table-sessions/${sessionId}/split-calculation`)
  }

  /**
   * POST /table-sessions/:sessionId/split-calculation/lock - Lock split calculation
   */
  async lockSplitCalculation(
    sessionId: string,
    data?: SplitCalculationLockRequest,
    options?: { guestSessionId?: string }
  ): Promise<ApiResponse<SplitCalculationLockResponse>> {
    const headers: Record<string, string> = {}
    if (options?.guestSessionId) {
      headers['x-session-id'] = options.guestSessionId
    }

    return this.client.post(`/table-sessions/${sessionId}/split-calculation/lock`, data || {}, { headers })
  }

  /**
   * DELETE /table-sessions/:sessionId/split-calculation/lock - Unlock split calculation
   */
  async unlockSplitCalculation(
    sessionId: string,
    options?: { guestSessionId?: string }
  ): Promise<ApiResponse<SplitCalculationLockResponse>> {
    const headers: Record<string, string> = {}
    if (options?.guestSessionId) {
      headers['x-session-id'] = options.guestSessionId
    }

    return this.client.delete(`/table-sessions/${sessionId}/split-calculation/lock`, { headers })
  }

  /**
   * GET /table-sessions/:sessionId/split-calculation/lock-status - Get split calculation lock status
   */
  async getSplitCalculationLockStatus(sessionId: string): Promise<ApiResponse<SplitCalculationLockStatusResponse>> {
    return this.client.get(`/table-sessions/${sessionId}/split-calculation/lock-status`)
  }

  /**
   * POST /table-sessions/:sessionId/split-calculation/recover-lock - Recover split lock for reconnected users
   */
  async recoverSplitLock(
    sessionId: string,
    options?: { guestSessionId?: string }
  ): Promise<ApiResponse<RecoverSplitLockResponse>> {
    const headers: Record<string, string> = {}
    if (options?.guestSessionId) {
      headers['x-session-id'] = options.guestSessionId
    }

    return this.client.post(`/table-sessions/${sessionId}/split-calculation/recover-lock`, {}, { headers })
  }

  /**
   * POST /table-sessions/:sessionId/split-calculation/force-unlock - Force unlock split calculation (staff only)
   */
  async forceUnlockSplitCalculation(sessionId: string): Promise<ApiResponse<SplitCalculationLockResponse>> {
    return this.client.post(`/table-sessions/${sessionId}/split-calculation/force-unlock`, {})
  }

  /**
   * POST /table-sessions/split-calculation/cleanup-stale-locks - Cleanup stale split locks (admin only)
   */
  async cleanupStaleSplitLocks(): Promise<ApiResponse<CleanupStaleSplitLocksResponse>> {
    return this.client.post('/table-sessions/split-calculation/cleanup-stale-locks', {})
  }

}