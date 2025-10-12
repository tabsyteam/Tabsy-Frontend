import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'current' | 'error' | 'info' | 'accent' | 'secondary'
  className?: string
  centered?: boolean
  variant?: 'spinner' | 'dots' | 'pulse'
}

/**
 * Modern loading spinner component used across the customer app
 * Supports multiple variants: spinner (circular), dots (three dots), pulse (simple fade)
 * Use 'spinner' for general loading, 'dots' for inline text, 'pulse' for subtle states
 */
export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  className,
  centered = true,
  variant = 'spinner'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-16 w-16'
  }

  const dotSizeClasses = {
    xs: 'h-1 w-1',
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
    xl: 'h-3 w-3'
  }

  const colorClasses = {
    primary: 'border-primary',
    white: 'border-white',
    current: 'border-current',
    error: 'border-status-error',
    info: 'border-status-info',
    accent: 'border-accent',
    secondary: 'border-secondary'
  }

  const dotColorClasses = {
    primary: 'bg-primary',
    white: 'bg-white',
    current: 'bg-current',
    error: 'bg-status-error',
    info: 'bg-status-info',
    accent: 'bg-accent',
    secondary: 'bg-secondary'
  }

  let spinner: React.ReactNode

  if (variant === 'dots') {
    // Three bouncing dots - perfect for inline "Processing..." text
    spinner = (
      <div className="flex items-center space-x-1" role="status" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full animate-bounce',
              dotSizeClasses[size],
              dotColorClasses[color]
            )}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    )
  } else if (variant === 'pulse') {
    // Simple pulsing circle - subtle for backgrounds
    spinner = (
      <div
        className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size],
          dotColorClasses[color],
          className
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    )
  } else {
    // Default circular spinner with gradient effect
    spinner = (
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-transparent',
          sizeClasses[size],
          colorClasses[color],
          className
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  if (centered) {
    return (
      <div className="flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return <>{spinner}</>
}
