'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface OptimizedImageProps {
  src?: string
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
  width = 400,
  height = 300,
  className = '',
  fallbackSrc,
  showShimmer = true,
  priority = false,
  quality = 75,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const placeholder = fallbackSrc || '/images/food/tabsy-food-placeholder.svg'

  // If no src provided or error occurred, show fallback
  if (!src || imageError) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={placeholder}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
          priority={priority}
        />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading animation */}
      {imageLoading && showShimmer && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 z-10">
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: [-200, 400] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          {/* Rotating plate */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-5xl"
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              🍽️
            </motion.div>
          </div>
        </div>
      )}

      {/* Actual image with Next.js Image component */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        priority={priority}
        quality={quality}
      />
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
      src={src}
      alt={alt}
      className={className}
      showShimmer={true}
      fallbackSrc="/images/food/tabsy-food-placeholder.svg"
    />
  )
}