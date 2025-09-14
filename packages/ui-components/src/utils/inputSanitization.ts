"use client";
import { z } from 'zod';

/**
 * Input sanitization utilities for security and data consistency
 */
export class InputSanitizer {
  /**
   * Remove HTML tags and script content from string
   */
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  /**
   * Sanitize and normalize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return '';
    
    return email
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '');
  }

  /**
   * Sanitize phone numbers to digits and common separators
   */
  static sanitizePhone(phone: string): string {
    if (typeof phone !== 'string') return '';
    
    return phone.replace(/[^\d\+\-\(\)\s\.]/g, '').trim();
  }

  /**
   * Sanitize text input by removing dangerous characters
   */
  static sanitizeText(input: string, options: {
    maxLength?: number;
    allowNewlines?: boolean;
    allowSpecialChars?: boolean;
  } = {}): string {
    if (typeof input !== 'string') return '';
    
    const { maxLength = 1000, allowNewlines = true, allowSpecialChars = true } = options;
    
    let sanitized = input.trim();
    
    // Remove null bytes and control characters except newlines
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Remove or replace newlines if not allowed
    if (!allowNewlines) {
      sanitized = sanitized.replace(/[\r\n]/g, ' ');
    }
    
    // Remove dangerous special characters if not allowed
    if (!allowSpecialChars) {
      sanitized = sanitized.replace(/[<>'"&]/g, '');
    }
    
    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any, options: {
    min?: number;
    max?: number;
    decimals?: number;
  } = {}): number | null {
    const { min, max, decimals } = options;
    
    const num = parseFloat(String(input));
    
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }
    
    let result = num;
    
    // Apply decimal precision
    if (typeof decimals === 'number') {
      result = Math.round(result * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
    
    // Apply bounds
    if (typeof min === 'number') {
      result = Math.max(result, min);
    }
    if (typeof max === 'number') {
      result = Math.min(result, max);
    }
    
    return result;
  }

  /**
   * Sanitize URL input
   */
  static sanitizeURL(url: string): string | null {
    if (typeof url !== 'string') return null;
    
    const trimmed = url.trim();
    
    if (!trimmed) return null;
    
    try {
      // Add protocol if missing
      let fullUrl = trimmed;
      if (!/^https?:\/\//i.test(fullUrl)) {
        fullUrl = `https://${fullUrl}`;
      }
      
      const urlObj = new URL(fullUrl);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }
      
      return urlObj.toString();
    } catch {
      return null;
    }
  }

  /**
   * Sanitize file names
   */
  static sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') return '';
    
    return fileName
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 255);
  }

  /**
   * Deep sanitize an object using Zod schema
   */
  static sanitizeObject<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    sanitizers: Partial<Record<keyof T, (value: any) => any>> = {}
  ): T | null {
    try {
      // First, apply custom sanitizers
      if (typeof data === 'object' && data !== null) {
        const sanitized = { ...data as any };
        
        for (const [key, sanitizer] of Object.entries(sanitizers)) {
          if (key in sanitized && typeof sanitizer === 'function') {
            sanitized[key] = sanitizer(sanitized[key]);
          }
        }
        
        // Then validate with schema
        const result = schema.parse(sanitized);
        return result;
      }
      
      return schema.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Sanitize array of items
   */
  static sanitizeArray<T>(
    items: unknown[],
    itemSchema: z.ZodSchema<T>,
    maxLength: number = 1000
  ): T[] {
    if (!Array.isArray(items)) return [];
    
    const sanitized: T[] = [];
    
    for (let i = 0; i < Math.min(items.length, maxLength); i++) {
      try {
        const item = itemSchema.parse(items[i]);
        sanitized.push(item);
      } catch {
        // Skip invalid items
        continue;
      }
    }
    
    return sanitized;
  }
}

/**
 * Common sanitization schemas for form inputs
 */
export const sanitizationSchemas = {
  safeText: z.string().transform(val => InputSanitizer.sanitizeText(val)),
  
  safeHTML: z.string().transform(val => InputSanitizer.sanitizeHTML(val)),
  
  email: z.string().transform(val => InputSanitizer.sanitizeEmail(val)),
  
  phone: z.string().transform(val => InputSanitizer.sanitizePhone(val)),
  
  url: z.string().transform(val => InputSanitizer.sanitizeURL(val) || ''),
  
  fileName: z.string().transform(val => InputSanitizer.sanitizeFileName(val)),
  
  positiveNumber: z.number().transform(val => 
    InputSanitizer.sanitizeNumber(val, { min: 0 }) || 0
  ),
  
  price: z.number().transform(val => 
    InputSanitizer.sanitizeNumber(val, { min: 0, decimals: 2 }) || 0
  ),
  
  percentage: z.number().transform(val => 
    InputSanitizer.sanitizeNumber(val, { min: 0, max: 100, decimals: 2 }) || 0
  ),
};

/**
 * Validation with automatic sanitization
 */
export function createSanitizedSchema<T extends Record<string, any>>(
  baseSchema: z.ZodObject<any>,
  sanitizers: Partial<Record<keyof T, z.ZodTypeAny>> = {}
): z.ZodObject<any> {
  const shape = baseSchema.shape;
  const sanitizedShape: any = {};
  
  for (const [key, schema] of Object.entries(shape)) {
    if (sanitizers[key as keyof T]) {
      sanitizedShape[key] = sanitizers[key as keyof T];
    } else {
      sanitizedShape[key] = schema;
    }
  }
  
  return z.object(sanitizedShape);
}