'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fallbackSrc?: string
  showShimmer?: boolean
  priority?: boolean
  quality?: number
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackSrc,
  showShimmer = true,
  priority = false,
  quality = 85
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const imageRef = useRef<HTMLImageElement>(null)

  // High-quality food fallback images from public domain sources
  const getFoodFallback = (category?: string): string => {
    const fallbacks = {
      appetizers: '/images/food/appetizers-placeholder.jpg',
      mains: '/images/food/main-dish-placeholder.jpg',
      desserts: '/images/food/dessert-placeholder.jpg',
      drinks: '/images/food/drink-placeholder.jpg',
      default: '/images/food/dish-placeholder.jpg'
    }

    const categoryKey = category?.toLowerCase() as keyof typeof fallbacks
    return fallbacks[categoryKey] || fallbacks.default
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    if (!hasError && (fallbackSrc || getFoodFallback())) {
      setHasError(true)
      setCurrentSrc(fallbackSrc || getFoodFallback())
    }
  }

  // Reset states when src changes
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    setCurrentSrc(src)
  }, [src])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Shimmer loading effect */}
      {isLoading && showShimmer && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Animated shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: [-200, 400] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Food icon placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-4xl opacity-30"
              animate={{
                scale: [0.9, 1.1, 0.9],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🍽️
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Optimized Next.js Image */}
      <motion.div
        className="relative w-full h-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: isLoading ? 0 : 1,
          scale: isLoading ? 0.95 : 1
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Image
          ref={imageRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
          priority={priority}
          quality={quality}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{
            filter: hasError ? 'grayscale(0.2) brightness(1.1)' : 'none',
          }}
        />
      </motion.div>

      {/* Enhanced overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Quality indicator for high-res images */}
      {quality > 90 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute top-2 right-2 bg-green-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        >
          HD
        </motion.div>
      )}

      {/* Error state indicator */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-2 left-2 bg-yellow-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium"
        >
          Placeholder
        </motion.div>
      )}
    </div>
  )
}

// Enhanced Food Category Image Component
export function FoodCategoryImage({
  category,
  src,
  alt,
  className = ''
}: {
  category?: string
  src?: string
  alt: string
  className?: string
}) {
  const highQualitySources = {
    appetizers: [
      '/images/food/appetizers-1.jpg',
      '/images/food/appetizers-2.jpg',
      'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=800&q=80'
    ],
    mains: [
      '/images/food/mains-1.jpg',
      '/images/food/mains-2.jpg',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80'
    ],
    desserts: [
      '/images/food/desserts-1.jpg',
      '/images/food/desserts-2.jpg',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80'
    ],
    drinks: [
      '/images/food/drinks-1.jpg',
      '/images/food/drinks-2.jpg',
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80'
    ]
  }

  const categoryKey = category?.toLowerCase() as keyof typeof highQualitySources
  const fallbackSources = highQualitySources[categoryKey] || []
  const primarySource = src || fallbackSources[0]
  const fallbackSource = fallbackSources[1] || fallbackSources[0]

  return (
    <OptimizedImage
      src={primarySource || '/images/food/dish-placeholder.jpg'}
      alt={alt}
      className={className}
      fallbackSrc={fallbackSource}
      showShimmer={true}
      quality={90}
    />
  )
}

// Menu Item Image with enhanced loading
export function MenuItemImage({
  src,
  alt,
  className = ''
}: {
  src?: string
  alt: string
  className?: string
}) {
  return (
    <OptimizedImage
      src={src || '/images/food/dish-placeholder.jpg'}
      alt={alt}
      className={className}
      quality={85}
      showShimmer={true}
      fallbackSrc="/images/food/dish-placeholder.jpg"
    />
  )
}