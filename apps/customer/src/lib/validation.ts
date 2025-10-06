/**
 * Input Validation Utilities
 *
 * Provides comprehensive validation for user inputs across the application.
 * All validators return `true` for valid inputs and `false` for invalid inputs.
 *
 * @module validation
 */

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
}

/**
 * Email validation
 * Validates standard email format (RFC 5322 simplified)
 *
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return emailRegex.test(email.trim())
}

/**
 * Email validation with detailed result
 *
 * @param email - Email address to validate
 * @returns ValidationResult with error message if invalid
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      errorMessage: 'Email is required'
    }
  }

  if (!isValidEmail(email)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email address'
    }
  }

  return { isValid: true }
}

/**
 * Phone number validation
 * Supports multiple formats:
 * - E.164: +1234567890
 * - National: (123) 456-7890
 * - International: +1 123-456-7890
 * - Simple: 1234567890
 *
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '')

  // Phone number should have 10-15 digits (covers most international formats)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return false
  }

  // Optional: More strict E.164 validation
  // E.164 format: +[country code][subscriber number]
  // const e164Regex = /^\+?[1-9]\d{1,14}$/
  // return e164Regex.test(phone.replace(/[\s()-]/g, ''))

  return true
}

/**
 * Phone validation with detailed result
 *
 * @param phone - Phone number to validate
 * @param required - Whether phone is required (default: false)
 * @returns ValidationResult with error message if invalid
 */
export function validatePhone(phone: string, required: boolean = false): ValidationResult {
  if (!phone || !phone.trim()) {
    if (required) {
      return {
        isValid: false,
        errorMessage: 'Phone number is required'
      }
    }
    return { isValid: true } // Optional field, empty is valid
  }

  if (!isValidPhone(phone)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid phone number (10-15 digits)'
    }
  }

  return { isValid: true }
}

/**
 * Name validation
 * Validates that name contains only letters, spaces, hyphens, and apostrophes
 * Minimum 2 characters, maximum 50 characters
 *
 * @param name - Name to validate
 * @returns true if valid, false otherwise
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false
  }

  const trimmedName = name.trim()

  // Name should be 2-50 characters
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return false
  }

  // Allow letters, spaces, hyphens, apostrophes, and common international characters
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/

  return nameRegex.test(trimmedName)
}

/**
 * Name validation with detailed result
 *
 * @param name - Name to validate
 * @returns ValidationResult with error message if invalid
 */
export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      errorMessage: 'Name is required'
    }
  }

  const trimmedName = name.trim()

  if (trimmedName.length < 2) {
    return {
      isValid: false,
      errorMessage: 'Name must be at least 2 characters'
    }
  }

  if (trimmedName.length > 50) {
    return {
      isValid: false,
      errorMessage: 'Name must be less than 50 characters'
    }
  }

  if (!isValidName(trimmedName)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)'
    }
  }

  return { isValid: true }
}

/**
 * Amount validation
 * Validates positive numbers with up to 2 decimal places
 *
 * @param amount - Amount to validate
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: Infinity)
 * @returns true if valid, false otherwise
 */
export function isValidAmount(amount: number | string, min: number = 0, max: number = Infinity): boolean {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return false
  }

  if (numAmount < min || numAmount > max) {
    return false
  }

  // Check for max 2 decimal places
  const decimalPlaces = (numAmount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return false
  }

  return true
}

/**
 * Amount validation with detailed result
 *
 * @param amount - Amount to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns ValidationResult with error message if invalid
 */
export function validateAmount(amount: number | string, min: number = 0, max: number = Infinity): ValidationResult {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid amount'
    }
  }

  if (numAmount < min) {
    return {
      isValid: false,
      errorMessage: `Amount must be at least $${min.toFixed(2)}`
    }
  }

  if (numAmount > max) {
    return {
      isValid: false,
      errorMessage: `Amount cannot exceed $${max.toFixed(2)}`
    }
  }

  const decimalPlaces = (numAmount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      errorMessage: 'Amount can have maximum 2 decimal places'
    }
  }

  return { isValid: true }
}

/**
 * Percentage validation
 * Validates percentage values (0-100)
 *
 * @param percentage - Percentage to validate
 * @returns true if valid (0-100), false otherwise
 */
export function isValidPercentage(percentage: number): boolean {
  return !isNaN(percentage) && percentage >= 0 && percentage <= 100
}

/**
 * Credit card number validation (Luhn algorithm)
 * This is a basic validation - actual card validation should be done by payment provider
 *
 * @param cardNumber - Card number to validate
 * @returns true if passes Luhn check, false otherwise
 */
export function isValidCardNumber(cardNumber: string): boolean {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false
  }

  // Remove spaces and dashes
  const digitsOnly = cardNumber.replace(/[\s-]/g, '')

  // Card number should be 13-19 digits
  if (!/^\d{13,19}$/.test(digitsOnly)) {
    return false
  }

  // Luhn algorithm
  let sum = 0
  let isEven = false

  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsOnly[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Special instructions validation
 * Validates text input for order/item special instructions
 *
 * @param instructions - Special instructions text
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns ValidationResult
 */
export function validateSpecialInstructions(instructions: string, maxLength: number = 500): ValidationResult {
  if (!instructions || !instructions.trim()) {
    return { isValid: true } // Optional field
  }

  if (instructions.length > maxLength) {
    return {
      isValid: false,
      errorMessage: `Special instructions must be less than ${maxLength} characters`
    }
  }

  // Check for potentially malicious content (basic XSS prevention)
  const scriptTagRegex = /<script.*?>.*?<\/script>/gi
  if (scriptTagRegex.test(instructions)) {
    return {
      isValid: false,
      errorMessage: 'Invalid characters detected in instructions'
    }
  }

  return { isValid: true }
}

/**
 * Format phone number for display
 * Converts phone number to (XXX) XXX-XXXX format if possible
 *
 * @param phone - Phone number to format
 * @returns Formatted phone number or original if can't format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''

  const digitsOnly = phone.replace(/\D/g, '')

  // Format as (XXX) XXX-XXXX for US numbers
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
  }

  // Format with country code: +X (XXX) XXX-XXXX
  if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`
  }

  return phone
}

/**
 * Sanitize string input
 * Removes potentially dangerous characters while preserving valid input
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''

  return input
    .trim()
    .replace(/<script.*?>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<.*?>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
}
