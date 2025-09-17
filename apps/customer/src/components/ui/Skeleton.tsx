import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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

// Enhanced Food-Themed Loading Animations
export function FoodLoadingAnimation() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative">
        {/* Cooking pot animation */}
        <motion.div
          className="w-20 h-16 bg-gradient-to-b from-gray-600 to-gray-800 rounded-b-2xl relative"
          animate={{ rotate: [0, -1, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Steam animation */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-6 bg-gradient-to-t from-gray-300 to-transparent rounded-full"
                style={{ left: `${i * 4 - 4}px` }}
                animate={{
                  y: [0, -15, 0],
                  opacity: [0, 0.7, 0],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              />
            ))}
          </div>

          {/* Lid */}
          <motion.div
            className="absolute -top-2 inset-x-0 h-3 bg-gradient-to-b from-gray-500 to-gray-600 rounded-full"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Loading text */}
        <motion.p
          className="text-center mt-6 text-lg font-medium text-content-primary"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Preparing your menu...
        </motion.p>

        {/* Floating food emojis */}
        <div className="absolute inset-0 pointer-events-none">
          {['🍕', '🍔', '🍝', '🥗', '🍜'].map((emoji, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{
                top: `${20 + i * 10}%`,
                left: `${10 + i * 15}%`,
              }}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 360],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.4
              }}
            >
              {emoji}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Enhanced Menu Item Skeleton with food theme
export function EnhancedMenuItemSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="card-modern rounded-3xl shadow-medium group overflow-hidden relative"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="p-8 relative">
        <div className="flex gap-8">
          {/* Enhanced Image Skeleton */}
          <div className="flex-shrink-0">
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: [-100, 300] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />

              {/* Food icon placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="text-4xl opacity-30"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🍽️
                </motion.div>
              </div>
            </div>
          </div>

          {/* Enhanced Content Skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <motion.div
                  className="h-7 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-3"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="h-5 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </div>

              <motion.div
                className="h-8 w-20 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
              />
            </div>

            {/* Description skeleton */}
            <div className="space-y-2 mb-6">
              <motion.div
                className="h-4 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="h-4 w-5/6 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              />
            </div>

            {/* Enhanced badges skeleton */}
            <div className="flex gap-2 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="h-6 w-16 bg-gradient-to-r from-green-100 to-green-200 rounded-full"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>

            {/* Enhanced button skeleton */}
            <div className="flex justify-end">
              <motion.div
                className="h-12 w-32 bg-gradient-to-r from-primary/30 to-accent/30 rounded-3xl"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [0.98, 1.02, 0.98]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            style={{
              top: `${20 + i * 20}%`,
              left: `${10 + i * 20}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              y: [0, -10, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// Enhanced Category Skeleton with food theme
export function EnhancedCategorySkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Enhanced Category Header */}
      <div className="mb-8">
        <div className="flex items-center gap-6 mb-6">
          {/* Category image skeleton */}
          <motion.div
            className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center overflow-hidden"
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="text-2xl opacity-40"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🍴
            </motion.div>

            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: [-50, 100] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <div className="flex-1">
            <motion.div
              className="h-8 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="h-5 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
          </div>
        </div>

        <motion.div
          className="w-24 h-1.5 bg-gradient-to-r from-primary/40 to-secondary/40 rounded-full"
          animate={{
            opacity: [0.5, 1, 0.5],
            scaleX: [0.8, 1.2, 0.8]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Enhanced Menu Items */}
      <div className="grid gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <EnhancedMenuItemSkeleton key={i} delay={i * 0.2} />
        ))}
      </div>
    </motion.div>
  )
}