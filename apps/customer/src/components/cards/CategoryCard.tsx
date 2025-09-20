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

const CategoryCard = React.memo<CategoryCardProps>(({
  category,
  onClick,
  className = '',
  layout = 'horizontal',
  showItemCount = true
}) => {
  const getCategoryIcon = (iconName?: string) => {
    const iconProps = {
      size: layout === 'horizontal' ? 16 : 24,
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
          relative flex-shrink-0 px-4 py-2.5 rounded-full border transition-all duration-200 min-w-max
          ${category.isActive
            ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
            : 'bg-surface border-default hover:bg-surface-secondary hover:border-focus-subtle hover:shadow-sm'
          }
          ${className}
        `}
      >
        <div className="flex items-center gap-2.5">
          {/* Icon or Image */}
          <div className={`
            flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-200
            ${category.isActive
              ? 'bg-primary-foreground/20'
              : 'bg-primary/10'
            }
          `}>
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                width={16}
                height={16}
                className="object-cover rounded-full"
              />
            ) : (
              getCategoryIcon(category.icon || category.name)
            )}
          </div>

          {/* Content */}
          <div className="flex items-center gap-1.5">
            <h3 className={`
              text-sm font-medium leading-none
              ${category.isActive ? 'text-primary-foreground' : 'text-content-primary'}
            `}>
              {category.name}
            </h3>
            {showItemCount && category.itemCount !== undefined && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full font-medium leading-none
                ${category.isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
                }
              `}>
                {category.itemCount}
              </span>
            )}
          </div>
        </div>

        {/* Active indicator dot */}
        {category.isActive && (
          <motion.div
            layoutId="activeCategoryDot"
            className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        )}
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
          : 'bg-surface-secondary hover:bg-surface hover:border-focus-subtle'
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
})

export default CategoryCard