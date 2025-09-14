/**
 * Format utilities for various data types
 */
export const formatUtils = {
  /**
   * Format price with currency symbol
   */
  price: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  },

  /**
   * Format percentage
   */
  percentage: (value: number, decimals: number = 1): string => {
    return `${(value * 100).toFixed(decimals)}%`
  },

  /**
   * Format file size
   */
  fileSize: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  },

  /**
   * Format duration in minutes to human readable format
   */
  duration: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  },

  /**
   * Format number with thousand separators
   */
  number: (value: number, locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale).format(value)
  },

  /**
   * Format rating with stars
   */
  rating: (rating: number, maxRating: number = 5): string => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0)

    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars)
  },

  /**
   * Format order number with prefix
   */
  orderNumber: (id: number | string, prefix: string = '#'): string => {
    return `${prefix}${String(id).padStart(6, '0')}`
  },

  /**
   * Format table number
   */
  tableNumber: (number: string | number): string => {
    return `Table ${number}`
  },
}

export default formatUtils
