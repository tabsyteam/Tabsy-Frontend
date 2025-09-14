"use client";
import { z } from 'zod';
import { useValidation } from '../hooks/useValidation';

/**
 * API validation utilities for request/response validation
 */

// Generic API response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0).optional(),
  totalPages: z.number().int().min(0).optional(),
});

// API request validation
export function validateApiRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  endpoint?: string
): { isValid: boolean; data?: T; errors?: string[] } {
  try {
    const validatedData = schema.parse(data);
    return {
      isValid: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(issue => issue.message);
      console.error(`API request validation failed${endpoint ? ` for ${endpoint}` : ''}:`, errors);
      return {
        isValid: false,
        errors,
      };
    }
    
    const errorMessage = 'Request validation failed';
    console.error(`API request validation failed${endpoint ? ` for ${endpoint}` : ''}:`, errorMessage);
    return {
      isValid: false,
      errors: [errorMessage],
    };
  }
}

// API response validation
export function validateApiResponse<T>(
  schema: z.ZodSchema<T>,
  response: unknown,
  endpoint?: string
): { isValid: boolean; data?: T; errors?: string[] } {
  try {
    const validatedData = schema.parse(response);
    return {
      isValid: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      console.error(`API response validation failed${endpoint ? ` for ${endpoint}` : ''}:`, errors);
      return {
        isValid: false,
        errors,
      };
    }
    
    const errorMessage = 'Response validation failed';
    console.error(`API response validation failed${endpoint ? ` for ${endpoint}` : ''}:`, errorMessage);
    return {
      isValid: false,
      errors: [errorMessage],
    };
  }
}

// Middleware for API validation
export function createApiValidator<TRequest, TResponse>(
  requestSchema?: z.ZodSchema<TRequest>,
  responseSchema?: z.ZodSchema<TResponse>
) {
  return {
    validateRequest: (data: unknown, endpoint?: string) => {
      if (!requestSchema) return { isValid: true, data: data as TRequest };
      return validateApiRequest(requestSchema, data, endpoint);
    },
    
    validateResponse: (data: unknown, endpoint?: string) => {
      if (!responseSchema) return { isValid: true, data: data as TResponse };
      return validateApiResponse(responseSchema, data, endpoint);
    },
  };
}

// Common API schemas
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    field: z.string().optional(),
  }),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

// Success response schema factory
export function createSuccessResponseSchema<T>(dataSchema: z.ZodSchema<T>) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string().datetime().optional(),
    requestId: z.string().optional(),
  });
}

// Paginated response schema factory
export function createPaginatedResponseSchema<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      pagination: paginationSchema,
    }),
    timestamp: z.string().datetime().optional(),
    requestId: z.string().optional(),
  });
}

// File upload validation
export const fileUploadSchema = z.object({
  file: z.any(),
  maxSize: z.number().optional().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z.array(z.string()).optional().default(['image/jpeg', 'image/png', 'image/gif']),
});

// Environment validation
export const envValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
});

// Rate limiting validation
export const rateLimitSchema = z.object({
  windowMs: z.number().int().min(1000), // Minimum 1 second
  maxRequests: z.number().int().min(1),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
});

// Webhook validation
export const webhookSchema = z.object({
  event: z.string().min(1),
  timestamp: z.string().datetime(),
  data: z.any(),
  signature: z.string().min(1),
});

// API versioning
export const apiVersionSchema = z.object({
  version: z.string().regex(/^v\d+$/, 'Version must be in format v1, v2, etc.'),
  deprecated: z.boolean().default(false),
  sunset: z.string().datetime().optional(),
});

// Health check response
export const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  services: z.record(z.string(), z.object({
    status: z.enum(['up', 'down', 'degraded']),
    latency: z.number().optional(),
    error: z.string().optional(),
  })).optional(),
});

// Type exports for TypeScript
export type ApiResponse<T = any> = z.infer<typeof apiResponseSchema> & { data?: T };
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse<T> = z.infer<ReturnType<typeof createSuccessResponseSchema<z.ZodSchema<T>>>>;
export type PaginatedResponse<T> = z.infer<ReturnType<typeof createPaginatedResponseSchema<z.ZodSchema<T>>>>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;