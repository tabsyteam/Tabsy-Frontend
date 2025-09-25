// Tax rate configuration - must match backend tax rate
// Backend uses DEFAULT_TAX_RATE = 0.1 (10%)
export const TAX_RATE = 0.1 // 10% tax rate

export const formatTaxRate = (rate: number = TAX_RATE): string => {
  return `${(rate * 100).toFixed(0)}%`
}

export const calculateTax = (subtotal: number): number => {
  return subtotal * TAX_RATE
}