/**
 * Centralized React Query configuration and query keys
 * Prevents duplicate API calls through proper caching and deduplication
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'

// Query key factory for consistent cache keys
export const queryKeys = {
  // Restaurant & Table
  tableInfo: (qrCode: string) => ['tableInfo', qrCode] as const,
  restaurant: (id: string) => ['restaurant', id] as const,
  table: (id: string) => ['table', id] as const,

  // Menu
  menu: (restaurantId: string) => ['menu', restaurantId] as const,
  menuCategories: (restaurantId: string) => ['menuCategories', restaurantId] as const,

  // Session
  guestSession: (qrCode: string, tableId: string) => ['guestSession', qrCode, tableId] as const,
  tableSession: (tableSessionId: string) => ['tableSession', tableSessionId] as const,
  tableSessionUsers: (tableSessionId: string) => ['tableSessionUsers', tableSessionId] as const,

  // Bill & Orders
  bill: (tableSessionId: string) => ['bill', tableSessionId] as const,
  orders: (guestSessionId: string) => ['orders', guestSessionId] as const,
  orderStatus: (orderId: string) => ['orderStatus', orderId] as const,
} as const

// Default query options with optimized caching
export const defaultQueryOptions = {
  // Cache for 5 minutes - prevents unnecessary refetches
  staleTime: 1000 * 60 * 5, // 5 minutes

  // Keep in cache for 30 minutes even if unused
  gcTime: 1000 * 60 * 30, // 30 minutes

  // Don't refetch on window focus for static data
  refetchOnWindowFocus: false,

  // Don't refetch on mount if we have cached data
  refetchOnMount: false,

  // Retry logic
  retry: (failureCount: number, error: any) => {
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false
    }
    // Retry up to 2 times for server errors
    return failureCount < 2
  },

  // Retry delay with exponential backoff
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} satisfies Partial<UseQueryOptions>

// Specific configurations for different data types
export const queryConfigs = {
  // Static data that rarely changes - cache aggressively
  static: {
    ...defaultQueryOptions,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  // Semi-static data (menu, restaurant info) - moderate caching
  semiStatic: {
    ...defaultQueryOptions,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  // PERFORMANCE OPTIMIZED: Real-time data (orders, bill)
  // Trust WebSocket invalidations instead of aggressive polling
  realtime: {
    ...defaultQueryOptions,
    staleTime: 1000 * 60 * 2, // 2 minutes (increased from 30s - WebSocket updates trigger invalidations)
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Still refetch on window focus (user might have stale data)
    refetchOnMount: false, // OPTIMIZED: Don't refetch if data is fresh (< 2 min old)
    refetchOnReconnect: true, // Refetch when network reconnects (recover from offline)
  },

  // Session data - cache but allow updates
  session: {
    ...defaultQueryOptions,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
} as const

/**
 * Helper to create a query with proper typing and defaults
 */
export function createQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>
) {
  return {
    ...defaultQueryOptions,
    ...options,
  }
}
