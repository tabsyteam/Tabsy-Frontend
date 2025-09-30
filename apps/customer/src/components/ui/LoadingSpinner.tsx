import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'current' | 'error' | 'info' | 'accent' | 'secondary'
  className?: string
  centered?: boolean
}

/**
 * Standard loading spinner component used across the customer app
 * Uses a consistent circular border animation for all loading states
 */
export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  className,
  centered = true
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-32 w-32'
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

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-b-2',
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

  if (centered) {
    return (
      <div className="flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}
