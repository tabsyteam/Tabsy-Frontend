'use client'

import React, { useState } from 'react'
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
  ShoppingCart
} from 'lucide-react'

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
  rating?: number
  reviewCount?: number
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
  isFavorite?: boolean
  className?: string
  layout?: 'grid' | 'list'
  showQuickAdd?: boolean
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  quantity = 0,
  onQuantityChange,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
  className = '',
  layout = 'grid',
  showQuickAdd = true
}) => {
  const [localQuantity, setLocalQuantity] = useState(quantity)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

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

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(item.id)
    }
  }

  const formatPrice = (price: number) => {
    return `$${Number(price || 0).toFixed(2)}`
  }

  const getDietaryIcon = (indicator: string) => {
    switch (indicator.toLowerCase()) {
      case 'vegetarian':
      case 'vegan':
        return <Leaf size={14} className="text-secondary" />
      case 'spicy':
        return <Flame size={14} className="text-accent" />
      default:
        return null
    }
  }

  const renderSpicyLevel = () => {
    if (!item.spicyLevel || item.spicyLevel === 0) return null

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
              {item.rating && (
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-accent fill-current" />
                  <span className="text-caption-sm font-medium">
                    {Number(item.rating || 0).toFixed(1)}
                  </span>
                  {item.reviewCount && (
                    <span className="text-caption-sm text-content-tertiary">
                      ({item.reviewCount})
                    </span>
                  )}
                </div>
              )}

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
              <span className="text-h3 font-bold text-primary">
                {formatPrice(item.price)}
              </span>

              {showQuickAdd && (
                <div className="flex items-center gap-2">
                  {localQuantity > 0 ? (
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => handleQuantityChange(localQuantity - 1)}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-full bg-surface-secondary border border-border flex items-center justify-center hover:bg-interactive-hover transition-colors duration-200"
                      >
                        <Minus size={14} />
                      </motion.button>

                      <span className="w-8 text-center font-semibold">
                        {localQuantity}
                      </span>

                      <motion.button
                        onClick={() => handleQuantityChange(localQuantity + 1)}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors duration-200"
                      >
                        <Plus size={14} />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={handleAddToCart}
                      whileTap={{ scale: 0.95 }}
                      disabled={isAddingToCart}
                      className="btn-food bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
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
                          <Plus size={16} />
                          Add
                        </>
                      )}
                    </motion.button>
                  )}
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
      className={`card-food overflow-hidden ${className}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={item.image || '/images/food/dish-placeholder.svg'}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {item.isPopular && (
            <div className="bg-accent text-accent-foreground text-xs font-bold rounded-full px-2 py-1">
              POPULAR
            </div>
          )}
          {item.isNew && (
            <div className="bg-secondary text-secondary-foreground text-xs font-bold rounded-full px-2 py-1">
              NEW
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <motion.button
          onClick={handleToggleFavorite}
          whileTap={{ scale: 0.9 }}
          className="absolute top-3 right-3 p-2 rounded-full bg-surface bg-opacity-90 backdrop-blur-sm hover:bg-opacity-100 transition-all duration-200"
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

        {/* Dietary Indicators */}
        {item.dietaryIndicators && item.dietaryIndicators.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1">
            {item.dietaryIndicators.map((indicator, index) => (
              <div
                key={index}
                className="p-1.5 rounded-full bg-surface bg-opacity-90 backdrop-blur-sm"
              >
                {getDietaryIcon(indicator)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Rating */}
        <div className="mb-2">
          <h3 className="text-h3 font-semibold mb-1 line-clamp-1">{item.name}</h3>

          <div className="flex items-center justify-between">
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star size={14} className="text-accent fill-current" />
                <span className="text-body-sm font-medium">
                  {Number(item.rating || 0).toFixed(1)}
                </span>
                {item.reviewCount && (
                  <span className="text-caption text-content-tertiary">
                    ({item.reviewCount})
                  </span>
                )}
              </div>
            )}

            {item.preparationTime && (
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-content-tertiary" />
                <span className="text-caption text-content-tertiary">
                  {item.preparationTime}min
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-body-sm text-content-secondary mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* Spicy Level */}
        {renderSpicyLevel() && (
          <div className="mb-3">
            {renderSpicyLevel()}
          </div>
        )}

        {/* Price and Add to Cart */}
        <div className="flex items-center justify-between">
          <span className="text-h2 font-bold text-primary">
            {formatPrice(item.price)}
          </span>

          {showQuickAdd && (
            <AnimatePresence mode="wait">
              {localQuantity > 0 ? (
                <motion.div
                  key="quantity-controls"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <motion.button
                    onClick={() => handleQuantityChange(localQuantity - 1)}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-full bg-surface-secondary border border-border flex items-center justify-center hover:bg-interactive-hover transition-colors duration-200"
                  >
                    <Minus size={14} />
                  </motion.button>

                  <span className="w-8 text-center font-semibold">
                    {localQuantity}
                  </span>

                  <motion.button
                    onClick={() => handleQuantityChange(localQuantity + 1)}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors duration-200"
                  >
                    <Plus size={14} />
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  key="add-button"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={handleAddToCart}
                  whileTap={{ scale: 0.95 }}
                  disabled={isAddingToCart}
                  className="btn-food bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
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
                      <Plus size={16} />
                      Add
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default MenuItemCard