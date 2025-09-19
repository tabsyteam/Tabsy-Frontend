'use client'

import { useState, useEffect, useRef } from 'react'
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
  Heart,
  Wheat,
  Milk,
  Shield,
  Nut
} from 'lucide-react'
import { MenuItem, DietaryType, AllergyInfo, SpiceLevel, MenuItemOption, OptionType } from '@tabsy/shared-types'
import { formatCurrency } from '@/lib/utils'
import { haptics } from '@/lib/haptics'
import { InteractiveButton, InteractiveCard, ToggleSwitch, AnimatedCounter, useShakeAnimation } from '@/components/ui/MicroInteractions'

interface ItemDetailModalProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: MenuItem, quantity: number, customizations: Record<string, any>) => void
  existingQuantity?: number
}

// Helper function to get spice level display
const getSpiceLevelDisplay = (level: SpiceLevel): { name: string; icon: string; color: string } => {
  switch (level) {
    case SpiceLevel.NONE:
      return { name: 'No Spice', icon: '○', color: 'text-gray-500' }
    case SpiceLevel.MILD:
      return { name: 'Mild', icon: '🌶️', color: 'text-green-600' }
    case SpiceLevel.MEDIUM:
      return { name: 'Medium', icon: '🌶️🌶️', color: 'text-yellow-600' }
    case SpiceLevel.HOT:
      return { name: 'Hot', icon: '🌶️🌶️🌶️', color: 'text-orange-600' }
    case SpiceLevel.EXTRA_HOT:
      return { name: 'Extra Hot', icon: '🌶️🌶️🌶️🌶️', color: 'text-red-600' }
    default:
      return { name: '', icon: '', color: '' }
  }
}

const getDietaryIcon = (dietary: DietaryType) => {
  switch (dietary) {
    case DietaryType.VEGAN:
    case DietaryType.VEGETARIAN:
      return <Leaf className="w-4 h-4" />
    case DietaryType.GLUTEN_FREE:
      return <Wheat className="w-4 h-4" />
    case DietaryType.DAIRY_FREE:
      return <Milk className="w-4 h-4" />
    case DietaryType.NUT_FREE:
      return <Nut className="w-4 h-4" />
    case DietaryType.HALAL:
    case DietaryType.KOSHER:
      return <Shield className="w-4 h-4" />
    default:
      return null
  }
}

const getAllergensList = (allergyInfo?: AllergyInfo): string[] => {
  if (!allergyInfo) return []

  const allergens: string[] = []

  if (allergyInfo.containsEggs) allergens.push('Eggs')
  if (allergyInfo.containsNuts) allergens.push('Nuts')
  if (allergyInfo.containsDairy) allergens.push('Dairy')
  if (allergyInfo.containsGluten) allergens.push('Gluten')
  if (allergyInfo.containsSeafood) allergens.push('Seafood')
  if (allergyInfo.other && allergyInfo.other.length > 0) {
    allergens.push(...allergyInfo.other)
  }

  return allergens
}

export function ItemDetailModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  existingQuantity = 0
}: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1) // Always start with 1 for new cart entries
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({})
  const [textInputs, setTextInputs] = useState<Record<string, string>>({})
  const [numberInputs, setNumberInputs] = useState<Record<string, number>>({})
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showNutrition, setShowNutrition] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [imageScale, setImageScale] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const nutritionRef = useRef<HTMLDivElement>(null)
  const { controls: shakeControls, shake } = useShakeAnimation()

  // Enhanced image gallery - supports single image with modern UI patterns
  // Future enhancement: backend support for multiple images per item
  const images = item?.image || item?.imageUrl ? [item?.image || item?.imageUrl] : []

  // Mock additional images for demonstration (remove when backend supports multiple images)
  const enhancedImages = images.length > 0 ? [
    ...images,
    // Placeholder for additional angles/variations - replace with real backend data
  ] : []

  // Use real backend options instead of mock customizations
  const options = item?.options || []

  useEffect(() => {
    console.log('[ItemDetailModal] Modal state changed - isOpen:', isOpen, 'item:', item)
    if (isOpen) {
      setQuantity(existingQuantity || 1)
      setSelectedCustomizations({})
      setTextInputs({})
      setNumberInputs({})
      setSpecialInstructions('')
      setCurrentImageIndex(0)
      setShowNutrition(false)
      setImageScale(1)
      setImageLoading(false)
      setShowFullscreen(false)

      // Set default selections from real backend data
      const defaults: Record<string, string[]> = {}
      const defaultTexts: Record<string, string> = {}
      const defaultNumbers: Record<string, number> = {}

      options.forEach(option => {
        if (option.type === OptionType.TEXT_INPUT) {
          defaultTexts[option.id] = ''
        } else if (option.type === OptionType.NUMBER_INPUT) {
          defaultNumbers[option.id] = option.minSelections || 0
        } else {
          const defaultValues = option.values.filter(value => value.isDefault)
          if (defaultValues.length > 0) {
            defaults[option.id] = defaultValues.map(value => value.id)
          }
        }
      })

      setSelectedCustomizations(defaults)
      setTextInputs(defaultTexts)
      setNumberInputs(defaultNumbers)
    }
  }, [isOpen, existingQuantity, item, options])

  // Scroll lock functionality - prevents background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY
      const body = document.body

      // Apply styles to prevent scrolling
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.overflow = 'hidden'
      body.style.width = '100%'

      // Clean up function to restore scroll when modal closes
      return () => {
        // Use requestAnimationFrame to ensure the modal is completely closed before restoring
        requestAnimationFrame(() => {
          // Restore scroll position and remove fixed positioning
          body.style.position = ''
          body.style.top = ''
          body.style.left = ''
          body.style.right = ''
          body.style.overflow = ''
          body.style.width = ''

          // Restore scroll position with no scroll behavior to prevent smooth scrolling
          window.scrollTo(0, scrollY)
        })
      }
    }

    // Return undefined when modal is not open (no cleanup needed)
    return undefined
  }, [isOpen])

  // Auto-scroll to nutritional information when it opens
  useEffect(() => {
    if (showNutrition && nutritionRef.current) {
      // Use a small delay to allow the animation to start
      const timer = setTimeout(() => {
        // Find the scrollable content container using the flex-1 class
        const modalContent = document.querySelector('.flex-1.overflow-y-auto')

        if (modalContent && nutritionRef.current) {
          // Scroll the modal content to show the nutrition section fully
          const nutritionRect = nutritionRef.current.getBoundingClientRect()
          const modalRect = modalContent.getBoundingClientRect()

          // Calculate if we need to scroll to see the full nutrition section
          const scrollOffset = nutritionRect.bottom - modalRect.bottom + 40 // 40px padding for better visibility

          if (scrollOffset > 0) {
            modalContent.scrollBy({
              top: scrollOffset,
              behavior: 'smooth'
            })
          }
        } else {
          // Fallback to scrollIntoView
          nutritionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
            inline: 'start'
          })
        }
      }, 200) // Slightly longer delay to ensure animation has started

      return () => clearTimeout(timer)
    }

    // Return undefined when conditions aren't met
    return undefined
  }, [showNutrition])

  if (!item) return null

  const handleCustomizationChange = (optionId: string, valueId: string, isSelected: boolean) => {
    setSelectedCustomizations(prev => {
      const option = options.find(o => o.id === optionId)
      if (!option) return prev

      const current = prev[optionId] || []

      if (option.type === OptionType.SINGLE_SELECT || option.maxSelections === 1) {
        // Single selection
        haptics.customizationSelect()
        return {
          ...prev,
          [optionId]: isSelected ? [valueId] : []
        }
      } else if (option.type === OptionType.MULTI_SELECT) {
        // Multiple selection
        const updated = isSelected
          ? [...current, valueId]
          : current.filter(id => id !== valueId)

        // Respect max selections
        if (updated.length > option.maxSelections) {
          shake() // Shake animation for invalid action
          return prev
        }

        // Respect min selections (don't allow going below minimum)
        if (updated.length < option.minSelections && !isSelected) {
          shake() // Shake animation for invalid action
          return prev
        }

        haptics.customizationSelect()
        return {
          ...prev,
          [optionId]: updated
        }
      }

      return prev
    })
  }

  const handleTextInputChange = (optionId: string, value: string) => {
    setTextInputs(prev => ({
      ...prev,
      [optionId]: value
    }))
  }

  const handleNumberInputChange = (optionId: string, value: number) => {
    const option = options.find(o => o.id === optionId)
    if (!option) return

    // Respect min/max constraints
    const clampedValue = Math.max(
      option.minSelections,
      Math.min(option.maxSelections, value)
    )

    setNumberInputs(prev => ({
      ...prev,
      [optionId]: clampedValue
    }))
  }

  const getCustomizationPrice = (): number => {
    let total = 0

    // Price from selected option values
    Object.entries(selectedCustomizations).forEach(([optionId, valueIds]) => {
      const option = options.find(o => o.id === optionId)
      if (option) {
        valueIds.forEach(valueId => {
          const value = option.values.find(v => v.id === valueId)
          if (value) {
            total += value.priceModifier
          }
        })
      }
    })

    // Price from number inputs (if any option charges per unit)
    Object.entries(numberInputs).forEach(([optionId, count]) => {
      const option = options.find(o => o.id === optionId)
      if (option && option.type === OptionType.NUMBER_INPUT) {
        // For number inputs, we might need to multiply by count
        // This depends on how the backend handles it - for now assume it's just the count
        total += count * (option.values[0]?.priceModifier || 0)
      }
    })

    return total
  }

  const getTotalPrice = (): number => {
    const basePrice = Number(item?.basePrice || item?.price || 0)
    console.log('[ItemDetailModal] Calculating total price - basePrice:', basePrice, 'customization:', getCustomizationPrice(), 'quantity:', quantity)
    return (basePrice + getCustomizationPrice()) * quantity
  }

  const handleAddToCart = () => {
    haptics.addToCart()
    console.log('[ItemDetailModal] -- Adding to cart:', { item, quantity, selectedCustomizations, textInputs, numberInputs, specialInstructions })
    onAddToCart(item, quantity, {
      selectedOptions: selectedCustomizations,
      textInputs,
      numberInputs,
      specialInstructions: specialInstructions.trim() || undefined
    })
    onClose()
  }

  const nextImage = () => {
    if (images.length > 0) {
      haptics.pageSwipe()
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
      setImageScale(1)
    }
  }

  const prevImage = () => {
    if (images.length > 0) {
      haptics.pageSwipe()
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
      setImageScale(1)
    }
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
  }

  const toggleFullscreen = () => {
    haptics.modal()
    setShowFullscreen(!showFullscreen)
    setImageScale(1)
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    if (!isFavorite) {
      haptics.favoriteToggle()
    } else {
      haptics.unfavoriteToggle()
    }
  }

  const handleImageClick = (e: React.MouseEvent) => {
    if (images.length > 0) {
      // Toggle zoom on click
      if (imageScale === 1) {
        setImageScale(2)
        // Center the zoom on click point
        const rect = imageRef.current?.getBoundingClientRect()
        if (rect) {
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          // Apply transform origin for zoom
          if (imageRef.current) {
            imageRef.current.style.transformOrigin = `${x}px ${y}px`
          }
        }
      } else {
        setImageScale(1)
        if (imageRef.current) {
          imageRef.current.style.transformOrigin = 'center center'
        }
      }
    }
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
            className="relative w-full max-w-2xl max-h-[85vh] bg-surface rounded-t-2xl md:rounded-2xl overflow-hidden shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-surface border-b p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-content-primary truncate pr-4">
                  {item.name}
                </h2>
                {existingQuantity > 0 && (
                  <div className="text-xs text-primary font-medium mt-1">
                    Currently in cart: {existingQuantity} {existingQuantity === 1 ? 'item' : 'items'}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-interactive-hover text-content-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent">
              {/* Enhanced Image Gallery */}
              {images.length > 0 && (
                <div className="relative">
                  <motion.div
                    className="aspect-video bg-gradient-to-br from-surface to-surface-secondary relative overflow-hidden group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    {/* Loading Skeleton */}
                    <AnimatePresence>
                      {imageLoading && (
                        <motion.div
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-br from-surface-secondary to-surface-tertiary flex items-center justify-center"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Main Image */}
                    <motion.img
                      ref={imageRef}
                      src={images[currentImageIndex]}
                      alt={item?.name || 'Menu item'}
                      className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 ease-out"
                      style={{
                        transform: `scale(${imageScale})`,
                        cursor: imageScale > 1 ? 'zoom-out' : 'zoom-in'
                      }}
                      onClick={handleImageClick}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      onLoadStart={() => setImageLoading(true)}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />

                    {/* Image Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Navigation Controls */}
                    {images.length > 1 && (
                      <>
                        <motion.button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-surface/90 backdrop-blur-sm text-content-primary rounded-full p-3 shadow-lg hover:bg-surface hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-surface/90 backdrop-blur-sm text-content-primary rounded-full p-3 shadow-lg hover:bg-surface hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </motion.button>

                        {/* Modern Dots Indicator */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {images.map((_, index) => (
                            <motion.button
                              key={index}
                              onClick={() => {
                                setCurrentImageIndex(index)
                                setImageScale(1)
                              }}
                              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                index === currentImageIndex
                                  ? 'bg-surface scale-125'
                                  : 'bg-surface/60 hover:bg-surface/80'
                              }`}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Enhanced Action Buttons */}
                    <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {/* Fullscreen Button */}
                      <motion.button
                        onClick={toggleFullscreen}
                        className="bg-surface/90 backdrop-blur-sm text-content-primary rounded-full p-2.5 shadow-lg hover:bg-surface transition-all duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="View fullscreen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </motion.button>

                      {/* Favorite Button */}
                      <motion.button
                        onClick={toggleFavorite}
                        className={`bg-surface/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-surface transition-all duration-200 ${
                          isFavorite ? 'text-red-500' : 'text-gray-800'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </motion.button>
                    </div>

                    {/* Image Counter */}
                    {images.length > 1 && (
                      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    )}

                    {/* Zoom Indicator */}
                    {imageScale > 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10h-3m-3 0h3m0 0V7m0 3v3" />
                        </svg>
                        <span>{Math.round(imageScale * 100)}%</span>
                      </motion.div>
                    )}

                    {/* Tap to zoom hint */}
                    <AnimatePresence>
                      {imageScale === 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 0.7, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs opacity-0 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none"
                        >
                          Tap to zoom
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}

              <div className="p-4 space-y-2">
                {/* Item Info */}
                <div>
                  <div className="flex items-start justify-between mb-2">
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
                        {formatCurrency(item?.basePrice || item?.price || 0)}
                      </div>
                      {getCustomizationPrice() > 0 && (
                        <div className="text-sm text-content-secondary">
                          +{formatCurrency(getCustomizationPrice())} extras
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dietary & Spice Level Info */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.dietaryTypes?.map(diet => (
                      <span
                        key={diet}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium"
                      >
                        {getDietaryIcon(diet)}
                        <span>{diet.replace('_', ' ')}</span>
                      </span>
                    ))}
                    {item.spicyLevel !== undefined && item.spicyLevel !== SpiceLevel.NONE && (
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-sm rounded-full font-medium ${getSpiceLevelDisplay(item.spicyLevel).color}`}>
                        <span>{getSpiceLevelDisplay(item.spicyLevel).icon}</span>
                        <span>{getSpiceLevelDisplay(item.spicyLevel).name}</span>
                      </span>
                    )}
                  </div>

                  {getAllergensList(item.allergyInfo).length > 0 && (
                    <div className="flex items-start space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-800 text-sm">Contains Allergens:</div>
                        <div className="text-orange-700 text-sm">
                          {getAllergensList(item.allergyInfo).join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Menu Item Options (Real Backend Data) */}
                {options.map(option => (
                  <div key={option.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-content-primary">
                        {option.name}
                        {option.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h4>
                      <div className="text-right">
                        {option.type === OptionType.MULTI_SELECT && option.maxSelections > 1 && (
                          <span className="text-xs text-content-tertiary">
                            Choose up to {option.maxSelections}
                          </span>
                        )}
                        {option.minSelections > 0 && (
                          <span className="text-xs text-content-tertiary block">
                            Min: {option.minSelections}
                          </span>
                        )}
                      </div>
                    </div>
                    {option.description && (
                      <p className="text-sm text-content-secondary">
                        {option.description}
                      </p>
                    )}

                    {option.type === OptionType.TEXT_INPUT ? (
                      <input
                        type="text"
                        value={textInputs[option.id] || ''}
                        onChange={(e) => handleTextInputChange(option.id, e.target.value)}
                        onFocus={() => haptics.inputFocus()}
                        placeholder={option.description || "Enter text..."}
                        className="w-full p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        maxLength={200}
                      />
                    ) : option.type === OptionType.NUMBER_INPUT ? (
                      <div className="space-y-3">
                        <div className="flex items-center bg-surface-secondary rounded-2xl p-1">
                          <button
                            onClick={() => {
                              const newValue = (numberInputs[option.id] || 0) - 1
                              if (newValue >= option.minSelections) {
                                haptics.updateQuantity()
                                handleNumberInputChange(option.id, newValue)
                              } else {
                                shake()
                              }
                            }}
                            disabled={(numberInputs[option.id] || 0) <= option.minSelections}
                            className="w-10 h-10 btn-circle bg-surface border border-default hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:bg-interactive-hover disabled:hover:bg-surface"
                          >
                            <Minus className="w-4 h-4 text-content-primary" />
                          </button>
                          <div className="min-w-[3rem] px-3 py-2 text-center">
                            <AnimatedCounter
                              value={numberInputs[option.id] || 0}
                              className="font-bold text-lg text-content-primary"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newValue = (numberInputs[option.id] || 0) + 1
                              if (newValue <= option.maxSelections) {
                                haptics.updateQuantity()
                                handleNumberInputChange(option.id, newValue)
                              } else {
                                shake()
                              }
                            }}
                            disabled={(numberInputs[option.id] || 0) >= option.maxSelections}
                            className="w-10 h-10 btn-circle bg-primary text-primary-foreground border border-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {option.values[0]?.priceModifier !== 0 && (
                          <span className="text-sm text-content-secondary">
                            {(option.values[0]?.priceModifier ?? 0) > 0 ? '+' : ''}
                            {formatCurrency(option.values[0]?.priceModifier ?? 0)} each
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {option.values.map(value => {
                          const isSelected = selectedCustomizations[option.id]?.includes(value.id) || false
                          const isSingleSelect = option.type === OptionType.SINGLE_SELECT || option.maxSelections === 1

                          return (
                            <label
                              key={value.id}
                              className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-default hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type={isSingleSelect ? 'radio' : 'checkbox'}
                                  name={isSingleSelect ? option.id : undefined}
                                  checked={isSelected}
                                  onChange={(e) => handleCustomizationChange(
                                    option.id,
                                    value.id,
                                    e.target.checked
                                  )}
                                  className="text-primary focus:ring-primary"
                                />
                                <div>
                                  <div className="font-medium text-content-primary">
                                    {value.name}
                                  </div>
                                  {value.description && (
                                    <div className="text-xs text-content-tertiary">
                                      {value.description}
                                    </div>
                                  )}
                                  {value.priceModifier !== 0 && (
                                    <div className="text-sm text-content-secondary">
                                      {value.priceModifier > 0 ? '+' : ''}{formatCurrency(value.priceModifier)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Special Instructions */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-content-primary">
                    Special Instructions for this Item (Optional)
                  </h4>
                  <div className="text-xs text-content-secondary mb-2">
                    Instructions added here will apply only to this specific item in your cart
                  </div>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    onFocus={() => haptics.inputFocus()}
                    placeholder="Any special requests or modifications for this item..."
                    className="w-full p-3 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-content-tertiary">
                      {specialInstructions.trim() ? '📝 Will be saved with this item' : ''}
                    </span>
                    <span className="text-content-tertiary">
                      {specialInstructions.length}/200 characters
                    </span>
                  </div>
                </div>

                {/* Nutritional Info Toggle */}
                <div className="pb-2">
                  <button
                    onClick={() => setShowNutrition(!showNutrition)}
                    className="text-primary font-medium text-sm hover:underline"
                  >
                    {showNutrition ? 'Hide' : 'Show'} Nutritional Information
                  </button>

                  <AnimatePresence mode="wait">
                    {showNutrition && (
                      <motion.div
                        ref={nutritionRef}
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{
                          opacity: 1,
                          height: 'auto',
                          scale: 1,
                          transition: {
                            duration: 0.3,
                            ease: [0.4, 0, 0.2, 1]
                          }
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          scale: 0.95,
                          transition: {
                            duration: 0.25,
                            ease: [0.4, 0, 0.2, 1]
                          }
                        }}
                        className="mt-3 p-3 bg-surface-secondary rounded-lg overflow-hidden"
                        style={{ willChange: 'height, opacity, transform' }}
                      >
                        {item.nutritionalInfo ? (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-content-primary mb-3">Nutritional Information</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex justify-between items-center p-2 bg-surface rounded-md">
                                <span className="font-medium text-content-secondary">Calories</span>
                                <span className="font-bold text-content-primary">{item.nutritionalInfo.calories}</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-surface rounded-md">
                                <span className="font-medium text-content-secondary">Protein</span>
                                <span className="font-bold text-content-primary">{item.nutritionalInfo.protein}g</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-surface rounded-md">
                                <span className="font-medium text-content-secondary">Carbs</span>
                                <span className="font-bold text-content-primary">{item.nutritionalInfo.carbohydrates}g</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-surface rounded-md">
                                <span className="font-medium text-content-secondary">Fat</span>
                                <span className="font-bold text-content-primary">{item.nutritionalInfo.fat}g</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-surface rounded-md">
                                <span className="font-medium text-content-secondary">Fiber</span>
                                <span className="font-bold text-content-primary">{item.nutritionalInfo.fiber}g</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-surface rounded-md">
                                <span className="font-medium text-content-secondary">Sugar</span>
                                <span className="font-bold text-content-primary">{item.nutritionalInfo.sugar}g</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-surface rounded-md">
                              <span className="font-medium text-content-secondary">Sodium</span>
                              <span className="font-bold text-content-primary">{item.nutritionalInfo.sodium}mg</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-content-tertiary text-center py-4">
                            Nutritional information not available for this item
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 bg-surface border-t p-4 pb-24 mt-auto" style={{ paddingBottom: 'max(6rem, calc(1rem + env(safe-area-inset-bottom)))' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-content-primary">Quantity:</span>
                  <div className="flex items-center bg-surface-secondary rounded-2xl p-1">
                    <button
                      onClick={() => {
                        if (quantity > 1) {
                          haptics.updateQuantity()
                          setQuantity(Math.max(1, quantity - 1))
                        } else {
                          shake()
                        }
                      }}
                      disabled={quantity <= 1}
                      className="w-10 h-10 btn-circle bg-surface border border-default hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:bg-interactive-hover disabled:hover:bg-surface"
                    >
                      <Minus className="w-4 h-4 text-content-primary" />
                    </button>
                    <div className="min-w-[3rem] px-3 py-2 text-center">
                      <AnimatedCounter
                        value={quantity}
                        className="text-lg font-bold text-content-primary"
                      />
                    </div>
                    <button
                      onClick={() => {
                        haptics.updateQuantity()
                        setQuantity(quantity + 1)
                      }}
                      className="w-10 h-10 btn-circle bg-primary text-primary-foreground border border-primary hover:bg-primary-hover flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-content-secondary">Total</div>
                  <div className="text-xl font-bold text-primary">
                    {formatCurrency(getTotalPrice())}
                  </div>
                </div>
              </div>

              <InteractiveButton
                onClick={handleAddToCart}
                size="lg"
                className="w-full"
                hapticType="medium"
                variant="primary"
              >
                {existingQuantity > 0 ? 'Update Cart' : 'Add to Cart'}
              </InteractiveButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}