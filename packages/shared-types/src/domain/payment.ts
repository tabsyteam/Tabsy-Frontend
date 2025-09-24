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
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_PAYMENT = 'MOBILE_PAYMENT',
  CASH = 'CASH'
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
  refundAmount?: number
  refundReason?: string
  refundId?: string
  refunded?: boolean
  metadata?: Record<string, any>
  // Enhanced payment system fields
  tableSessionId?: string  // Links payment to table session
  paymentType?: string     // Differentiates individual vs table-wide payments
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

// Table Session Payment Types
export interface TableSessionPayment extends Payment {
  tableId: string
  tableSessionId: string
  sessionCode?: string
  isGroupPayment: boolean
  splitDetails?: SplitPaymentDetails
}

export interface SplitPaymentDetails {
  splitType: 'EQUAL' | 'BY_ITEMS' | 'BY_PERCENTAGE' | 'BY_AMOUNT'
  totalParticipants: number
  userAmount: number
  userTipAmount?: number
  isComplete: boolean
  otherParticipants?: Array<{
    guestSessionId: string
    userName: string
    amount: number
    tipAmount?: number
    hasPaid: boolean
  }>
}

// Table-Wide Payment Types (New Enhancement)
export interface TableSessionPaymentRequest {
  paymentMethod: PaymentMethod
  includeOrders?: string[]
  amount?: number
  tipAmount?: number
}

export interface TableSessionPaymentIntent {
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

export interface TableSessionPaymentStatus {
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

// Payment Audit Types (New Enhancement)
export interface PaymentAudit {
  id: string
  paymentId: string
  eventType: string
  eventData: Record<string, any>
  userId?: string
  ipAddress?: string
  createdAt: string
}

export interface PaymentLock {
  id: string
  tableSessionId: string
  lockType: string
  lockedBy: string
  expiresAt: string
  createdAt: string
}

// Webhook Event Types (New Enhancement)
export interface WebhookEvent {
  id: string
  stripeEventId: string
  eventType: string
  processed: boolean
  processingAttempts: number
  lastError?: string
  eventData?: Record<string, any>
  createdAt: string
  processedAt?: string
}

// Enhanced Payment Analytics Types
export interface PaymentMetrics {
  // Basic metrics
  totalRevenue: number
  totalTransactions: number
  successfulTransactions: number
  pendingPayments: number
  pendingAmount: number
  failedPayments: number
  averageTransactionValue: number

  // Rates
  successRate: number
  failureRate: number
  refundRate: number

  // Payment method breakdown
  cardTransactions: number
  cardAmount: number
  digitalWalletTransactions: number
  digitalWalletAmount: number
  cashTransactions: number
  cashAmount: number

  // Method percentages
  cardPercentage: number
  walletPercentage: number
  cashPercentage: number

  // Trends
  revenueGrowth: number
  transactionGrowth: number
  successRateChange: number

  // Time-based data
  hourlyData?: Array<{
    hour: number
    revenue: number
    transactions: number
  }>

  // Daily trend data
  dailyTrend?: Array<{
    date: string
    revenue: number
    transactions: number
    successRate: number
  }>

  // Peak performance data
  peakHours?: Array<{
    hour: number
    transactions: number
  }>

  // Top performing days
  topDays?: Array<{
    dayOfWeek: string
    averageRevenue: number
    averageTransactions: number
  }>
}

// Payment Reconciliation Types (Admin Portal)
export interface PaymentReconciliation {
  summary: {
    grossRevenue: number
    refunds: number
    netRevenue: number
    pendingAmount: number
    failedAmount: number
  }

  transactions: {
    completed: number
    pending: number
    failed: number
    refunded: number
    total: number
  }

  byMethod: Record<PaymentMethod, {
    count: number
    amount: number
  }>

  discrepancies: PaymentDiscrepancy[]
}

export interface PaymentDiscrepancy {
  id: string
  type: 'MISSING_PAYMENT' | 'DUPLICATE_PAYMENT' | 'AMOUNT_MISMATCH' | 'STATUS_MISMATCH'
  paymentId?: string
  orderId?: string
  expectedAmount?: number
  actualAmount?: number
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  createdAt: string
}

// Live Payment Monitoring Types
export interface LivePaymentUpdate {
  paymentId: string
  orderId: string
  restaurantId: string
  status: PaymentStatus
  amount: number
  method: PaymentMethod
  timestamp: string
  customerInfo?: {
    id?: string
    name?: string
    tableId?: string
  }
}

export interface PaymentStatusUpdate {
  paymentId: string
  orderId: string
  previousStatus: PaymentStatus
  newStatus: PaymentStatus
  updatedAt: string
  updatedBy?: string
  reason?: string
}

// Payment Filter Types
export interface PaymentFilters {
  restaurantId?: string
  status?: PaymentStatus
  method?: PaymentMethod
  dateRange?: 'all' | 'today' | 'week' | 'month'
  dateFrom?: Date
  dateTo?: Date
  search?: string
  sortBy?: 'createdAt' | 'amount' | 'status' | 'method'
  sortOrder?: 'asc' | 'desc'
  minAmount?: number
  maxAmount?: number
  customerId?: string
  orderId?: string
  tableId?: string
}

// Payment Notification Types
export interface PaymentNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  paymentId?: string
  orderId?: string
  amount?: number
  timestamp: Date
  isRead: boolean
}

// Enhanced Receipt Types
export interface DetailedReceipt extends Receipt {
  restaurant: {
    name: string
    address: string
    phone: string
    taxId?: string
  }

  customer: {
    name?: string
    email?: string
    phone?: string
  }

  table?: {
    id: string
    number: string
    sessionId?: string
  }

  payment: {
    method: PaymentMethod
    transactionId?: string
    cardLast4?: string
    authCode?: string
  }

  splitInfo?: {
    isGroupPayment: boolean
    totalParticipants?: number
    userPortion?: {
      subtotal: number
      tax: number
      tip: number
      total: number
    }
  }

  qrCodeUrl?: string
  receiptUrl?: string
}

// Stripe Integration Types
export interface StripePaymentData {
  clientSecret: string
  paymentIntentId: string
  publicKey: string
  amount: number
  currency: string
  orderId: string
  customerId?: string
}

export interface StripePaymentResult {
  paymentIntent: {
    id: string
    status: string
    amount: number
    currency: string
  }
  paymentMethod?: {
    id: string
    type: string
    card?: {
      brand: string
      last4: string
    }
  }
  error?: {
    type: string
    code: string
    message: string
  }
}

// Payment Export Types
export interface PaymentExportData {
  payments: Payment[]
  summary: PaymentSummary
  filters: PaymentFilters
  exportedAt: string
  exportedBy: string
  format: 'CSV' | 'PDF' | 'EXCEL'
  totalRecords: number
}

export interface PaymentExportOptions {
  format: 'CSV' | 'PDF' | 'EXCEL'
  includeRefunds: boolean
  includePending: boolean
  groupByRestaurant: boolean
  includeCustomerInfo: boolean
  includeOrderDetails: boolean
  dateRange: {
    from: string
    to: string
  }
}

// Real-Time Payment Monitoring Types
export interface RealTimePaymentMetrics {
  recentTransactions: number
  recentRevenue: number
  pendingPayments: number
  failedPaymentsLast24h: number
  lastUpdate: string
}

// Payment Alert Types
export interface PaymentAlert {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  value?: number
  threshold?: number
  createdAt?: string
}

// Payment Health Status Types
export interface PaymentHealthStatus {
  status: 'HEALTHY' | 'MONITORING' | 'WARNING' | 'CRITICAL'
  score: number
  lastCheck: string
  metrics: {
    pendingPayments: number
    failedPaymentsLast24h: number
    recentTransactions: number
    recentRevenue: number
  }
  alerts: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
  recommendations: string[]
}

// Payment Metrics Query Parameters
export interface PaymentMetricsQuery {
  startDate: string
  endDate: string
  restaurantId?: string
  includeHourlyData?: boolean
  includeTrendData?: boolean
}
