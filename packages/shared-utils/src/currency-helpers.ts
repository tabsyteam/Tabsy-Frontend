/**
 * Currency helper utilities for handling multi-currency scenarios
 */

import type { CurrencyCode } from './formatting/currency'
import type { Order, Payment } from '@tabsy/shared-types'

const DEFAULT_CURRENCY: CurrencyCode = 'USD'

/**
 * Safely get currency from Order with proper fallback chain
 */
export function getOrderCurrency(
  order: Partial<Order> | null | undefined
): CurrencyCode {
  if (!order) return DEFAULT_CURRENCY

  // Check order.currency first
  if (order.currency) return order.currency as CurrencyCode

  // Check nested restaurant.currency
  if (order.restaurant?.currency) {
    return order.restaurant.currency as CurrencyCode
  }

  // Fall back to default
  return DEFAULT_CURRENCY
}

/**
 * Safely get currency from Payment with fallback
 */
export function getPaymentCurrency(
  payment: Partial<Payment> | null | undefined
): CurrencyCode {
  if (!payment) return DEFAULT_CURRENCY
  return (payment.currency as CurrencyCode) || DEFAULT_CURRENCY
}

/**
 * Safely get currency from Restaurant object
 */
export function getRestaurantCurrency(
  restaurant: { currency?: string } | null | undefined
): CurrencyCode {
  if (!restaurant?.currency) return DEFAULT_CURRENCY
  return restaurant.currency as CurrencyCode
}

/**
 * Check if multiple currencies are present in array of items
 */
export function hasMultipleCurrencies(
  items: Array<{ currency?: string }> | null | undefined
): boolean {
  if (!items || items.length === 0) return false

  const currencies = new Set(
    items
      .map(item => item.currency)
      .filter((currency): currency is string => !!currency)
  )

  return currencies.size > 1
}

/**
 * Get unique currencies from array of items
 */
export function getUniqueCurrencies(
  items: Array<{ currency?: string }> | null | undefined
): CurrencyCode[] {
  if (!items || items.length === 0) return [DEFAULT_CURRENCY]

  const currencies = new Set(
    items
      .map(item => item.currency)
      .filter((currency): currency is string => !!currency)
  )

  return currencies.size > 0
    ? Array.from(currencies) as CurrencyCode[]
    : [DEFAULT_CURRENCY]
}

/**
 * Safe numeric conversion for string or number amounts
 */
export function toNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return value
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Get currency for multi-currency display warnings
 */
export function getCurrencyDisplayInfo(
  items: Array<{ currency?: string }> | null | undefined
): {
  hasMultipleCurrencies: boolean
  currencies: CurrencyCode[]
  displayWarning: boolean
} {
  const currencies = getUniqueCurrencies(items)
  const hasMultiple = currencies.length > 1

  return {
    hasMultipleCurrencies: hasMultiple,
    currencies,
    displayWarning: hasMultiple
  }
}

/**
 * Validate if currency code is supported
 */
export function isSupportedCurrency(currency: string | undefined | null): boolean {
  if (!currency) return false

  const supportedCurrencies: CurrencyCode[] = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'AED', 'INR'
  ]

  return supportedCurrencies.includes(currency as CurrencyCode)
}

/**
 * Get fallback currency if provided currency is not supported
 */
export function getSafeCurrency(
  currency: string | undefined | null
): CurrencyCode {
  if (isSupportedCurrency(currency)) {
    return currency as CurrencyCode
  }
  return DEFAULT_CURRENCY
}

export default {
  getOrderCurrency,
  getPaymentCurrency,
  getRestaurantCurrency,
  hasMultipleCurrencies,
  getUniqueCurrencies,
  toNumber,
  getCurrencyDisplayInfo,
  isSupportedCurrency,
  getSafeCurrency
}
