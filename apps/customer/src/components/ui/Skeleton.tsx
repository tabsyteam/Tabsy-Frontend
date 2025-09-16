import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
        className
      )}
      {...props}
    />
  )
}

// Menu Item Skeleton
export function MenuItemSkeleton() {
  return (
    <div className="bg-surface rounded-xl shadow-sm border p-4">
      <div className="flex gap-4">
        {/* Image Skeleton */}
        <div className="flex-shrink-0">
          <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>

          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4 mb-3" />

          {/* Dietary badges skeleton */}
          <div className="flex gap-1 mb-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Add to cart button skeleton */}
          <div className="flex justify-end">
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Menu Category Skeleton
export function MenuCategorySkeleton() {
  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div className="mb-4">
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-1 w-16 rounded-full" />
      </div>

      {/* Menu Items */}
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <MenuItemSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// Order Status Skeleton
export function OrderStatusSkeleton() {
  return (
    <div className="bg-surface rounded-xl border p-6">
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Progress bar skeleton */}
      <Skeleton className="h-2 w-full rounded-full mb-4" />

      {/* Time estimate */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

// Order Timeline Skeleton
export function OrderTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start space-x-4">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

// Order Summary Skeleton
export function OrderSummarySkeleton() {
  return (
    <div className="bg-surface rounded-xl border p-6">
      <Skeleton className="h-5 w-32 mb-4" />

      {/* Order items */}
      <div className="space-y-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  )
}

// Feedback Form Skeleton
export function FeedbackFormSkeleton() {
  return (
    <div className="space-y-8">
      {/* Overall rating skeleton */}
      <div className="bg-surface rounded-xl border p-6 text-center">
        <Skeleton className="h-6 w-48 mx-auto mb-4" />
        <div className="flex justify-center space-x-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-8" />
          ))}
        </div>
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>

      {/* Category ratings skeleton */}
      <div className="bg-surface rounded-xl border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex space-x-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="w-5 h-5" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick feedback skeleton */}
      <div className="bg-surface rounded-xl border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      </div>

      {/* Comment section skeleton */}
      <div className="bg-surface rounded-xl border p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-24 w-full rounded" />
      </div>
    </div>
  )
}

// Header Skeleton
export function HeaderSkeleton() {
  return (
    <div className="bg-surface shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-8 h-8" />
            <div>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-16 h-8" />
          </div>
        </div>
      </div>
    </div>
  )
}