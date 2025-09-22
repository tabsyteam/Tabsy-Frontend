export interface ParsedCustomization {
  optionName: string
  selectedValues: Array<{
    name: string
    priceModifier?: number
  }>
}

export interface FormattedCustomization {
  summary: string
  details: ParsedCustomization[]
  totalPriceModifier: number
}

/**
 * Parse customizations from various formats into a standardized structure
 */
export function parseCustomizations(customizations: any): FormattedCustomization {
  const details: ParsedCustomization[] = []
  let totalPriceModifier = 0

  if (!customizations) {
    return { summary: '', details: [], totalPriceModifier: 0 }
  }

  // Handle different customization formats

  // Format 1: { options: [...] } - Modern format from ItemDetailModal
  if (customizations.options && Array.isArray(customizations.options)) {
    customizations.options.forEach((option: any) => {
      if (option.optionName && option.selectedValues) {
        const parsedOption: ParsedCustomization = {
          optionName: option.optionName,
          selectedValues: option.selectedValues.map((value: any) => {
            const priceModifier = value.priceModifier || 0
            totalPriceModifier += priceModifier
            return {
              name: value.name || value.valueName || value,
              priceModifier
            }
          })
        }
        details.push(parsedOption)
      }
    })
  }

  // Format 2: Array of options directly - API format sometimes
  else if (Array.isArray(customizations)) {
    // Check if this is the enhanced options format from ItemDetailModal:
    // [{ optionId, valueId, optionName, valueName, price }]
    const isEnhancedFormat = customizations.length > 0 &&
      customizations[0] &&
      'optionName' in customizations[0] &&
      'valueName' in customizations[0] &&
      'price' in customizations[0]

    if (isEnhancedFormat) {
      // Handle enhanced options format - group by optionName since each item is a selected value
      const optionGroups: { [key: string]: any[] } = {}

      customizations.forEach((item: any) => {
        const optionName = item.optionName || 'Unknown Option'
        if (!optionGroups[optionName]) {
          optionGroups[optionName] = []
        }
        optionGroups[optionName].push({
          name: item.valueName || 'Unknown Value',
          priceModifier: item.price || 0
        })
        totalPriceModifier += (item.price || 0)
      })

      // Convert grouped options to ParsedCustomization format
      Object.entries(optionGroups).forEach(([optionName, values]) => {
        details.push({
          optionName,
          selectedValues: values
        })
      })
    }
    // Check if this is the legacy flat format: [{"name":"Size","value":"Large","price":1.5}]
    else if (customizations.length > 0 &&
      customizations[0] &&
      'name' in customizations[0] &&
      'value' in customizations[0] &&
      !('optionName' in customizations[0])) {
      // Handle legacy format from OrderItem table
      // Group by option name since each item in array is a selected value
      const optionGroups: { [key: string]: any[] } = {}

      customizations.forEach((item: any) => {
        const optionName = item.name || 'Unknown Option'
        if (!optionGroups[optionName]) {
          optionGroups[optionName] = []
        }
        optionGroups[optionName].push({
          name: item.value || item.name || 'Unknown Value',
          priceModifier: item.price || 0
        })
        totalPriceModifier += (item.price || 0)
      })

      // Convert grouped options to ParsedCustomization format
      Object.entries(optionGroups).forEach(([optionName, values]) => {
        details.push({
          optionName,
          selectedValues: values
        })
      })
    } else {
      // Handle modern array format
      customizations.forEach((option: any) => {
        if (option.optionName || option.name) {
          const values = option.selectedValues || option.values || []
          const parsedOption: ParsedCustomization = {
            optionName: option.optionName || option.name,
            selectedValues: values.map((value: any) => {
              const priceModifier = value.priceModifier || 0
              totalPriceModifier += priceModifier
              return {
                name: value.valueName || value.name || value,
                priceModifier
              }
            })
          }
          details.push(parsedOption)
        }
      })
    }
  }

  // Format 3: Raw JSON string - legacy format that needs parsing
  else if (typeof customizations === 'string') {
    try {
      const parsed = JSON.parse(customizations)
      return parseCustomizations(parsed)
    } catch (e) {
      // If JSON parsing fails, return empty
      return { summary: '', details: [], totalPriceModifier: 0 }
    }
  }

  // Format 4: Object with direct key-value pairs
  else if (typeof customizations === 'object') {
    Object.entries(customizations).forEach(([key, value]) => {
      if (key !== 'specialInstructions' && key !== 'options') {
        const parsedOption: ParsedCustomization = {
          optionName: key,
          selectedValues: Array.isArray(value)
            ? value.map(v => ({ name: String(v) }))
            : [{ name: String(value) }]
        }
        details.push(parsedOption)
      }
    })
  }

  // Generate summary
  const summary = details.length > 0
    ? `+${details.length} customization${details.length > 1 ? 's' : ''}`
    : ''

  return { summary, details, totalPriceModifier }
}

/**
 * Format customizations for display as a readable string
 */
export function formatCustomizationsText(customizations: any): string {
  const parsed = parseCustomizations(customizations)

  if (parsed.details.length === 0) {
    return ''
  }

  return parsed.details.map(option => {
    const values = option.selectedValues.map(value => {
      const priceText = value.priceModifier
        ? ` (${value.priceModifier > 0 ? '+' : ''}$${value.priceModifier.toFixed(2)})`
        : ''
      return `${value.name}${priceText}`
    }).join(', ')

    return `${option.optionName}: ${values}`
  }).join(' • ')
}

/**
 * Get customization count for display
 */
export function getCustomizationCount(customizations: any): number {
  const parsed = parseCustomizations(customizations)
  return parsed.details.length
}

/**
 * Check if an item has customizations
 */
export function hasCustomizations(customizations: any): boolean {
  return getCustomizationCount(customizations) > 0
}

/**
 * Format price modifier for display
 */
export function formatPriceModifier(amount: number): string {
  if (amount === 0) return ''
  return `${amount > 0 ? '+' : ''}$${amount.toFixed(2)}`
}