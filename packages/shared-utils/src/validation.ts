import { z } from 'zod'

/**
 * Validation utilities using Zod
 */
export const validationUtils = {
  /**
   * Email validation schema
   */
  email: z.string().email('Invalid email format'),

  /**
   * Password validation schema
   */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),

  /**
   * Phone number validation schema
   */
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Invalid phone number format'),

  /**
   * QR code validation schema
   */
  qrCode: z.string().min(1, 'QR code is required'),

  /**
   * Price validation schema
   */
  price: z.number().positive('Price must be positive').max(9999.99, 'Price too high'),

  /**
   * Quantity validation schema
   */
  quantity: z.number().int('Quantity must be a whole number').positive('Quantity must be positive'),

  /**
   * Table number validation schema
   */
  tableNumber: z.string().min(1, 'Table number is required'),

  /**
   * Restaurant name validation schema
   */
  restaurantName: z.string().min(2, 'Restaurant name must be at least 2 characters'),

  /**
   * Menu item name validation schema
   */
  menuItemName: z.string().min(1, 'Menu item name is required'),

  /**
   * Order special instructions validation schema
   */
  specialInstructions: z.string().max(500, 'Special instructions too long'),

  /**
   * Tip percentage validation schema
   */
  tipPercentage: z.number().min(0, 'Tip cannot be negative').max(50, 'Tip percentage too high'),

  /**
   * Rating validation schema (1-5 stars)
   */
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),

  /**
   * UUID validation schema
   */
  uuid: z.string().uuid('Invalid UUID format'),

  /**
   * Date string validation schema
   */
  dateString: z.string().datetime('Invalid date format'),

  /**
   * URL validation schema
   */
  url: z.string().url('Invalid URL format'),

  /**
   * Safe string validation (no HTML/script tags)
   */
  safeString: z
    .string()
    .refine(
      (val) => !/<script|<iframe|javascript:|on\w+=/i.test(val),
      'String contains potentially unsafe content'
    ),

  /**
   * Create validation schema for arrays with min/max items
   */
  arrayWithLimits: <T>(itemSchema: z.ZodSchema<T>, min: number = 1, max: number = 100) =>
    z.array(itemSchema).min(min, `At least ${min} item(s) required`).max(max, `Too many items (max ${max})`),

  /**
   * Create optional schema with default value
   */
  optionalWithDefault: <T>(schema: z.ZodSchema<T>, defaultValue: T) =>
    schema.optional().default(defaultValue as z.util.noUndefined<T>),

  /**
   * Validate and sanitize input
   */
  validateAndSanitize: <T>(schema: z.ZodSchema<T>, input: unknown): { data?: T; errors?: string[] } => {
    const result = schema.safeParse(input)
    if (result.success) {
      return { data: result.data }
    } else {
      return { errors: result.error.errors.map(err => err.message) }
    }
  },

  /**
   * Create schema for object with dynamic keys
   */
  dynamicObject: <T>(valueSchema: z.ZodSchema<T>) => z.record(z.string(), valueSchema),
}

// Common validation schemas for forms
export const formSchemas = {
  login: z.object({
    email: validationUtils.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),

  register: z.object({
    email: validationUtils.email,
    password: validationUtils.password,
    confirmPassword: z.string(),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: validationUtils.phone.optional(),
    termsAccepted: z.boolean().refine(val => val === true, 'Terms must be accepted'),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  createOrder: z.object({
    restaurantId: validationUtils.uuid,
    tableId: validationUtils.uuid.optional(),
    items: z.array(z.object({
      menuItemId: validationUtils.uuid,
      quantity: validationUtils.quantity,
      specialInstructions: validationUtils.specialInstructions.optional(),
    })).min(1, 'At least one item is required'),
    specialInstructions: validationUtils.specialInstructions.optional(),
  }),

  createRestaurant: z.object({
    name: validationUtils.restaurantName,
    description: z.string().min(10, 'Description must be at least 10 characters'),
    type: z.enum(['FAST_FOOD', 'CASUAL_DINING', 'FINE_DINING', 'CAFE', 'BAR', 'FOOD_TRUCK']),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().min(5, 'ZIP code is required'),
      country: z.string().min(1, 'Country is required'),
    }),
    contact: z.object({
      phone: validationUtils.phone,
      email: validationUtils.email,
      website: validationUtils.url.optional(),
    }),
  }),

  feedback: z.object({
    orderId: validationUtils.uuid,
    overallRating: validationUtils.rating,
    foodRating: validationUtils.rating,
    serviceRating: validationUtils.rating,
    review: z.string().max(1000, 'Review too long').optional(),
    wouldRecommend: z.boolean(),
  }),
}

export default validationUtils
