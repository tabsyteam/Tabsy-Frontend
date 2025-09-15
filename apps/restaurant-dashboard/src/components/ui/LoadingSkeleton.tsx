import { cn } from '@tabsy/ui-components'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'card' | 'text' | 'circle' | 'stat' | 'header'
  count?: number
}

function SkeletonElement({ className = '' }: { className?: string }) {
  return (
    <div className={cn("skeleton rounded-lg bg-muted/30", className)} />
  )
}

export function LoadingSkeleton({
  className = '',
  variant = 'card',
  count = 1
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-start space-x-4">
              <SkeletonElement className="h-12 w-12 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonElement className="h-5 w-3/4" />
                <SkeletonElement className="h-4 w-1/2" />
              </div>
              <div className="flex space-x-2">
                <SkeletonElement className="h-8 w-8 rounded-lg" />
                <SkeletonElement className="h-8 w-8 rounded-lg" />
                <SkeletonElement className="h-8 w-8 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <SkeletonElement className="h-3 w-full" />
              <SkeletonElement className="h-3 w-4/5" />
            </div>
            <div className="flex justify-between items-center">
              <SkeletonElement className="h-4 w-16" />
              <SkeletonElement className="h-4 w-20" />
            </div>
          </div>
        )

      case 'stat':
        return (
          <div className="stat-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <SkeletonElement className="h-4 w-24" />
                <SkeletonElement className="h-8 w-16" />
              </div>
              <SkeletonElement className="h-12 w-12 rounded-xl" />
            </div>
            <SkeletonElement className="h-3 w-20" />
          </div>
        )

      case 'header':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <SkeletonElement className="h-8 w-64" />
                <SkeletonElement className="h-4 w-96" />
              </div>
              <div className="flex space-x-3">
                <SkeletonElement className="h-10 w-24 rounded-lg" />
                <SkeletonElement className="h-10 w-32 rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="stat-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <SkeletonElement className="h-4 w-24" />
                      <SkeletonElement className="h-8 w-16" />
                    </div>
                    <SkeletonElement className="h-12 w-12 rounded-xl" />
                  </div>
                  <SkeletonElement className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        )

      case 'text':
        return (
          <div className="space-y-2">
            <SkeletonElement className="h-4 w-full" />
            <SkeletonElement className="h-4 w-4/5" />
            <SkeletonElement className="h-4 w-3/5" />
          </div>
        )

      case 'circle':
        return <SkeletonElement className="h-12 w-12 rounded-full" />

      default:
        return <SkeletonElement className="h-20 w-full" />
    }
  }

  if (count === 1) {
    return <div className={className}>{renderSkeleton()}</div>
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  )
}

// Specialized components for common use cases
export function MenuCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border p-6 space-y-4 menu-card-hover">
          <div className="flex items-start space-x-4">
            <SkeletonElement className="h-12 w-12 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonElement className="h-5 w-3/4" />
              <SkeletonElement className="h-4 w-1/2" />
            </div>
            <div className="flex space-x-2">
              <SkeletonElement className="h-8 w-8 rounded-lg" />
              <SkeletonElement className="h-8 w-8 rounded-lg" />
              <SkeletonElement className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonElement className="h-3 w-full" />
            <SkeletonElement className="h-3 w-4/5" />
          </div>
          <div className="flex justify-between items-center">
            <SkeletonElement className="h-4 w-16" />
            <SkeletonElement className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatisticsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat-card space-y-4 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonElement className="h-4 w-24" />
              <SkeletonElement className="h-8 w-16" />
            </div>
            <SkeletonElement className="h-12 w-12 rounded-xl" />
          </div>
          <div className="flex items-center space-x-2">
            <SkeletonElement className="h-3 w-3 rounded-full" />
            <SkeletonElement className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}