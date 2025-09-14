export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  CRYPTO = 'CRYPTO'
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  SQUARE = 'SQUARE',
  CASH = 'CASH'
}

export interface Payment {
  id: string
  orderId: string
  restaurantId: string
  customerId?: string
  sessionId?: string
  amount: number
  tipAmount: number
  totalAmount: number
  currency: string
  method: PaymentMethod
  provider: PaymentProvider
  status: PaymentStatus
  paymentIntentId?: string
  transactionId?: string
  receiptUrl?: string
  failureReason?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface PaymentIntent {
  id: string
  orderId: string
  amount: number
  currency: string
  clientSecret: string
  status: PaymentIntentStatus
  paymentMethods: PaymentMethod[]
  metadata?: Record<string, any>
  createdAt: string
  expiresAt: string
}

export enum PaymentIntentStatus {
  REQUIRES_PAYMENT_METHOD = 'REQUIRES_PAYMENT_METHOD',
  REQUIRES_CONFIRMATION = 'REQUIRES_CONFIRMATION',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  CANCELLED = 'CANCELLED'
}

export interface SplitPayment {
  id: string
  groupId: string
  orderId: string
  participantId: string
  participantName?: string
  amount: number
  tipAmount: number
  totalAmount: number
  status: PaymentStatus
  paymentId?: string
  createdAt: string
  updatedAt: string
}

export interface Receipt {
  id: string
  paymentId: string
  orderId: string
  restaurantId: string
  receiptNumber: string
  items: ReceiptItem[]
  subtotal: number
  taxAmount: number
  tipAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  createdAt: string
  customerEmail?: string
  customerPhone?: string
}

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  modifications?: string[]
}

export interface CreatePaymentIntentRequest {
  orderId: string
  amount: number
  currency?: string
  paymentMethods?: PaymentMethod[]
  metadata?: Record<string, any>
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string
  paymentMethodId?: string
  billingDetails?: BillingDetails
}

export interface BillingDetails {
  name: string
  email?: string
  phone?: string
  address?: {
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
}

export interface AddTipRequest {
  paymentId: string
  tipAmount: number
}

export interface RefundRequest {
  paymentId: string
  amount?: number // partial refund amount, full if not specified
  reason: string
}

export interface CreateSplitPaymentRequest {
  orderId: string
  participants: SplitParticipant[]
}

export interface SplitParticipant {
  participantName: string
  amount: number
  tipAmount?: number
  participantId?: string
}

export interface PaymentSummary {
  totalRevenue: number
  totalTransactions: number
  averageOrderValue: number
  paymentMethodBreakdown: PaymentMethodBreakdown[]
  tipSummary: TipSummary
  refundSummary: RefundSummary
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod
  count: number
  amount: number
  percentage: number
}

export interface TipSummary {
  totalTips: number
  averageTipAmount: number
  averageTipPercentage: number
}

export interface RefundSummary {
  totalRefunds: number
  totalRefundAmount: number
  refundRate: number
}
