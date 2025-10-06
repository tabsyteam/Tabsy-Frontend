// Common currency codes
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'AED' | 'INR'

/**
 * Currency formatting utilities
 */
export const currencyUtils = {
  /**
   * Format currency amount with proper symbol and formatting
   */
  format: (
    amount: number,
    currency: Currency = 'USD',
    locale: string = 'en-US'
  ): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
      }).format(amount)
    } catch (error) {
      // Fallback formatting
      const symbols: Record<Currency, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CAD: 'C$',
        AUD: 'A$',
        AED: 'د.إ',
        INR: '₹'
      }
      return `${symbols[currency] || '$'}${amount.toFixed(2)}`
    }
  },

  /**
   * Parse currency string to number
   */
  parse: (currencyString: string): number => {
    const cleaned = currencyString.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
  },

  /**
   * Convert between currencies (placeholder - would integrate with real rates API)
   */
  convert: (
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
    exchangeRate: number = 1
  ): number => {
    if (fromCurrency === toCurrency) return amount
    return amount * exchangeRate
  },

  /**
   * Calculate tax amount
   */
  calculateTax: (amount: number, taxRate: number): number => {
    return amount * (taxRate / 100)
  },

  /**
   * Calculate tip amount
   */
  calculateTip: (amount: number, tipPercentage: number): number => {
    return amount * (tipPercentage / 100)
  },

  /**
   * Calculate total with tax and tip
   */
  calculateTotal: (
    subtotal: number,
    taxRate: number = 0,
    tipPercentage: number = 0
  ): { subtotal: number; tax: number; tip: number; total: number } => {
    const tax = currencyUtils.calculateTax(subtotal, taxRate)
    const tip = currencyUtils.calculateTip(subtotal + tax, tipPercentage)
    const total = subtotal + tax + tip

    return {
      subtotal,
      tax,
      tip,
      total,
    }
  },

  /**
   * Round to currency precision (2 decimal places)
   */
  round: (amount: number): number => {
    return Math.round(amount * 100) / 100
  },

  /**
   * Check if amount is valid currency value
   */
  isValid: (amount: any): boolean => {
    return typeof amount === 'number' && !isNaN(amount) && isFinite(amount)
  },

  /**
   * Get currency symbol
   */
  getSymbol: (currency: Currency): string => {
    const symbols: Record<Currency, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      AED: 'د.إ',
      INR: '₹'
    }
    return symbols[currency] || '$'
  },
}

export default currencyUtils

// Convenience exports
export const formatCurrency = currencyUtils.format
export const parseCurrency = currencyUtils.parse
export const convertCurrency = currencyUtils.convert
export const calculateTax = currencyUtils.calculateTax
export const calculateTip = currencyUtils.calculateTip
export const calculateTotal = currencyUtils.calculateTotal
export const roundCurrency = currencyUtils.round
export const isValidCurrency = currencyUtils.isValid
export const getCurrencySymbol = currencyUtils.getSymbol
