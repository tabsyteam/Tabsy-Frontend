'use client'

import React from 'react'
import { ShoppingCart, Plus, Minus } from 'lucide-react'

interface CartOption {
  optionId: string
  valueId: string
  optionName: string
  valueName: string
  price: number
}

interface CartItemDisplayProps {
  name: string
  description?: string
  basePrice: number
  quantity: number
  categoryName: string
  options?: CartOption[]
  specialInstructions?: string
  cookingLevel?: string
  className?: string
  showControls?: boolean
  onQuantityChange?: (quantity: number) => void
  onRemove?: () => void
}

export function CartItemDisplay({
  name,
  description,
  basePrice,
  quantity,
  categoryName,
  options = [],
  specialInstructions,
  cookingLevel,
  className = '',
  showControls = false,
  onQuantityChange,
  onRemove
}: CartItemDisplayProps) {
  const optionsTotal = options.reduce((sum, option) => sum + (option.price || 0), 0)
  const itemTotal = (basePrice + optionsTotal) * quantity

  // Group options by type for better organization
  const groupedOptions = options.reduce((groups, option) => {
    const category = option.optionName || 'Customizations'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(option)
    return groups
  }, {} as Record<string, CartOption[]>)

  return (
    <div className={`bg-surface rounded-lg border p-4 space-y-3 ${className}`}>
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-content-primary leading-tight">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-content-tertiary">{categoryName}</span>
            {quantity > 1 && (
              <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                × {quantity}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-content-primary">
            ${itemTotal.toFixed(2)}
          </div>
          {quantity > 1 && (
            <div className="text-xs text-content-tertiary">
              ${(basePrice + optionsTotal).toFixed(2)} each
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown Section */}
      <div className="bg-surface-secondary rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-content-secondary">Base Price</span>
          <span className="font-medium text-content-primary">
            ${basePrice.toFixed(2)}
          </span>
        </div>

        {/* Cooking Level (if specified) */}
        {cookingLevel && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-content-secondary">Cooking Level</span>
            <span className="font-medium text-content-primary">
              {cookingLevel} (+$0.00)
            </span>
          </div>
        )}

        {/* Customizations by Group */}
        {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
          <div key={groupName} className="space-y-1">
            <div className="text-xs font-medium text-content-tertiary uppercase tracking-wide">
              {groupName}
            </div>
            {groupOptions.map((option, index) => (
              <div key={index} className="flex justify-between items-center text-sm pl-2">
                <span className="text-content-secondary flex items-center gap-1">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  {option.valueName}
                </span>
                <span className="font-medium text-content-primary">
                  {option.price > 0 ? `+$${option.price.toFixed(2)}` : 'Free'}
                </span>
              </div>
            ))}
          </div>
        ))}

        {/* Subtotal if multiple items */}
        {quantity > 1 && (
          <div className="border-t border-border-default pt-2 mt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-content-primary">
                Subtotal (× {quantity})
              </span>
              <span className="text-content-primary">
                ${itemTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Special Instructions */}
      {specialInstructions && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-1">
            Special Instructions
          </div>
          <div className="text-sm text-amber-700">
            {specialInstructions}
          </div>
        </div>
      )}

      {/* Action Controls (if enabled) */}
      {showControls && (
        <div className="flex justify-between items-center pt-2 border-t border-border-default">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onQuantityChange?.(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full border border-border-default flex items-center justify-center hover:bg-surface-secondary transition-colors"
              disabled={quantity <= 1}
            >
              <span className="text-lg font-medium">−</span>
            </button>
            <span className="font-medium text-content-primary min-w-[2rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => onQuantityChange?.(quantity + 1)}
              className="w-8 h-8 rounded-full border border-border-default flex items-center justify-center hover:bg-surface-secondary transition-colors"
            >
              <span className="text-lg font-medium">+</span>
            </button>
          </div>

          {onRemove && (
            <button
              onClick={onRemove}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for smaller spaces
export function CompactCartItemDisplay({
  name,
  basePrice,
  quantity,
  options = [],
  className = ''
}: Pick<CartItemDisplayProps, 'name' | 'basePrice' | 'quantity' | 'options' | 'className'>) {
  const optionsTotal = options.reduce((sum, option) => sum + (option.price || 0), 0)
  const itemTotal = (basePrice + optionsTotal) * quantity

  return (
    <div className={`flex justify-between items-center py-2 ${className}`}>
      <div className="flex-1">
        <div className="font-medium text-content-primary">{name}</div>
        <div className="text-xs text-content-tertiary">
          {options.length > 0 && (
            <span className="flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              {options.length} customization{options.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-content-primary">
          ${itemTotal.toFixed(2)}
        </div>
        {quantity > 1 && (
          <div className="text-xs text-content-tertiary">
            × {quantity}
          </div>
        )}
      </div>
    </div>
  )
}