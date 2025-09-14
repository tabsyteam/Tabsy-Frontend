"use client";
import { z } from 'zod';
import { useValidation } from '../hooks/useValidation';

/**
 * API validation utilities for type-safe API responses
 */
export class ApiValidator {
  /**
   * Validate API response data with Zod schema
   */
  static validateResponse<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    endpoint?: string
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      const errorMessage = error instanceof z.ZodError 
        ? `API validation failed${endpoint ? ` for ${endpoint}` : ''}: ${error.issues[0]?.message}`
        : `API validation failed${endpoint ? ` for ${endpoint}` : ''}`;
      
      console.error(errorMessage, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Validate API request data before sending
   */
  static validateRequest<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; errors: string[] } {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(issue => issue.message);
        return { success: false, errors };
      }
      return { success: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Create a validated API wrapper function
   */
  static createValidatedApiCall<TRequest, TResponse>(
    apiCall: (data: TRequest) => Promise<TResponse>,
    requestSchema: z.ZodSchema<TRequest>,
    responseSchema: z.ZodSchema<TResponse>,
    endpoint?: string
  ) {
    return async (data: unknown): Promise<TResponse> => {
      // Validate request
      const requestValidation = this.validateRequest(data, requestSchema);
      if (!requestValidation.success) {
        throw new Error(`Request validation failed: ${requestValidation.errors.join(', ')}`);
      }

      // Make API call
      const response = await apiCall(requestValidation.data);

      // Validate response
      const responseValidation = this.validateResponse(response, responseSchema, endpoint);
      if (!responseValidation.success) {
        throw new Error(responseValidation.error);
      }

      return responseValidation.data;
    };
  }
}

/**
 * Common API response schemas
 */
export const apiResponseSchemas = {
  // Standard API response wrapper
  standardResponse: <T>(dataSchema: z.ZodSchema<T>) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional(),
    }).optional(),
    timestamp: z.string().optional(),
  }),

  // Paginated response
  paginatedResponse: <T>(itemSchema: z.ZodSchema<T>) => z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),

  // List response
  listResponse: <T>(itemSchema: z.ZodSchema<T>) => z.array(itemSchema),

  // Simple success response
  successResponse: z.object({
    success: z.literal(true),
    message: z.string().optional(),
  }),

  // Error response
  errorResponse: z.object({
    success: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional(),
    }),
  }),
};

/**
 * Hook for API validation with error handling
 */
export function useApiValidation() {
  const { validate, validateAsync } = useValidation();

  const validateApiResponse = <T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    endpoint?: string
  ) => {
    const result = validate(schema, data);
    
    if (!result.success) {
      console.error(`API response validation failed${endpoint ? ` for ${endpoint}` : ''}:`, result.errors);
    }
    
    return result;
  };

  const validateApiRequest = <T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ) => {
    return validate(schema, data);
  };

  const createValidatedQuery = <TResponse>(
    queryFn: () => Promise<unknown>,
    responseSchema: z.ZodSchema<TResponse>,
    endpoint?: string
  ) => {
    return async (): Promise<TResponse> => {
      const response = await queryFn();
      const validation = validateApiResponse(response, responseSchema, endpoint);
      
      if (!validation.success) {
        throw new Error(`API validation failed: ${validation.errors?.join(', ')}`);
      }
      
      return validation.data!;
    };
  };

  const createValidatedMutation = <TRequest, TResponse>(
    mutationFn: (data: TRequest) => Promise<unknown>,
    requestSchema: z.ZodSchema<TRequest>,
    responseSchema: z.ZodSchema<TResponse>,
    endpoint?: string
  ) => {
    return async (data: unknown): Promise<TResponse> => {
      // Validate request
      const requestValidation = validateApiRequest(data, requestSchema);
      if (!requestValidation.success) {
        throw new Error(`Request validation failed: ${requestValidation.errors?.join(', ')}`);
      }

      // Execute mutation
      const response = await mutationFn(requestValidation.data!);

      // Validate response
      const responseValidation = validateApiResponse(response, responseSchema, endpoint);
      if (!responseValidation.success) {
        throw new Error(`Response validation failed: ${responseValidation.errors?.join(', ')}`);
      }

      return responseValidation.data!;
    };
  };

  return {
    validateApiResponse,
    validateApiRequest,
    createValidatedQuery,
    createValidatedMutation,
  };
}

/**
 * Common API request/response schemas for Tabsy
 */
export const tabsyApiSchemas = {
  // User schemas
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(['ADMIN', 'RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'CUSTOMER']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),

  // Restaurant schemas
  restaurant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string(),
    }),
    contact: z.object({
      phone: z.string(),
      email: z.string().email(),
      website: z.string().url().optional(),
    }),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),

  // Menu item schemas
  menuItem: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    basePrice: z.number().positive(),
    categoryId: z.string().uuid(),
    isAvailable: z.boolean(),
    preparationTime: z.number().optional(),
    allergens: z.array(z.string()),
    dietaryTypes: z.array(z.string()),
    imageUrl: z.string().url().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),

  // Order schemas
  order: z.object({
    id: z.string().uuid(),
    restaurantId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    tableId: z.string().uuid().optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED']),
    items: z.array(z.object({
      id: z.string().uuid(),
      menuItemId: z.string().uuid(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      totalPrice: z.number().positive(),
      specialInstructions: z.string().optional(),
    })),
    subtotal: z.number().nonnegative(),
    tax: z.number().nonnegative(),
    tip: z.number().nonnegative().optional(),
    total: z.number().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),

  // Payment schemas
  payment: z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    amount: z.number().positive(),
    method: z.enum(['CARD', 'CASH', 'DIGITAL_WALLET']),
    status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
    transactionId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
};