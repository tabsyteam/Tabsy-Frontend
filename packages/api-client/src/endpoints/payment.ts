import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Payment,
  PaymentStatus,
  PaymentIntent,
  PaymentMethod
} from '@tabsy/shared-types'
import { createQueryString, createFilterParams } from '@tabsy/shared-utils'

export interface CreatePaymentIntentRequest {
  orderId: string
  amount: number
  currency: string
  paymentMethod?: PaymentMethod
  customerId?: string
  splitPayment?: boolean
}

export interface PaymentReceiptResponse {
  receiptId: string
  receiptUrl: string
  receiptData: {
    orderTotal: number
    tax: number
    tip: number
    total: number
    paymentMethod: string
    timestamp: string
  }
}

export interface SplitPaymentRequest {
  orderId: string
  splits: Array<{
    amount: number
    customerId?: string
    email?: string
  }>
}

export interface SplitPaymentResponse {
  groupId: string
  payments: Payment[]
}

export interface CashPaymentRequest {
  orderId: string
  amount: number
}

export interface StripeWebhookEvent {
  id: string
  type: string
  data: any
}

export class PaymentAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /payments - List all payments (admin only)
   */
  async list(filters?: {
    page?: number
    limit?: number
    dateFrom?: string
    dateTo?: string
    status?: PaymentStatus
    restaurantId?: string
  }): Promise<ApiResponse<Payment[]>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/payments${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  /**
   * POST /payments/order - Create payment for a single order
   */
  async createOrderPayment(data: CreatePaymentIntentRequest): Promise<ApiResponse<PaymentIntent>> {
    return this.client.post('/payments/order', data)
  }

  /**
   * @deprecated Use createOrderPayment instead
   */
  async createIntent(data: CreatePaymentIntentRequest): Promise<ApiResponse<PaymentIntent>> {
    return this.createOrderPayment(data)
  }

  /**
   * GET /payments/:id - Get payment by ID
   */
  async getById(id: string): Promise<ApiResponse<Payment>> {
    return this.client.get(`/payments/${id}`)
  }

  /**
   * GET /payments/:id/receipt - Generate receipt
   */
  async getReceipt(id: string): Promise<ApiResponse<PaymentReceiptResponse>> {
    return this.client.get(`/payments/${id}/receipt`)
  }

  /**
   * GET /payments/:id/public - Get public payment details (no authentication required)
   */
  async getPublicDetails(id: string): Promise<ApiResponse<Payment>> {
    return this.client.get(`/payments/${id}/public`)
  }

  /**
   * DELETE /payments/:id - Delete payment (admin)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/payments/${id}`)
  }

  /**
   * PUT /payments/:id/status - Update payment status
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<ApiResponse<Payment>> {
    return this.client.put(`/payments/${id}/status`, { status })
  }

  /**
   * PUT /payments/:id/method - Change payment method (cash to card)
   */
  async changeMethod(id: string, paymentMethod: PaymentMethod): Promise<ApiResponse<Payment & { clientSecret: string | null }>> {
    return this.client.put(`/payments/${id}/method`, { paymentMethod })
  }


  /**
   * POST /payments/cash - Record cash payment
   */
  async recordCash(data: CashPaymentRequest): Promise<ApiResponse<Payment>> {
    return this.client.post('/payments/cash', data)
  }

  /**
   * POST /payments/split - Create split payment
   */
  async createSplit(data: SplitPaymentRequest): Promise<ApiResponse<SplitPaymentResponse>> {
    return this.client.post('/payments/split', data)
  }

  /**
   * GET /payments/split/:groupId - Get split payments
   */
  async getSplitPayments(groupId: string): Promise<ApiResponse<Payment[]>> {
    return this.client.get(`/payments/split/${groupId}`)
  }

  /**
   * PATCH /payments/split/:groupId/participant/:participantId - Update split payment participant
   */
  async updateSplitParticipant(
    groupId: string,
    participantId: string,
    data: {
      amount?: number
      tipAmount?: number
      hasPaid?: boolean
    }
  ): Promise<ApiResponse<Payment>> {
    return this.client.patch(`/payments/split/${groupId}/participant/${participantId}`, data)
  }

  /**
   * GET /payments/split/:groupId/status - Get split payment group status
   */
  async getSplitPaymentStatus(groupId: string): Promise<ApiResponse<{
    groupId: string
    totalAmount: number
    paidAmount: number
    remainingAmount: number
    completedParticipants: number
    totalParticipants: number
    isComplete: boolean
    participants: Array<{
      participantId: string
      participantName: string
      amount: number
      tipAmount?: number
      hasPaid: boolean
      paymentId?: string
    }>
  }>> {
    return this.client.get(`/payments/split/${groupId}/status`)
  }

  /**
   * POST /payments/split/:groupId/cancel - Cancel split payment group
   */
  async cancelSplitPayment(groupId: string, reason?: string): Promise<ApiResponse<{
    groupId: string
    cancelled: boolean
    refundsProcessed: number
  }>> {
    return this.client.post(`/payments/split/${groupId}/cancel`, { reason })
  }

  /**
   * POST /payments/split/:groupId/participant/:participantId/remind - Send payment reminder
   */
  async sendSplitPaymentReminder(
    groupId: string,
    participantId: string,
    message?: string
  ): Promise<ApiResponse<{ sent: boolean }>> {
    return this.client.post(`/payments/split/${groupId}/participant/${participantId}/remind`, { message })
  }

  /**
   * POST /payments/webhooks/stripe - Stripe webhook handler
   */
  async handleStripeWebhook(event: StripeWebhookEvent): Promise<ApiResponse<void>> {
    return this.client.post('/payments/webhooks/stripe', event)
  }

  /**
   * POST /orders/:orderId/payments - Create payment for order
   */
  async createForOrder(orderId: string, data: CreatePaymentIntentRequest): Promise<ApiResponse<Payment>> {
    return this.client.post(`/orders/${orderId}/payments`, data)
  }

  /**
   * GET /orders/:orderId/payments - Get payments for order
   */
  async getByOrder(orderId: string): Promise<ApiResponse<Payment[]>> {
    return this.client.get(`/orders/${orderId}/payments`)
  }

  /**
   * GET /restaurants/:restaurantId/payments - Get restaurant payments
   */
  async getByRestaurant(
    restaurantId: string,
    filters?: {
      dateFrom?: string
      dateTo?: string
      status?: PaymentStatus
      page?: number
      limit?: number
    }
  ): Promise<ApiResponse<Payment[]>> {
    const queryString = createQueryString(createFilterParams(filters || {}))
    const url = `/restaurants/${restaurantId}/payments${queryString ? `?${queryString}` : ''}`
    return this.client.get(url)
  }

  /**
   * POST /payments/:id/simulate-webhook - Simulate webhook success (development only)
   */
  async simulateWebhookSuccess(
    paymentId: string,
    stripePaymentIntentId: string
  ): Promise<ApiResponse<{ payment: Payment; simulated: boolean }>> {
    return this.client.post(`/payments/${paymentId}/simulate-webhook`, {
      stripePaymentIntentId
    })
  }
}
