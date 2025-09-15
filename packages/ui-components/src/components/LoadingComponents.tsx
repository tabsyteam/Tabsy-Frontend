'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  className?: string
}

export function LoadingSpinner({ size = 'md', color = 'primary', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    white: 'text-white',
    gray: 'text-content-disabled'
  }

  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  )
}

interface LoadingStateProps {
  isLoading: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  overlay?: boolean
  className?: string
}

export function LoadingState({ 
  isLoading, 
  children, 
  fallback, 
  overlay = false, 
  className = '' 
}: LoadingStateProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" />
    </div>
  )

  if (overlay) {
    return (
      <div className={`relative ${className}`}>
        {children}
        <div className="absolute inset-0 bg-surface bg-opacity-75 flex items-center justify-center">
          {fallback || defaultFallback}
        </div>
      </div>
    )
  }

  return <>{fallback || defaultFallback}</>
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean
  loadingText?: string
  children: React.ReactNode
}

export function LoadingButton({ 
  isLoading, 
  loadingText = 'Loading...', 
  children, 
  disabled,
  className = '',
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {isLoading && <LoadingSpinner size="sm" color="white" className="mr-2" />}
      {isLoading ? loadingText : children}
    </button>
  )
}

interface LoadingSkeletonProps {
  lines?: number
  className?: string
  variant?: 'text' | 'rect' | 'circle'
  width?: string
  height?: string
}

export function LoadingSkeleton({ 
  lines = 1, 
  className = '', 
  variant = 'text',
  width,
  height 
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-surface-tertiary rounded'
  
  const variantClasses = {
    text: 'h-4',
    rect: 'h-20',
    circle: 'rounded-full w-10 h-10'
  }

  const style = {
    width,
    height: variant !== 'circle' ? height : undefined
  }

  if (lines === 1) {
    return (
      <div 
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
      />
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i}
          className={`${baseClasses} ${variantClasses[variant]}`}
          style={i === lines - 1 ? { ...style, width: '80%' } : style}
        />
      ))}
    </div>
  )
}

interface LoadingCardProps {
  className?: string
}

export function LoadingCard({ className = '' }: LoadingCardProps) {
  return (
    <div className={`bg-surface p-6 rounded-lg border ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center space-x-4 mb-4">
          <LoadingSkeleton variant="circle" />
          <div className="flex-1">
            <LoadingSkeleton width="60%" className="mb-2" />
            <LoadingSkeleton width="40%" />
          </div>
        </div>
        <LoadingSkeleton lines={3} className="mb-4" />
        <div className="flex space-x-2">
          <LoadingSkeleton variant="rect" width="80px" height="32px" />
          <LoadingSkeleton variant="rect" width="80px" height="32px" />
        </div>
      </div>
    </div>
  )
}

interface LoadingTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function LoadingTable({ rows = 5, columns = 4, className = '' }: LoadingTableProps) {
  return (
    <div className={`bg-surface rounded-lg border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-background px-6 py-3 border-b">
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, i) => (
            <LoadingSkeleton key={i} width="100px" className="flex-1" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-border-tertiary">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }, (_, j) => (
                <LoadingSkeleton key={j} width="80px" className="flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}