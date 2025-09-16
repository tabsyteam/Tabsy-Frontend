import { useEffect, useRef, useState, useCallback } from 'react'
import { haptics } from '@/lib/haptics'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number // Distance to trigger refresh (in pixels)
  resistance?: number // Resistance factor for pull distance
  enabled?: boolean
  refreshingThreshold?: number // Distance to show refreshing state
}

interface PullToRefreshState {
  isPulling: boolean
  pullDistance: number
  isRefreshing: boolean
  canRefresh: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
  refreshingThreshold = 60
}: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false
  })

  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const containerRef = useRef<HTMLElement | null>(null)
  const isScrollable = useRef<boolean>(false)

  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return false
    return containerRef.current.scrollTop === 0
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || state.isRefreshing) return

    isScrollable.current = checkScrollPosition()
    if (!isScrollable.current) return

    const touch = e.touches[0]
    if (!touch) return

    startY.current = touch.clientY
    currentY.current = startY.current
  }, [enabled, state.isRefreshing, checkScrollPosition])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || state.isRefreshing || !isScrollable.current) return

    const touch = e.touches[0]
    if (!touch) return

    currentY.current = touch.clientY
    const deltaY = currentY.current - startY.current

    if (deltaY > 0) {
      // Prevent default scroll when pulling down
      e.preventDefault()

      const pullDistance = Math.max(0, deltaY / resistance)
      const canRefresh = pullDistance >= threshold
      const isPulling = pullDistance > 10

      setState(prev => ({
        ...prev,
        isPulling,
        pullDistance,
        canRefresh
      }))

      // Haptic feedback when reaching threshold
      if (canRefresh && !state.canRefresh) {
        haptics.notification()
      }
    }
  }, [enabled, state.isRefreshing, state.canRefresh, resistance, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || state.isRefreshing || !isScrollable.current) return

    if (state.canRefresh && state.pullDistance >= threshold) {
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false
      }))

      haptics.refresh()

      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
        haptics.error()
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false
        }))
      }
    } else {
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false
      }))
    }

    isScrollable.current = false
  }, [enabled, state.isRefreshing, state.canRefresh, state.pullDistance, threshold, onRefresh])

  const bind = useCallback((element: HTMLElement | null) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('touchstart', handleTouchStart)
      containerRef.current.removeEventListener('touchmove', handleTouchMove)
      containerRef.current.removeEventListener('touchend', handleTouchEnd)
    }

    containerRef.current = element

    if (element && enabled) {
      element.addEventListener('touchstart', handleTouchStart, { passive: false })
      element.addEventListener('touchmove', handleTouchMove, { passive: false })
      element.addEventListener('touchend', handleTouchEnd, { passive: true })
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('touchstart', handleTouchStart)
        containerRef.current.removeEventListener('touchmove', handleTouchMove)
        containerRef.current.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    bind,
    ...state,
    progress: Math.min(state.pullDistance / threshold, 1)
  }
}

// Type definition for the indicator component props
export interface PullToRefreshIndicatorProps {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  canRefresh: boolean
  progress: number
}