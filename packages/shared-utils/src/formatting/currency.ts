/**
 * Currency formatting utilities for Tabsy platform
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'AED' | 'INR';

export interface CurrencyFormatOptions {
  locale?: string;
  showCents?: boolean;
  showSymbol?: boolean;
}

const CURRENCY_CONFIG = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  CAD: { symbol: 'C$', locale: 'en-CA' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
  AED: { symbol: 'د.إ', locale: 'ar-AE' },
  INR: { symbol: '₹', locale: 'en-IN' },
} as const;

/**
 * Format currency amount with proper locale and symbol
 */
export const formatCurrency = (
  amount: number,
  currency: CurrencyCode = 'USD',
  options: CurrencyFormatOptions = {}
): string => {
  const {
    locale = CURRENCY_CONFIG[currency].locale,
    showCents = true,
    showSymbol = true,
  } = options;

  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  return formatter.format(amount);
};

/**
 * Format price for display in menus (always shows cents)
 */
export const formatPrice = (amount: number, currency: CurrencyCode = 'USD'): string => {
  return formatCurrency(amount, currency, { showCents: true, showSymbol: true });
};

/**
 * Format total amount for bills/receipts
 */
export const formatTotal = (amount: number, currency: CurrencyCode = 'USD'): string => {
  return formatCurrency(amount, currency, { showCents: true, showSymbol: true });
};

/**
 * Format tip amount
 */
export const formatTip = (amount: number, currency: CurrencyCode = 'USD'): string => {
  return formatCurrency(amount, currency, { showCents: true, showSymbol: true });
};

/**
 * Format percentage for tip calculations
 */
export const formatTipPercentage = (percentage: number): string => {
  return `${percentage}%`;
};

/**
 * Calculate tip amount from percentage
 */
export const calculateTip = (subtotal: number, percentage: number): number => {
  return Math.round((subtotal * percentage / 100) * 100) / 100;
};

/**
 * Calculate total with tax and tip
 */
export const calculateTotal = (
  subtotal: number,
  taxRate: number,
  tipAmount: number
): number => {
  const tax = Math.round((subtotal * taxRate / 100) * 100) / 100;
  return Math.round((subtotal + tax + tipAmount) * 100) / 100;
};

/**
 * Split bill amount among multiple people
 */
export const splitBill = (total: number, people: number): number => {
  return Math.round((total / people) * 100) / 100;
};

/**
 * Format currency for compact display (e.g., $1.2K, $15M)
 */
export const formatCompactCurrency = (
  amount: number,
  currency: CurrencyCode = 'USD'
): string => {
  const formatter = new Intl.NumberFormat(CURRENCY_CONFIG[currency].locale, {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  return formatter.format(amount);
};

/**
 * Parse currency string back to number
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove currency symbols and non-numeric characters except decimal point
  const numericString = currencyString.replace(/[^\d.-]/g, '');
  const amount = parseFloat(numericString);
  
  return isNaN(amount) ? 0 : amount;
};

/**
 * Validate currency amount (positive, max 2 decimal places)
 */
export const isValidCurrencyAmount = (amount: number): boolean => {
  return amount >= 0 && Number.isFinite(amount) && (amount * 100) % 1 === 0;
};

/**
 * Round currency amount to 2 decimal places
 */
export const roundCurrency = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

/**
 * Get currency symbol by code
 */
export const getCurrencySymbol = (currency: CurrencyCode): string => {
  return CURRENCY_CONFIG[currency]?.symbol || '$';
};

/**
 * Format price range (e.g., "$15 - $25")
 */
export const formatPriceRange = (
  min: number,
  max: number,
  currency: CurrencyCode = 'USD'
): string => {
  const minFormatted = formatPrice(min, currency);
  const maxFormatted = formatPrice(max, currency);
  return `${minFormatted} - ${maxFormatted}`;
};

export default {
  formatCurrency,
  formatPrice,
  formatTotal,
  formatTip,
  formatTipPercentage,
  calculateTip,
  calculateTotal,
  splitBill,
  formatCompactCurrency,
  parseCurrency,
  isValidCurrencyAmount,
  roundCurrency,
  getCurrencySymbol,
  formatPriceRange,
};
