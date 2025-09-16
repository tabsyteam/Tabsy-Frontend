'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  X,
  Plus,
  Minus,
  Star,
  Clock,
  Users,
  Leaf,
  Zap,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Heart
} from 'lucide-react'
import { MenuItem, DietaryType, AllergenType } from '@tabsy/shared-types'
import { formatCurrency } from '@/lib/utils'

interface MenuItemCustomization {
  id: string
  name: string
  type: 'size' | 'extra' | 'modification'
  options: Array<{
    id: string
    name: string
    price: number
    isDefault?: boolean
  }>
  required?: boolean
  maxSelections?: number
}

interface ItemDetailModalProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: MenuItem, quantity: number, customizations: Record<string, any>) => void
  existingQuantity?: number
}

// Mock customizations - in real app this would come from the item data
const getMockCustomizations = (item: MenuItem): MenuItemCustomization[] => {
  const customizations: MenuItemCustomization[] = []

  // Add size options for food items
  if (item && !item.name.toLowerCase().includes('drink')) {
    customizations.push({
      id: 'size',
      name: 'Size',
      type: 'size',
      required: true,
      options: [
        { id: 'regular', name: 'Regular', price: 0, isDefault: true },
        { id: 'large', name: 'Large', price: 3.00 }
      ]
    })
  }

  // Add extras
  customizations.push({
    id: 'extras',
    name: 'Add Extras',
    type: 'extra',
    maxSelections: 3,
    options: [
      { id: 'extra-cheese', name: 'Extra Cheese', price: 2.50 },
      { id: 'avocado', name: 'Avocado', price: 3.00 },
      { id: 'bacon', name: 'Bacon', price: 4.00 },
      { id: 'mushrooms', name: 'Mushrooms', price: 2.00 }
    ]
  })

  // Add modifications
  customizations.push({
    id: 'modifications',
    name: 'Modifications',
    type: 'modification',
    options: [
      { id: 'no-onions', name: 'No Onions', price: 0 },
      { id: 'no-pickles', name: 'No Pickles', price: 0 },
      { id: 'extra-spicy', name: 'Extra Spicy', price: 0 },
      { id: 'on-side', name: 'Sauce on Side', price: 0 }
    ]
  })

  return customizations
}

const getDietaryIcon = (dietary: DietaryType) => {
  switch (dietary) {
    case DietaryType.VEGAN:
    case DietaryType.VEGETARIAN:
      return <Leaf className="w-4 h-4" />
    case DietaryType.GLUTEN_FREE:
      return <Zap className="w-4 h-4" />
    default:
      return null
  }
}

export function ItemDetailModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  existingQuantity = 0
}: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(existingQuantity || 1)
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({})
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showNutrition, setShowNutrition] = useState(false)

  // Mock multiple images - in real app this would come from item data
  const images = item?.imageUrl ? [item.imageUrl, item.imageUrl, item.imageUrl] : []

  const customizations = item ? getMockCustomizations(item) : []

  useEffect(() => {
    if (isOpen) {
      setQuantity(existingQuantity || 1)
      setSelectedCustomizations({})
      setSpecialInstructions('')
      setCurrentImageIndex(0)
      setShowNutrition(false)

      // Set default selections
      const defaults: Record<string, string[]> = {}
      customizations.forEach(custom => {
        const defaultOptions = custom.options.filter(opt => opt.isDefault)
        if (defaultOptions.length > 0) {
          defaults[custom.id] = defaultOptions.map(opt => opt.id)
        }
      })
      setSelectedCustomizations(defaults)
    }
  }, [isOpen, existingQuantity, item])

  if (!item) return null

  const handleCustomizationChange = (customizationId: string, optionId: string, isSelected: boolean) => {
    setSelectedCustomizations(prev => {
      const customization = customizations.find(c => c.id === customizationId)
      if (!customization) return prev

      const current = prev[customizationId] || []

      if (customization.type === 'size' || customization.maxSelections === 1) {
        // Single selection
        return {
          ...prev,
          [customizationId]: isSelected ? [optionId] : []
        }
      } else {
        // Multiple selection
        const updated = isSelected
          ? [...current, optionId]
          : current.filter(id => id !== optionId)

        // Respect max selections
        if (customization.maxSelections && updated.length > customization.maxSelections) {
          return prev
        }

        return {
          ...prev,
          [customizationId]: updated
        }
      }
    })
  }

  const getCustomizationPrice = (): number => {
    let total = 0
    Object.entries(selectedCustomizations).forEach(([customizationId, optionIds]) => {
      const customization = customizations.find(c => c.id === customizationId)
      if (customization) {
        optionIds.forEach(optionId => {
          const option = customization.options.find(o => o.id === optionId)
          if (option) {
            total += option.price
          }
        })
      }
    })
    return total
  }

  const getTotalPrice = (): number => {
    return (Number(item.basePrice) + getCustomizationPrice()) * quantity
  }

  const handleAddToCart = () => {
    onAddToCart(item, quantity, {
      customizations: selectedCustomizations,
      specialInstructions: specialInstructions.trim() || undefined
    })
    onClose()
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] bg-surface rounded-t-2xl md:rounded-2xl overflow-hidden shadow-xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-content-primary truncate pr-4">
                {item.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)] md:max-h-[calc(80vh-8rem)]">
              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="relative">
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    <img
                      src={images[currentImageIndex]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Image Navigation */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Dots Indicator */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                          {images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Favorite Button */}
                    <button className="absolute top-4 right-4 bg-white/90 text-gray-700 rounded-full p-2 hover:bg-white transition-colors">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                {/* Item Info */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-content-primary mb-2">
                        {item.name}
                      </h3>
                      <p className="text-content-secondary text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(item.basePrice)}
                      </div>
                      {getCustomizationPrice() > 0 && (
                        <div className="text-sm text-content-secondary">
                          +{formatCurrency(getCustomizationPrice())} extras
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dietary & Allergen Info */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.dietaryTypes?.map(diet => (
                      <span
                        key={diet}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium"
                      >
                        {getDietaryIcon(diet)}
                        <span>{diet.replace('_', ' ')}</span>
                      </span>
                    ))}
                  </div>

                  {item.allergens && item.allergens.length > 0 && (
                    <div className="flex items-start space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-800 text-sm">Contains Allergens:</div>
                        <div className="text-orange-700 text-sm">
                          {item.allergens.map(allergen => allergen.replace('_', ' ')).join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customizations */}
                {customizations.map(customization => (
                  <div key={customization.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-content-primary">
                        {customization.name}
                        {customization.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h4>
                      {customization.maxSelections && customization.maxSelections > 1 && (
                        <span className="text-xs text-content-tertiary">
                          Choose up to {customization.maxSelections}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      {customization.options.map(option => {
                        const isSelected = selectedCustomizations[customization.id]?.includes(option.id) || false
                        const isSingleSelect = customization.type === 'size' || customization.maxSelections === 1

                        return (
                          <label
                            key={option.id}
                            className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border-default hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type={isSingleSelect ? 'radio' : 'checkbox'}
                                name={isSingleSelect ? customization.id : undefined}
                                checked={isSelected}
                                onChange={(e) => handleCustomizationChange(
                                  customization.id,
                                  option.id,
                                  e.target.checked
                                )}
                                className="text-primary focus:ring-primary"
                              />
                              <div>
                                <div className="font-medium text-content-primary">
                                  {option.name}
                                </div>
                                {option.price > 0 && (
                                  <div className="text-sm text-content-secondary">
                                    +{formatCurrency(option.price)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Special Instructions */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-content-primary">
                    Special Instructions (Optional)
                  </h4>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special requests or modifications..."
                    className="w-full p-3 border border-border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-xs text-content-tertiary text-right">
                    {specialInstructions.length}/200 characters
                  </div>
                </div>

                {/* Nutritional Info Toggle */}
                <div>
                  <button
                    onClick={() => setShowNutrition(!showNutrition)}
                    className="text-primary font-medium text-sm hover:underline"
                  >
                    {showNutrition ? 'Hide' : 'Show'} Nutritional Information
                  </button>

                  <AnimatePresence>
                    {showNutrition && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Calories:</span>
                            <span className="ml-2">450</span>
                          </div>
                          <div>
                            <span className="font-medium">Protein:</span>
                            <span className="ml-2">25g</span>
                          </div>
                          <div>
                            <span className="font-medium">Carbs:</span>
                            <span className="ml-2">45g</span>
                          </div>
                          <div>
                            <span className="font-medium">Fat:</span>
                            <span className="ml-2">18g</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface border-t p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-content-primary">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold min-w-[2rem] text-center">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-content-secondary">Total</div>
                  <div className="text-xl font-bold text-primary">
                    {formatCurrency(getTotalPrice())}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                size="lg"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {existingQuantity > 0 ? 'Update Cart' : 'Add to Cart'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}