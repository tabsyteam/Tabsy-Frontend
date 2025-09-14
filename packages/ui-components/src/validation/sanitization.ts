"use client";

/**
 * Sanitization utilities for user input
 */

// Basic HTML entity encoding
function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (s) => map[s]);
}

// Basic text sanitization
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[<>]/g, '') // Remove HTML brackets
    .slice(0, 1000); // Limit length
}

// HTML content sanitization
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  return escapeHtml(input)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

// Email sanitization
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, ''); // Remove non-email characters
}

// Phone number sanitization
export function sanitizePhone(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[^+\d\s\-\(\)]/g, ''); // Keep only valid phone characters
}

// Numeric input sanitization
export function sanitizeNumber(input: string | number): number | null {
  if (typeof input === 'number') return isNaN(input) ? null : input;
  if (typeof input !== 'string') return null;
  
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

// Price sanitization (ensures 2 decimal places)
export function sanitizePrice(input: string | number): number | null {
  const num = sanitizeNumber(input);
  if (num === null || num < 0) return null;
  
  return Math.round(num * 100) / 100; // Round to 2 decimal places
}

// Name sanitization
export function sanitizeName(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[^a-zA-Z\s\-']/g, '') // Keep only letters, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 50); // Limit length
}

// URL sanitization
export function sanitizeUrl(input: string): string {
  if (typeof input !== 'string') return '';
  
  try {
    const url = new URL(input.trim());
    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

// Address sanitization
export function sanitizeAddress(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 200); // Limit length
}

// Search query sanitization
export function sanitizeSearchQuery(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 100); // Limit length
}

// SQL injection prevention (basic)
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .trim();
}

// XSS prevention for user-generated content
export function sanitizeUserContent(input: string): string {
  if (typeof input !== 'string') return '';
  
  return escapeHtml(input)
    .trim()
    .slice(0, 500);
}

// File name sanitization
export function sanitizeFileName(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Remove multiple underscores
    .slice(0, 255); // Limit length
}

// Credit card number sanitization (removes spaces and special chars)
export function sanitizeCreditCard(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[^0-9]/g, '') // Keep only numbers
    .slice(0, 19); // Limit to max card length
}

// ZIP code sanitization
export function sanitizeZipCode(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[^0-9-]/g, '') // Keep only numbers and hyphens
    .slice(0, 10); // Limit length
}

// Generic sanitization based on data type
export function sanitizeInput(input: any, type: 'text' | 'email' | 'phone' | 'number' | 'price' | 'name' | 'url' | 'address'): any {
  switch (type) {
    case 'text':
      return sanitizeText(input);
    case 'email':
      return sanitizeEmail(input);
    case 'phone':
      return sanitizePhone(input);
    case 'number':
      return sanitizeNumber(input);
    case 'price':
      return sanitizePrice(input);
    case 'name':
      return sanitizeName(input);
    case 'url':
      return sanitizeUrl(input);
    case 'address':
      return sanitizeAddress(input);
    default:
      return sanitizeText(input);
  }
}

// Bulk sanitization for form data
export function sanitizeFormData<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, 'text' | 'email' | 'phone' | 'number' | 'price' | 'name' | 'url' | 'address'>
): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(data)) {
    const sanitizationType = schema[key as keyof T];
    if (sanitizationType) {
      sanitized[key as keyof T] = sanitizeInput(value, sanitizationType);
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}