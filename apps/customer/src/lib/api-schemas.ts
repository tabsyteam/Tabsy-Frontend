/**
 * API Response Validation Schemas
 *
 * Zod schemas for validating API responses to prevent runtime errors
 * from unexpected backend changes or malformed data.
 *
 * Based on API_DOCUMENTATION.md specifications
 *
 * @version 1.0.0
 */

import { z } from 'zod'

/**
 * Common API Response Wrapper
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional()
    }).optional()
  })

/**
 * Bill Summary Schema
 */
export const BillSummarySchema = z.object({
  subtotal: z.number(),
  tax: z.number(),
  tip: z.number(),
  grandTotal: z.number(),
  totalPaid: z.number(),
  remainingBalance: z.number(),
  isFullyPaid: z.boolean()
})

export type BillSummary = z.infer<typeof BillSummarySchema>

/**
 * Bill Item Schema
 */
export const BillItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
  options: z.array(z.object({
    optionId: z.string(),
    optionName: z.string(),
    valueId: z.string(),
    valueName: z.string(),
    price: z.number()
  })).optional()
})

export type BillItem = z.infer<typeof BillItemSchema>

/**
 * Bill Order Schema
 */
export const BillOrderSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
  placedBy: z.string(),
  placedAt: z.string(),
  items: z.array(BillItemSchema),
  total: z.number(),
  isPaid: z.boolean().optional(),
  payments: z.array(z.object({
    paymentId: z.string(),
    method: z.string(),
    amount: z.number(),
    paidAt: z.string()
  })).optional()
})

export type BillOrder = z.infer<typeof BillOrderSchema>

/**
 * Bill Round Schema
 */
export const BillRoundSchema = z.object({
  roundNumber: z.number(),
  roundTotal: z.number(),
  orders: z.array(BillOrderSchema)
})

export type BillRound = z.infer<typeof BillRoundSchema>

/**
 * Table Session Bill Schema
 * API Reference: GET /api/v1/table-sessions/:sessionId/bill
 */
export const TableSessionBillSchema = z.object({
  sessionId: z.string(),
  sessionCode: z.string(),
  tableId: z.string(),
  restaurantId: z.string(),
  summary: BillSummarySchema,
  billByRound: z.record(z.string(), BillRoundSchema),
  billByUser: z.record(z.string(), z.object({
    userId: z.string(),
    userName: z.string().optional(),
    orders: z.array(BillOrderSchema),
    userTotal: z.number()
  })).optional()
})

export type TableSessionBill = z.infer<typeof TableSessionBillSchema>

/**
 * Split Calculation User Allocation Schema
 */
export const SplitUserAllocationSchema = z.object({
  userId: z.string(),
  userName: z.string().optional(),
  amount: z.number(),
  isPaid: z.boolean()
})

export type SplitUserAllocation = z.infer<typeof SplitUserAllocationSchema>

/**
 * Split Calculation Schema
 * API Reference: GET /api/v1/table-sessions/:id/split-calculation
 */
export const SplitCalculationSchema = z.object({
  calculationId: z.string(),
  method: z.enum(['equal', 'custom', 'by_item']),
  userAllocations: z.array(SplitUserAllocationSchema),
  totalAmount: z.number(),
  paidAmount: z.number(),
  remainingAmount: z.number(),
  isComplete: z.boolean()
})

export type SplitCalculation = z.infer<typeof SplitCalculationSchema>

/**
 * Split Calculation Response Schema (Actual Backend Structure)
 * Used for create/update split calculation endpoints
 */
export const SplitCalculationResponseSchema = z.object({
  splitType: z.enum(['EQUAL', 'BY_PERCENTAGE', 'BY_AMOUNT', 'BY_ITEM']),
  participants: z.array(z.string()),
  splitAmounts: z.record(z.string(), z.number()),
  percentages: z.record(z.string(), z.number()).optional(),
  amounts: z.record(z.string(), z.number()).optional(),
  itemAssignments: z.record(z.string(), z.string()).optional(),
  totalAmount: z.number(),
  valid: z.boolean().optional(),
  updatedBy: z.string().optional(),
  lastUpdatedBy: z.string().optional(),
  updatedAt: z.string().optional(),
  isLocked: z.boolean().optional(),
  lockedBy: z.string().optional(),
  lockedAt: z.string().optional(),
  lockReason: z.string().optional()
})

export type SplitCalculationResponse = z.infer<typeof SplitCalculationResponseSchema>

/**
 * Order Status Schema
 */
export const OrderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED'
])

export type OrderStatus = z.infer<typeof OrderStatusSchema>

/**
 * Order Item Schema
 */
export const OrderItemSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  quantity: z.number(),
  price: z.coerce.number(),
  subtotal: z.coerce.number(),
  menuItem: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().optional()
  }),
  options: z.array(z.object({
    optionId: z.string(),
    valueId: z.string(),
    optionName: z.string(),
    valueName: z.string(),
    price: z.number()
  })).optional(),
  specialInstructions: z.string().optional()
})

export type OrderItem = z.infer<typeof OrderItemSchema>

/**
 * Order Schema
 * API Reference: POST /api/v1/orders
 */
export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: OrderStatusSchema,
  tableSessionId: z.string().optional(),
  restaurantId: z.string(),
  tableId: z.string(),
  items: z.array(OrderItemSchema),
  subtotal: z.coerce.number(),
  tax: z.coerce.number(),
  tip: z.coerce.number().optional(),
  total: z.coerce.number(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  specialInstructions: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type Order = z.infer<typeof OrderSchema>

/**
 * Menu Item Option Schema
 */
export const MenuItemOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  isRequired: z.boolean(),
  allowMultiple: z.boolean(),
  values: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    isDefault: z.boolean().optional()
  }))
})

export type MenuItemOption = z.infer<typeof MenuItemOptionSchema>

/**
 * Menu Item Schema
 */
export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  basePrice: z.number(),
  imageUrl: z.string().optional(),
  categoryId: z.string(),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'OUT_OF_STOCK']),
  options: z.array(MenuItemOptionSchema).optional(),
  dietaryInfo: z.object({
    isVegetarian: z.boolean().optional(),
    isVegan: z.boolean().optional(),
    isGlutenFree: z.boolean().optional(),
    isHalal: z.boolean().optional()
  }).optional(),
  allergyInfo: z.object({
    containsNuts: z.boolean().optional(),
    containsDairy: z.boolean().optional(),
    containsEggs: z.boolean().optional(),
    containsGluten: z.boolean().optional(),
    containsSeafood: z.boolean().optional(),
    other: z.array(z.string()).optional()
  }).optional(),
  spiceLevel: z.number().optional(),
  preparationTime: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type MenuItem = z.infer<typeof MenuItemSchema>

/**
 * Table Session User Schema
 */
export const TableSessionUserSchema = z.object({
  id: z.string(),
  guestSessionId: z.string(),
  userName: z.string().optional(),
  isHost: z.boolean(),
  createdAt: z.string(),
  lastActivity: z.string()
})

export type TableSessionUser = z.infer<typeof TableSessionUserSchema>

/**
 * Table Session Users Response Schema
 * API Reference: GET /api/v1/table-sessions/:id/users
 */
export const TableSessionUsersSchema = z.object({
  tableSessionId: z.string(),
  users: z.array(TableSessionUserSchema)
})

export type TableSessionUsers = z.infer<typeof TableSessionUsersSchema>

/**
 * Payment Method Schema
 */
export const PaymentMethodSchema = z.enum([
  'CARD',
  'CASH',
  'DIGITAL_WALLET',
  'OTHER'
])

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

/**
 * Payment Status Schema
 */
export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED'
])

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>

/**
 * Payment Schema
 */
export const PaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  tableSessionId: z.string().optional(),
  orderId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type Payment = z.infer<typeof PaymentSchema>

/**
 * QR Code Table Info Schema
 */
export const QRCodeTableInfoSchema = z.object({
  tableId: z.string(),
  tableNumber: z.string(),
  restaurantId: z.string(),
  restaurantName: z.string(),
  qrCode: z.string()
})

export type QRCodeTableInfo = z.infer<typeof QRCodeTableInfoSchema>

/**
 * Validation Helper Functions
 */

import { logger } from './logger'
import { AppError, ErrorCategory, ErrorSeverity } from './errorHandler'

/**
 * Validate and parse API response
 * Throws AppError with proper categorization on validation failure
 */
export function validateApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = {
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        })),
        receivedData: data
      }

      logger.error(
        'APIValidation',
        `API validation failed${context ? ` for ${context}` : ''}`,
        errorDetails
      )

      throw new AppError(
        `Invalid API response${context ? ` for ${context}` : ''}: ${error.errors[0]?.message || 'Unknown validation error'}`,
        'API_VALIDATION_ERROR',
        ErrorCategory.VALIDATION,
        ErrorSeverity.ERROR,
        errorDetails,
        false,
        'Received unexpected data from server. Please try again.'
      )
    }
    throw error
  }
}

/**
 * Safe validation that returns null on error
 * Logs error but doesn't throw
 */
export function safeValidateApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: string
): T | null {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errorDetails = {
      errors: result.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code
      })),
      receivedData: data
    }

    logger.warn(
      'APIValidation',
      `API safe validation failed${context ? ` for ${context}` : ''}`,
      errorDetails
    )

    return null
  }

  return result.data
}

/**
 * Validate API response with automatic error handling
 * Integrates with centralized error handler
 */
export function validateApiResponseWithErrorHandling<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: string,
  onError?: (error: AppError) => void
): T | null {
  try {
    return validateApiResponse(schema, data, context)
  } catch (error) {
    if (onError && error instanceof AppError) {
      onError(error)
    }
    return null
  }
}

/**
 * Create a validated API response wrapper with enhanced methods
 */
export function createApiResponse<T>(dataSchema: z.ZodType<T>) {
  const responseSchema = ApiResponseSchema(dataSchema)

  return {
    /**
     * Validate and throw on error
     */
    validate: (data: unknown, context?: string) =>
      validateApiResponse(responseSchema, data, context),

    /**
     * Safe validate - returns null on error
     */
    safeValidate: (data: unknown, context?: string) =>
      safeValidateApiResponse(responseSchema, data, context),

    /**
     * Validate with custom error handler
     */
    validateWithErrorHandling: (
      data: unknown,
      context?: string,
      onError?: (error: AppError) => void
    ) => validateApiResponseWithErrorHandling(responseSchema, data, context, onError),

    /**
     * The underlying Zod schema
     */
    schema: responseSchema
  }
}

/**
 * Validate array of items
 */
export function validateArrayResponse<T>(
  itemSchema: z.ZodType<T>,
  data: unknown,
  context?: string
): T[] {
  const arraySchema = z.array(itemSchema)
  return validateApiResponse(arraySchema, data, context)
}

/**
 * Type guard helper for runtime type checking
 */
export function isValidApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown
): data is T {
  return schema.safeParse(data).success
}
