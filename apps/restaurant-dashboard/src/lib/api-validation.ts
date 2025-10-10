import { z } from 'zod'
import { logger } from './logger'
import type { Order, Payment, Restaurant, TableSession, MenuItem } from '@tabsy/shared-types'

/**
 * Runtime validation schemas for API responses
 * These schemas ensure API responses match expected types
 */

// Base API response schema
export const ApiResponseSchema = z.object({
    success: z.boolean(),
    data: z.unknown().optional(),
    error: z.object({
        message: z.string(),
        code: z.string().optional(),
        details: z.any().optional()
    }).optional(),
    message: z.string().optional()
})

// Order response schemas
export const OrderSchema = z.object({
    id: z.string(),
    restaurantId: z.string(),
    tableSessionId: z.string().optional(),
    customerId: z.string().optional(),
    orderNumber: z.string(),
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED']),
    items: z.array(z.object({
        id: z.string(),
        menuItemId: z.string(),
        quantity: z.number(),
        price: z.union([z.number(), z.string()]),
        specialInstructions: z.string().optional(),
        customizations: z.any().optional(),
        options: z.any().optional(),
        name: z.string().optional(),
        menuItem: z.any().optional()
    })),
    subtotal: z.union([z.number(), z.string()]),
    tax: z.union([z.number(), z.string()]).optional(),
    total: z.union([z.number(), z.string()]),
    createdAt: z.string(),
    updatedAt: z.string(),
    tableNumber: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    tableId: z.string().optional(),
    sessionId: z.string().optional(),
    guestSessionId: z.string().optional(),
    type: z.string().optional(),
    isLocked: z.boolean().optional(),
    roundNumber: z.number().optional(),
    taxAmount: z.number().optional(),
    tipAmount: z.number().optional(),
    tip: z.union([z.number(), z.string()]).optional(),
    discountAmount: z.number().optional(),
    totalAmount: z.number().optional(),
    currency: z.string().optional(),
    estimatedPreparationTime: z.number().optional(),
    actualPreparationTime: z.number().optional()
})

export const OrdersResponseSchema = ApiResponseSchema.extend({
    data: z.object({
        orders: z.array(OrderSchema),
        totalCount: z.number().optional()
    }).optional()
})

export type OrdersResponse = z.infer<typeof OrdersResponseSchema>

export const SingleOrderResponseSchema = ApiResponseSchema.extend({
    data: OrderSchema.optional()
})

// Payment response schemas
export const PaymentSchema = z.object({
    id: z.string(),
    orderId: z.string().nullable(),
    amount: z.number(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']),
    paymentMethod: z.enum(['CARD', 'CASH', 'WALLET', 'OTHER']).nullable(),
    paymentIntentId: z.string().nullable(),
    restaurantId: z.string(),
    customerId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    refundedAmount: z.number().optional(),
    metadata: z.any().optional()
})

export const PaymentsResponseSchema = ApiResponseSchema.extend({
    data: z.array(PaymentSchema).optional()
})

export const SinglePaymentResponseSchema = ApiResponseSchema.extend({
    data: PaymentSchema.optional()
})

// Restaurant response schema
export const RestaurantSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    currency: z.string().default('USD'),
    timezone: z.string().default('UTC'),
    openingHours: z.any().nullable(),
    settings: z.any().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
})

export const RestaurantResponseSchema = ApiResponseSchema.extend({
    data: RestaurantSchema.optional()
})

// Table session response schema
export const TableSessionSchema = z.object({
    id: z.string(),
    restaurantId: z.string(),
    tableId: z.string(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']),
    guests: z.array(z.any()).optional(),
    startTime: z.string(),
    endTime: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
})

export const TableSessionsResponseSchema = ApiResponseSchema.extend({
    data: z.array(TableSessionSchema).optional()
})

// Menu item response schema
export const MenuItemSchema = z.object({
    id: z.string(),
    restaurantId: z.string(),
    categoryId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.number(),
    imageUrl: z.string().nullable(),
    isAvailable: z.boolean(),
    customizations: z.any().optional(),
    allergens: z.array(z.string()).optional(),
    nutritionalInfo: z.any().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
})

export const MenuItemsResponseSchema = ApiResponseSchema.extend({
    data: z.array(MenuItemSchema).optional()
})

/**
 * Validate API response against a schema
 * @param response - The API response to validate
 * @param schema - The Zod schema to validate against
 * @param context - Context for logging (e.g., 'OrdersManagement')
 * @returns Validated data or throws error
 */
export function validateApiResponse<T>(
    response: unknown,
    schema: z.ZodSchema<T>,
    context: string
): T {
    try {
        const validated = schema.parse(response)
        logger.debug(`[${context}] API response validated successfully`)
        return validated
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.error(`[${context}] Invalid API response structure`, {
                errors: error.issues,
                response
            })
            throw new Error(`Invalid API response: ${error.issues.map(e => e.message).join(', ')}`)
        }
        throw error
    }
}

/**
 * Safe parse that returns null on validation failure
 */
export function safeValidateApiResponse<T>(
    response: unknown,
    schema: z.ZodSchema<T>,
    context: string
): T | null {
    try {
        return validateApiResponse(response, schema, context)
    } catch (error) {
        logger.warn(`[${context}] Falling back to unvalidated response due to validation failure`)
        return response as T
    }
}

/**
 * Type guard for successful API response
 */
export function isSuccessfulResponse(response: unknown): response is { success: true; data: unknown } {
    return (
        typeof response === 'object' &&
        response !== null &&
        'success' in response &&
        (response as any).success === true &&
        'data' in response
    )
}

/**
 * Type guard for error API response
 */
export function isErrorResponse(response: unknown): response is { success: false; error: { message: string } } {
    return (
        typeof response === 'object' &&
        response !== null &&
        'success' in response &&
        (response as any).success === false &&
        'error' in response
    )
}