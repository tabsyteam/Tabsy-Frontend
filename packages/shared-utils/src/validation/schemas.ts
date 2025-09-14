import { z } from 'zod';

// Base validation schemas for Tabsy platform

// Common field validations
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  );

export const phoneSchema = z
  .string()
  .regex(
    /^\+?[\d\s\-\(\)\.]{10,}$/,
    'Please enter a valid phone number'
  )
  .transform((val) => val.replace(/[\s\-\(\)\.]/g, ''));

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters')
  .regex(/^[a-zA-Z\s\-\'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods');

export const priceSchema = z
  .number()
  .positive('Price must be positive')
  .multipleOf(0.01, 'Price must have at most 2 decimal places');

export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be non-negative')
  .max(100, 'Percentage cannot exceed 100');

// Address validation
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(100),
  city: z.string().min(1, 'City is required').max(50),
  state: z.string().min(2, 'State is required').max(50),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters').max(10),
  country: z.string().min(2, 'Country is required').max(50),
});

// Dietary restrictions and allergens
export const dietaryRestrictionSchema = z.enum([
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'shellfish-free',
  'egg-free',
  'soy-free',
  'halal',
  'kosher',
  'keto',
  'paleo',
  'low-carb',
  'low-sodium'
]);

// Currency codes
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']);

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

// Slug validation (for URLs)
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .min(1, 'Slug is required')
  .max(50, 'Slug cannot exceed 50 characters');

// Color validation (hex colors)
export const colorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code');

// Time validation (HH:MM format)
export const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format');

// Date validation helpers
export const dateInFutureSchema = z
  .date()
  .refine((date) => date > new Date(), 'Date must be in the future');

export const dateInPastSchema = z
  .date()
  .refine((date) => date < new Date(), 'Date must be in the past');

// File validation
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, 'Image must be less than 5MB')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Only JPEG, PNG, and WebP images are allowed'
  );

// Rating validation (1-5 stars)
export const ratingSchema = z
  .number()
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1 star')
  .max(5, 'Rating cannot exceed 5 stars');

// Quantity validation
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .positive('Quantity must be positive')
  .max(99, 'Quantity cannot exceed 99');

// Table number validation
export const tableNumberSchema = z
  .string()
  .min(1, 'Table number is required')
  .max(10, 'Table number cannot exceed 10 characters')
  .regex(/^[A-Za-z0-9\-]+$/, 'Table number can only contain letters, numbers, and hyphens');

// Restaurant capacity validation
export const capacitySchema = z
  .number()
  .int('Capacity must be a whole number')
  .positive('Capacity must be positive')
  .max(20, 'Table capacity cannot exceed 20 people');

// Tip percentage presets
export const tipPresetSchema = z.enum(['15', '18', '20', '25']);

// Order status validation
export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'SERVED',
  'PAID',
  'CANCELLED',
  'REFUNDED'
]);

// Payment method validation
export const paymentMethodSchema = z.enum([
  'CARD',
  'CASH',
  'DIGITAL_WALLET',
  'BANK_TRANSFER'
]);

// Language code validation (ISO 639-1)
export const languageCodeSchema = z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar']);

export default {
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  name: nameSchema,
  price: priceSchema,
  percentage: percentageSchema,
  address: addressSchema,
  dietaryRestriction: dietaryRestrictionSchema,
  currency: currencySchema,
  uuid: uuidSchema,
  slug: slugSchema,
  color: colorSchema,
  time: timeSchema,
  dateInFuture: dateInFutureSchema,
  dateInPast: dateInPastSchema,
  imageFile: imageFileSchema,
  rating: ratingSchema,
  quantity: quantitySchema,
  tableNumber: tableNumberSchema,
  capacity: capacitySchema,
  tipPreset: tipPresetSchema,
  orderStatus: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  languageCode: languageCodeSchema
};
