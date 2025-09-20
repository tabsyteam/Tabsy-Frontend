'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Plus,
  Minus,
  Heart,
  Star,
  Clock,
  Flame,
  Leaf,
  ShoppingCart,
  Info,
  Wheat,
  Milk,
  Shield,
  Nut
} from 'lucide-react'
import { SpiceLevel, DietaryType } from '@tabsy/shared-types'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image?: string
  category: string
  dietaryIndicators?: string[]
  allergyInfo?: string[]
  spicyLevel?: number
  preparationTime?: number
  isPopular?: boolean
  isNew?: boolean
}

interface MenuItemCardProps {
  item: MenuItem
  quantity?: number
  onQuantityChange?: (itemId: string, quantity: number) => void
  onAddToCart?: (item: MenuItem, quantity: number) => void
  onToggleFavorite?: (itemId: string) => void
  onItemClick?: (item: MenuItem) => void
  isFavorite?: boolean
  className?: string
  layout?: 'grid' | 'list'
  showQuickAdd?: boolean
}

const MenuItemCard = React.memo<MenuItemCardProps>(({
  item,
  quantity = 0,
  onQuantityChange,
  onAddToCart,
  onToggleFavorite,
  onItemClick,
  isFavorite = false,
  className = '',
  layout = 'grid',
  showQuickAdd = true
}) => {
  const [localQuantity, setLocalQuantity] = useState(quantity || 0)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  // Sync local state with prop changes (when cart is updated from ItemDetailModal)
  useEffect(() => {
    setLocalQuantity(quantity || 0)
  }, [quantity])

  const handleQuantityChange = (newQuantity: number) => {
    const finalQuantity = Math.max(0, newQuantity)
    setLocalQuantity(finalQuantity)
    if (onQuantityChange) {
      onQuantityChange(item.id, finalQuantity)
    }
  }

  const handleAddToCart = async () => {
    if (localQuantity === 0) {
      handleQuantityChange(1)
    }

    setIsAddingToCart(true)

    if (onAddToCart) {
      onAddToCart(item, Math.max(1, localQuantity))
    }

    setTimeout(() => setIsAddingToCart(false), 500)
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click event
    if (onToggleFavorite) {
      onToggleFavorite(item.id)
    }
  }

  const handleCardClick = () => {
    if (onItemClick) {
      onItemClick(item)
    }
  }

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click event
    console.log('[MenuItemCard] Info button clicked for item:', item.name)
    if (onItemClick) {
      console.log('[MenuItemCard] Calling onItemClick with item:', item)
      onItemClick(item)
    } else {
      console.log('[MenuItemCard] onItemClick callback is not provided')
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click event
  }

  const formatPrice = (price: number) => {
    return `$${Number(price || 0).toFixed(2)}`
  }

  const getDietaryIcon = (indicator: string) => {
    switch (indicator) {
      case DietaryType.VEGETARIAN:
      case DietaryType.VEGAN:
        return <Leaf size={14} className="text-secondary" />
      case DietaryType.GLUTEN_FREE:
        return <Wheat size={14} className="text-primary" />
      case DietaryType.DAIRY_FREE:
        return <Milk size={14} className="text-accent" />
      case DietaryType.NUT_FREE:
        return <Nut size={14} className="text-primary" />
      case DietaryType.HALAL:
      case DietaryType.KOSHER:
        return <Shield size={14} className="text-secondary" />
      default:
        return null
    }
  }

  const renderSpicyLevel = () => {
    if (item.spicyLevel === undefined || item.spicyLevel === null || item.spicyLevel === SpiceLevel.NONE) {
      return null
    }

    return (
      <div className="flex items-center gap-1">
        {[...Array(3)].map((_, i) => (
          <Flame
            key={i}
            size={12}
            className={`${
              i < item.spicyLevel!
                ? 'text-accent fill-current'
                : 'text-content-disabled'
            }`}
          />
        ))}
      </div>
    )
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: {
      y: -4,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  }

  if (layout === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className={`card-food p-4 ${className}`}
      >
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <Image
              src={item.image || '/images/food/dish-placeholder.svg'}
              alt={item.name}
              fill
              className="object-cover rounded-lg"
              sizes="80px"
            />
            {item.isNew && (
              <div className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full px-2 py-0.5">
                NEW
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-h3 font-semibold truncate">{item.name}</h3>
                <p className="text-body-sm text-content-secondary line-clamp-2">
                  {item.description}
                </p>
              </div>

              <motion.button
                onClick={handleToggleFavorite}
                whileTap={{ scale: 0.9 }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="ml-2 p-1.5 rounded-full hover:bg-interactive-hover transition-colors duration-200"
              >
                <Heart
                  size={16}
                  className={`${
                    isFavorite
                      ? 'text-accent fill-current'
                      : 'text-content-tertiary'
                  }`}
                />
              </motion.button>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-3 mb-3">
              {item.preparationTime && (
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-content-tertiary" />
                  <span className="text-caption-sm text-content-tertiary">
                    {item.preparationTime}min
                  </span>
                </div>
              )}

              {renderSpicyLevel()}
            </div>

            {/* Price and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-h3 font-bold text-primary">
                  {formatPrice(item.price)}
                </span>

                {/* Info Button */}
                <motion.button
                  onClick={handleInfoClick}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1 }}
                  className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm border border-primary/20"
                  title="View details and nutritional information"
                >
                  <Info size={12} className="text-current" />
                </motion.button>
              </div>

              {showQuickAdd && (
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    {localQuantity > 0 ? (
                      <motion.div
                        key="quantity-controls-list"
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.98, opacity: 0 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="flex items-center gap-2"
                      >
                        <motion.button
                          onClick={() => handleQuantityChange(localQuantity - 1)}
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.1 }}
                          className="w-8 h-8 btn-circle bg-surface-secondary border-2 border-secondary flex items-center justify-center hover:bg-interactive-hover hover:border-primary transition-all duration-200 shadow-sm"
                        >
                          <Minus size={14} className="text-content-primary" />
                        </motion.button>

                        <span className="w-8 text-center font-bold text-content-primary">
                          {localQuantity}
                        </span>

                        <motion.button
                          onClick={() => handleQuantityChange(localQuantity + 1)}
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.1 }}
                          className="w-8 h-8 btn-circle bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-all duration-200 shadow-lg border-2 border-primary"
                        >
                          <Plus size={14} className="text-primary-foreground" />
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="add-button-list"
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.98, opacity: 0 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        onClick={handleAddToCart}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        disabled={isAddingToCart}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-semibold text-sm shadow-lg hover:bg-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 min-w-[80px] justify-center"
                      >
                        {isAddingToCart ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                          >
                            <ShoppingCart size={16} />
                          </motion.div>
                        ) : (
                          <>
                            <Plus size={16} className="text-primary-foreground" />
                            <span>Add</span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Grid layout (default)
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={`card-food h-full flex flex-col ${className}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={item.image || '/images/food/dish-placeholder.svg'}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Overlay Badges */}
        <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex flex-wrap gap-1 max-w-[60%]">
          {item.isPopular && (
            <div className="bg-accent text-accent-foreground text-[10px] sm:text-xs font-bold rounded-full px-1 py-0.5 sm:px-2 sm:py-1 leading-none">
              POP
            </div>
          )}
          {item.isNew && (
            <div className="bg-secondary text-secondary-foreground text-[10px] sm:text-xs font-bold rounded-full px-1 py-0.5 sm:px-2 sm:py-1 leading-none">
              NEW
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <motion.button
          onClick={handleToggleFavorite}
          whileTap={{ scale: 0.9 }}
          className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 p-1 sm:p-1.5 rounded-full bg-surface bg-opacity-90 backdrop-blur-sm hover:bg-opacity-100 transition-all duration-200 z-10"
        >
          <Heart
            size={12}
            className={`sm:w-4 sm:h-4 ${
              isFavorite
                ? 'text-accent fill-current'
                : 'text-content-tertiary'
            }`}
          />
        </motion.button>

        {/* Dietary Indicators */}
        {item.dietaryIndicators && item.dietaryIndicators.length > 0 && (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex gap-1">
            {(() => {
              // Deduplicate vegan/vegetarian - if both present, show only vegan (more restrictive)
              const uniqueIndicators = [...item.dietaryIndicators]
              if (uniqueIndicators.includes(DietaryType.VEGAN) && uniqueIndicators.includes(DietaryType.VEGETARIAN)) {
                const vegIndex = uniqueIndicators.indexOf(DietaryType.VEGETARIAN)
                uniqueIndicators.splice(vegIndex, 1)
              }

              return uniqueIndicators
                .map((indicator) => getDietaryIcon(indicator))
                .filter((icon) => icon !== null)
                .map((icon, index) => (
                  <div
                    key={index}
                    className="p-1 sm:p-1.5 rounded-full bg-surface bg-opacity-90 backdrop-blur-sm"
                  >
                    {icon}
                  </div>
                ))
            })()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 pb-3 sm:p-3 sm:pb-4 flex flex-col flex-1">
        {/* Title and Prep Time */}
        <div className="mb-1 sm:mb-1.5">
          <h3 className="text-base sm:text-h3 font-semibold mb-0.5 sm:mb-1 line-clamp-1">{item.name}</h3>

          <div className="flex items-center gap-1">
            <Clock size={12} className="sm:w-3.5 sm:h-3.5 text-content-tertiary" />
            <span className="text-caption text-content-tertiary">
              {item.preparationTime && item.preparationTime > 0 ? item.preparationTime : 15}min
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 mb-1.5 sm:mb-2">
          <p className="text-caption-sm sm:text-body-sm text-content-secondary line-clamp-2 sm:line-clamp-3">
            {item.description}
          </p>
        </div>

        {/* Spicy Level */}
        {renderSpicyLevel() && (
          <div className="mb-1.5 sm:mb-2">
            {renderSpicyLevel()}
          </div>
        )}

        {/* Price and Info */}
        <div className="mt-auto">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <span className="text-lg sm:text-h2 font-bold text-primary">
              {formatPrice(item.price)}
            </span>

            {/* Info Button */}
            <motion.button
              onClick={handleInfoClick}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              className="p-1 sm:p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm border border-primary/20"
              title="View details and nutritional information"
            >
              <Info size={12} className="sm:w-3.5 sm:h-3.5 text-current" />
            </motion.button>
          </div>

          {/* Add to Cart Controls - Full Width */}
          {showQuickAdd && (
            <div className="w-full" onClick={handleActionClick}>
              <AnimatePresence mode="wait">
                {localQuantity > 0 ? (
                  <motion.div
                    key="quantity-controls"
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="flex items-center justify-center gap-3 w-full"
                  >
                    <motion.button
                      onClick={() => handleQuantityChange(localQuantity - 1)}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.1 }}
                      className="w-8 h-8 sm:w-10 sm:h-10 btn-circle bg-surface border-2 border-default flex items-center justify-center hover:bg-interactive-hover hover:border-primary transition-all duration-200 shadow-sm"
                    >
                      <Minus size={14} className="sm:w-4 sm:h-4 text-content-primary" />
                    </motion.button>

                    <span className="w-10 sm:w-12 text-center font-bold text-base sm:text-h3 text-content-primary px-2 sm:px-3 py-1.5 sm:py-2 bg-surface-secondary rounded-lg border">
                      {localQuantity}
                    </span>

                    <motion.button
                      onClick={() => handleQuantityChange(localQuantity + 1)}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.1 }}
                      className="w-8 h-8 sm:w-10 sm:h-10 btn-circle bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-all duration-200 shadow-lg border-2 border-primary"
                    >
                      <Plus size={14} className="sm:w-4 sm:h-4 text-primary-foreground" />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="add-button"
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    onClick={handleAddToCart}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    disabled={isAddingToCart}
                    className="w-full py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-xs sm:text-sm shadow-lg hover:bg-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 sm:gap-2 justify-center"
                  >
                    {isAddingToCart ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                      >
                        <ShoppingCart size={16} />
                      </motion.div>
                    ) : (
                      <>
                        <Plus size={16} className="text-primary-foreground" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

export default MenuItemCard