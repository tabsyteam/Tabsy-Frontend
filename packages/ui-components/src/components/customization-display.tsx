'use client'

import React from 'react'
import { Minus, Plus } from 'lucide-react'
import { parseCustomizations, formatPriceModifier, type ParsedCustomization } from '@tabsy/shared-utils'

interface CustomizationListProps {
  customizations: any
  className?: string
  showPrices?: boolean
  compact?: boolean
  collapsible?: boolean
}

export function CustomizationList({
  customizations,
  className = '',
  showPrices = true,
  compact = false,
  collapsible = false
}: CustomizationListProps) {
  const [isExpanded, setIsExpanded] = React.useState(!collapsible)
  const parsed = parseCustomizations(customizations)

  if (parsed.details.length === 0) {
    return null
  }

  const renderCustomization = (option: ParsedCustomization, index: number) => {
    const values = option.selectedValues.map(value => {
      const priceText = showPrices && value.priceModifier
        ? formatPriceModifier(value.priceModifier)
        : ''
      return `${value.name}${priceText ? ` (${priceText})` : ''}`
    }).join(', ')

    return (
      <div key={index} className={compact ? 'text-xs' : 'text-sm'}>
        <span className="font-medium text-content-primary">{option.optionName}:</span>
        <span className="ml-1 text-content-secondary">{values}</span>
      </div>
    )
  }

  if (collapsible) {
    return (
      <div className={className}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-content-tertiary hover:text-content-secondary transition-colors"
        >
          {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
          <span>{parsed.summary}</span>
        </button>
        {isExpanded && (
          <div className="mt-1 pl-4 space-y-1 border-l-2 border-border-default">
            {parsed.details.map(renderCustomization)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {parsed.details.map(renderCustomization)}
    </div>
  )
}


interface CustomizationSummaryProps {
  customizations: any
  className?: string
}

export function CustomizationSummary({ customizations, className = '' }: CustomizationSummaryProps) {
  const parsed = parseCustomizations(customizations)

  if (parsed.details.length === 0) {
    return null
  }

  return (
    <div className={`text-xs text-content-tertiary ${className}`}>
      {parsed.summary}
      {parsed.totalPriceModifier !== 0 && (
        <span className="ml-1 font-medium">
          ({formatPriceModifier(parsed.totalPriceModifier)})
        </span>
      )}
    </div>
  )
}