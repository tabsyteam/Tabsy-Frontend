"use client";
import { z } from 'zod';
import { UserRole } from '@tabsy/shared-types';

// Common validation patterns
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');

const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  role: z.nativeEnum(UserRole).refine((val) => Object.values(UserRole).includes(val), {
    message: 'Please select a valid role',
  }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
  token: z.string().min(1, 'Reset token is required'),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Restaurant schemas
export const restaurantSchema = z.object({
  name: z
    .string()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100, 'Restaurant name must be less than 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
  email: emailSchema,
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  cuisine: z
    .string()
    .min(2, 'Cuisine type must be at least 2 characters')
    .max(50, 'Cuisine type must be less than 50 characters'),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).refine((val) => ['$', '$$', '$$$', '$$$$'].includes(val), {
    message: 'Please select a price range',
  }),
});

// Menu item schemas
export const menuItemSchema = z.object({
  name: z
    .string()
    .min(2, 'Item name must be at least 2 characters')
    .max(100, 'Item name must be less than 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(300, 'Description must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(9999.99, 'Price cannot exceed $9,999.99'),
  category: z
    .string()
    .min(2, 'Category must be at least 2 characters')
    .max(50, 'Category must be less than 50 characters'),
  isAvailable: z.boolean().default(true),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  allergens: z
    .array(z.string())
    .optional()
    .default([]),
  preparationTime: z
    .number()
    .min(1, 'Preparation time must be at least 1 minute')
    .max(120, 'Preparation time cannot exceed 120 minutes')
    .optional(),
});

// Order schemas
export const orderItemSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(20, 'Quantity cannot exceed 20'),
  specialInstructions: z
    .string()
    .max(200, 'Special instructions must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  selectedOptions: z
    .array(z.object({
      optionId: z.string(),
      choiceId: z.string(),
    }))
    .optional()
    .default([]),
});

export const orderSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant is required'),
  tableId: z.string().min(1, 'Table is required'),
  items: z
    .array(orderItemSchema)
    .min(1, 'Order must contain at least one item'),
  customerNotes: z
    .string()
    .max(300, 'Customer notes must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  guestInfo: z.object({
    name: nameSchema.optional(),
    phone: phoneSchema,
    email: emailSchema.optional(),
  }).optional(),
});

// Payment schemas
export const paymentCardSchema = z.object({
  cardNumber: z
    .string()
    .regex(/^\d{13,19}$/, 'Please enter a valid card number'),
  expiryMonth: z
    .string()
    .regex(/^(0[1-9]|1[0-2])$/, 'Please enter a valid month (01-12)'),
  expiryYear: z
    .string()
    .regex(/^\d{2}$/, 'Please enter a valid year'),
  cvv: z
    .string()
    .regex(/^\d{3,4}$/, 'Please enter a valid CVV'),
  cardholderName: z
    .string()
    .min(2, 'Cardholder name must be at least 2 characters')
    .max(50, 'Cardholder name must be less than 50 characters'),
});

export const billingAddressSchema = z.object({
  street: z
    .string()
    .min(5, 'Street address must be at least 5 characters')
    .max(100, 'Street address must be less than 100 characters'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City must be less than 50 characters'),
  state: z
    .string()
    .min(2, 'State must be at least 2 characters')
    .max(50, 'State must be less than 50 characters'),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must be less than 50 characters'),
});

export const paymentSchema = z.object({
  amount: z
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(9999.99, 'Amount cannot exceed $9,999.99'),
  tip: z
    .number()
    .min(0, 'Tip cannot be negative')
    .max(999.99, 'Tip cannot exceed $999.99')
    .optional()
    .default(0),
  paymentMethod: z.enum(['card', 'cash', 'digital_wallet']).refine((val) => ['card', 'cash', 'digital_wallet'].includes(val), {
    message: 'Please select a payment method',
  }),
  card: paymentCardSchema.optional(),
  billingAddress: billingAddressSchema.optional(),
});

// Contact and feedback schemas
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
  phone: phoneSchema,
});

export const feedbackSchema = z.object({
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(500, 'Comment must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  wouldRecommend: z.boolean().optional(),
  categories: z.object({
    food: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional(),
    service: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional(),
    ambiance: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional(),
    value: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional(),
  }).optional(),
});

// Table management schemas
export const tableSchema = z.object({
  number: z
    .string()
    .min(1, 'Table number is required')
    .max(10, 'Table number must be less than 10 characters'),
  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(20, 'Capacity cannot exceed 20'),
  location: z
    .string()
    .min(2, 'Location must be at least 2 characters')
    .max(50, 'Location must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
});

// User profile schemas
export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  preferences: z.object({
    dietary: z
      .array(z.string())
      .optional()
      .default([]),
    allergies: z
      .array(z.string())
      .optional()
      .default([]),
    notifications: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      push: z.boolean().default(true),
    }).optional(),
  }).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Export all schema types for TypeScript inference
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type RestaurantFormData = z.infer<typeof restaurantSchema>;
export type MenuItemFormData = z.infer<typeof menuItemSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
export type TableFormData = z.infer<typeof tableSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;