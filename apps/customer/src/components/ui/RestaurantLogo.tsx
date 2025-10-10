'use client'

import { useState } from 'react'
import { Utensils } from 'lucide-react'

interface RestaurantLogoProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
}

const iconSizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
}

export function RestaurantLogo({
  src,
  alt,
  size = 'md',
  className = ''
}: RestaurantLogoProps) {
  const [imageError, setImageError] = useState(false)

  // If no src or image failed to load, show fallback
  if (!src || imageError) {
    return (
      <div
        className={`${sizeMap[size]} bg-primary/10 rounded-full flex items-center justify-center ${className}`}
        aria-label={`${alt} logo placeholder`}
      >
        <Utensils className={`${iconSizeMap[size]} text-primary`} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeMap[size]} rounded-full object-cover ${className}`}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  )
}
