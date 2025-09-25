'use client'

import { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'

interface OptimizedImageProps {
  src?: string
  alt: string
  className?: string
  fallbackIcon?: boolean
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  fallbackIcon = true,
  onError
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
    onError?.()
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  // If no src provided or error occurred, show fallback
  if (!src || imageError) {
    return (
      <div className={className}>
        <img
          src="/images/food/tabsy-food-placeholder.svg"
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/50 flex items-center justify-center">
          <div className="animate-pulse">
            {fallbackIcon && (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-300 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  )
}

// Specific component for menu item images
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
      fallbackIcon={true}
    />
  )
}