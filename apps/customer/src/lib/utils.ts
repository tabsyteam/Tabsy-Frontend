import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency with proper locale support
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
  } else {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Check if PWA is installed
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  
  const width = window.innerWidth
  
  if (width < 768) {
    return 'mobile'
  } else if (width < 1024) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch (err) {
      document.body.removeChild(textArea)
      return false
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    return false
  }
}


/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s|-|\(|\)/g, ''))
}

/**
 * Sleep function for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0] || "th")
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Clean request data by removing undefined and optionally null values
 *
 * This is a type-safe alternative to JSON.parse(JSON.stringify(data))
 * Properly handles nested objects and arrays while maintaining type safety.
 *
 * @param data - The data object to clean
 * @param removeNull - Whether to also remove null values (default: false)
 * @returns Cleaned object with undefined (and optionally null) values removed
 *
 * @example
 * ```ts
 * const data = {
 *   name: 'John',
 *   email: undefined,
 *   phone: null,
 *   address: { city: 'NYC', zip: undefined }
 * }
 *
 * cleanRequestData(data)
 * // Result: { name: 'John', phone: null, address: { city: 'NYC' } }
 *
 * cleanRequestData(data, true)
 * // Result: { name: 'John', address: { city: 'NYC' } }
 * ```
 */
export function cleanRequestData<T extends Record<string, any>>(
  data: T,
  removeNull: boolean = false
): Partial<T> {
  const cleaned: any = {}

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key]

      // Skip undefined values
      if (value === undefined) {
        continue
      }

      // Optionally skip null values
      if (removeNull && value === null) {
        continue
      }

      // Recursively clean nested objects
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const cleanedNested = cleanRequestData(value, removeNull)
        // Only add if the nested object has properties
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested
        }
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        cleaned[key] = value
          .map(item =>
            item !== null && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date)
              ? cleanRequestData(item, removeNull)
              : item
          )
          .filter(item => item !== undefined && (!removeNull || item !== null))
      }
      // Add primitive values and dates
      else {
        cleaned[key] = value
      }
    }
  }

  return cleaned
}
