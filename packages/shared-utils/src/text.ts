/**
 * Text formatting and manipulation utilities
 */
export const textUtils = {
  /**
   * Capitalize first letter of a string
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  },

  /**
   * Convert string to title case
   */
  titleCase: (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  },

  /**
   * Convert string to camelCase
   */
  camelCase: (str: string): string => {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase()
      })
      .replace(/\s+/g, '')
  },

  /**
   * Convert string to kebab-case
   */
  kebabCase: (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
  },

  /**
   * Truncate text to specified length
   */
  truncate: (str: string, length: number, suffix: string = '...'): string => {
    if (str.length <= length) return str
    return str.substring(0, length - suffix.length) + suffix
  },

  /**
   * Remove extra whitespace and trim
   */
  clean: (str: string): string => {
    return str.replace(/\s+/g, ' ').trim()
  },

  /**
   * Generate slug from text
   */
  slug: (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  },

  /**
   * Extract initials from a name
   */
  initials: (name: string, maxLength: number = 2): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, maxLength)
  },

  /**
   * Mask sensitive data (e.g., phone numbers, emails)
   */
  mask: (str: string, visibleStart: number = 2, visibleEnd: number = 2, maskChar: string = '*'): string => {
    if (str.length <= visibleStart + visibleEnd) return str
    
    const start = str.substring(0, visibleStart)
    const end = str.substring(str.length - visibleEnd)
    const middle = maskChar.repeat(str.length - visibleStart - visibleEnd)
    
    return start + middle + end
  },

  /**
   * Format phone number
   */
  formatPhone: (phone: string, format: 'us' | 'international' = 'us'): string => {
    const cleaned = phone.replace(/\D/g, '')
    
    if (format === 'us' && cleaned.length === 10) {
      const match = cleaned.match(/(\d{3})(\d{3})(\d{4})/)
      if (match) return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    
    return phone
  },

  /**
   * Validate and format email
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Generate random string
   */
  random: (length: number = 8, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string => {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return result
  },

  /**
   * Count words in text
   */
  wordCount: (str: string): number => {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length
  },

  /**
   * Highlight search terms in text
   */
  highlight: (text: string, searchTerm: string, highlightClass: string = 'highlight'): string => {
    if (!searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, `<span class="${highlightClass}">$1</span>`)
  },
}

export default textUtils
