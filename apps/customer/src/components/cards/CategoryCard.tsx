'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  UtensilsCrossed,
  Coffee,
  IceCream,
  Pizza,
  Salad,
  Soup
} from 'lucide-react'

interface Category {
  id: string
  name: string
  description?: string
  image?: string
  icon?: string
  itemCount?: number
  isActive?: boolean
}

interface CategoryCardProps {
  category: Category
  onClick?: (categoryId: string) => void
  className?: string
  layout?: 'horizontal' | 'grid'
  showItemCount?: boolean
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onClick,
  className = '',
  layout = 'horizontal',
  showItemCount = true
}) => {
  const getCategoryIcon = (iconName?: string) => {
    const iconProps = {
      size: layout === 'horizontal' ? 20 : 24,
      className: `${category.isActive ? 'text-primary-foreground' : 'text-content-secondary'}`
    }

    switch (iconName?.toLowerCase()) {
      case 'appetizers':
      case 'starters':
        return <UtensilsCrossed {...iconProps} />
      case 'main':
      case 'entrees':
        return <Pizza {...iconProps} />
      case 'salads':
        return <Salad {...iconProps} />
      case 'soups':
        return <Soup {...iconProps} />
      case 'beverages':
      case 'drinks':
        return <Coffee {...iconProps} />
      case 'desserts':
        return <IceCream {...iconProps} />
      default:
        return <UtensilsCrossed {...iconProps} />
    }
  }

  const handleClick = () => {
    if (onClick) {
      onClick(category.id)
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1, ease: "easeOut" }
    }
  }

  if (layout === 'horizontal') {
    return (
      <motion.button
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
        onClick={handleClick}
        className={`
          card-category flex-shrink-0 min-w-max
          ${category.isActive
            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
            : 'bg-surface-secondary hover:bg-surface hover:border-primary'
          }
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          {/* Icon or Image */}
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-full
            ${category.isActive
              ? 'bg-primary-foreground bg-opacity-20'
              : 'bg-background-secondary'
            }
          `}>
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                width={24}
                height={24}
                className="object-cover rounded-full"
              />
            ) : (
              getCategoryIcon(category.icon || category.name)
            )}
          </div>

          {/* Content */}
          <div className="text-left">
            <h3 className={`
              text-body font-semibold
              ${category.isActive ? 'text-primary-foreground' : 'text-content-primary'}
            `}>
              {category.name}
            </h3>
            {showItemCount && category.itemCount !== undefined && (
              <p className={`
                text-caption
                ${category.isActive
                  ? 'text-primary-foreground text-opacity-80'
                  : 'text-content-tertiary'
                }
              `}>
                {category.itemCount} item{category.itemCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </motion.button>
    )
  }

  // Grid layout
  return (
    <motion.button
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onClick={handleClick}
      className={`
        card-category p-6 text-center
        ${category.isActive
          ? 'bg-primary text-primary-foreground border-primary shadow-lg'
          : 'bg-surface-secondary hover:bg-surface hover:border-primary'
        }
        ${className}
      `}
    >
      {/* Image or Icon */}
      <div className={`
        flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-4
        ${category.isActive
          ? 'bg-primary-foreground bg-opacity-20'
          : 'bg-background-secondary'
        }
      `}>
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            width={32}
            height={32}
            className="object-cover rounded-xl"
          />
        ) : (
          getCategoryIcon(category.icon || category.name)
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className={`
          text-h3 font-semibold mb-1
          ${category.isActive ? 'text-primary-foreground' : 'text-content-primary'}
        `}>
          {category.name}
        </h3>

        {category.description && (
          <p className={`
            text-caption mb-2
            ${category.isActive
              ? 'text-primary-foreground text-opacity-80'
              : 'text-content-secondary'
            }
          `}>
            {category.description}
          </p>
        )}

        {showItemCount && category.itemCount !== undefined && (
          <p className={`
            text-caption font-medium
            ${category.isActive
              ? 'text-primary-foreground text-opacity-80'
              : 'text-content-tertiary'
            }
          `}>
            {category.itemCount} item{category.itemCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Active Indicator */}
      {category.isActive && (
        <motion.div
          layoutId="activeCategoryIndicator"
          className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none"
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      )}
    </motion.button>
  )
}

export default CategoryCard