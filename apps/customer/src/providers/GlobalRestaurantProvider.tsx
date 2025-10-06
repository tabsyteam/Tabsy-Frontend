'use client'

import { ReactNode, Suspense, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { RestaurantProvider } from '@/contexts/RestaurantContext'
import { useApi } from '@/components/providers/api-provider'
import { STORAGE_KEYS } from '@/constants/storage'
import type { Restaurant, Table } from '@tabsy/shared-types'

interface GlobalRestaurantProviderProps {
  children: ReactNode
}

/**
 * Hook to get IDs from search params (must be used within Suspense)
 * This is separated to satisfy Next.js requirement for useSearchParams
 */
function useSearchParamIds() {
  const searchParams = useSearchParams()

  return useMemo(() => ({
    restaurantId: searchParams?.get('restaurant') || null,
    tableId: searchParams?.get('table') || null,
  }), [searchParams])
}

/**
 * Inner provider that uses search params (wrapped in Suspense)
 */
function GlobalRestaurantProviderInner({ children }: GlobalRestaurantProviderProps) {
  const { api } = useApi()
  const params = useParams()

  // Get IDs from search params (client-side only, wrapped in Suspense)
  const searchParamIds = useSearchParamIds()

  // Get IDs from multiple sources (priority: path params → query params → sessionStorage)
  // CRITICAL: Write to sessionStorage SYNCHRONOUSLY as we resolve IDs (not in useEffect)
  const restaurantId = useMemo(() => {
    const id = (params?.restaurantId as string) ||
      searchParamIds.restaurantId ||
      (typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.RESTAURANT_ID) : null)

    // SYNCHRONOUS write: persist immediately when we have an ID from any source
    if (typeof window !== 'undefined' && id && id !== sessionStorage.getItem(STORAGE_KEYS.RESTAURANT_ID)) {
      sessionStorage.setItem(STORAGE_KEYS.RESTAURANT_ID, id)
      console.log('[GlobalRestaurantProvider] ⚡ SYNC persisted restaurantId:', id)
    }

    return id
  }, [params?.restaurantId, searchParamIds.restaurantId])

  const tableId = useMemo(() => {
    const id = (params?.tableId as string) ||
      searchParamIds.tableId ||
      (typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.TABLE_ID) : null)

    // SYNCHRONOUS write: persist immediately when we have an ID from any source
    if (typeof window !== 'undefined' && id && id !== sessionStorage.getItem(STORAGE_KEYS.TABLE_ID)) {
      sessionStorage.setItem(STORAGE_KEYS.TABLE_ID, id)
      console.log('[GlobalRestaurantProvider] ⚡ SYNC persisted tableId:', id)
    }

    return id
  }, [params?.tableId, searchParamIds.tableId])

  // PRIMARY DATA SOURCE: React Query fetches from API
  // IMPORTANT: Must come BEFORE useEffects that depend on the data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null
      const response = await api.restaurants.get(restaurantId)
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000, // 10 minutes - restaurant data is semi-static
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })

  const { data: table, isLoading: tableLoading } = useQuery<Table>({
    queryKey: ['table', tableId],
    queryFn: async () => {
      if (!tableId) return null
      const response = await api.tables.get(tableId)
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    enabled: !!tableId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  })

  // CRITICAL: When restaurant data loads, cache it with currency for fallback
  // IDs are already persisted synchronously in useMemo above
  useEffect(() => {
    if (typeof window === 'undefined' || !restaurant) return

    try {
      const qrAccessData = sessionStorage.getItem('tabsy-qr-access')
      let updatedQrAccess: any = qrAccessData ? JSON.parse(qrAccessData) : {}

      // Update with full restaurant currency info
      updatedQrAccess.restaurant = {
        ...updatedQrAccess.restaurant,
        id: restaurant.id,
        name: restaurant.name,
        currency: restaurant.currency  // CRITICAL for fallback
      }

      sessionStorage.setItem('tabsy-qr-access', JSON.stringify(updatedQrAccess))
      console.log('[GlobalRestaurantProvider] Cached restaurant currency:', restaurant.currency)
    } catch (error) {
      console.warn('[GlobalRestaurantProvider] Failed to cache restaurant data:', error)
    }
  }, [restaurant])

  const isLoading = restaurantLoading || tableLoading

  return (
    <RestaurantProvider
      restaurant={restaurant || null}
      table={table || null}
      isLoading={isLoading}
    >
      {children}
    </RestaurantProvider>
  )
}

/**
 * Fallback provider for SSR - uses only path params and sessionStorage
 * No useSearchParams here to avoid Suspense requirement
 */
function GlobalRestaurantProviderFallback({ children }: GlobalRestaurantProviderProps) {
  const { api } = useApi()
  const params = useParams()

  // SSR/Fallback: Only use path params and sessionStorage (no query params)
  const restaurantId = (params?.restaurantId as string) ||
    (typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.RESTAURANT_ID) : null)

  const tableId = (params?.tableId as string) ||
    (typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.TABLE_ID) : null)

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null
      const response = await api.restaurants.get(restaurantId)
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: table, isLoading: tableLoading } = useQuery<Table>({
    queryKey: ['table', tableId],
    queryFn: async () => {
      if (!tableId) return null
      const response = await api.tables.get(tableId)
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    enabled: !!tableId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const isLoading = restaurantLoading || tableLoading

  return (
    <RestaurantProvider
      restaurant={restaurant || null}
      table={table || null}
      isLoading={isLoading}
    >
      {children}
    </RestaurantProvider>
  )
}

/**
 * GlobalRestaurantProvider - Provides restaurant data via React Query
 *
 * Architecture:
 * 1. PRIMARY: Fetches from API using React Query (single source of truth)
 * 2. ID SOURCES: Supports multiple ways to get restaurant/table IDs (priority order):
 *    a. Path params (e.g., /r/[restaurantId]/t/[tableId])
 *    b. Query params (e.g., /menu?restaurant=X&table=Y)
 *    c. sessionStorage (page refresh recovery)
 * 3. REAL-TIME: WebSocket events update React Query cache automatically
 *
 * Data Flow:
 *   Server (API) → React Query Cache → React Components
 *        ↓                                    ↑
 *   sessionStorage (IDs only)        WebSocket Events
 *
 * Benefits:
 * - Server is source of truth
 * - Supports all navigation patterns in the app
 * - No race conditions or sync issues
 * - Automatic reactivity via React Query
 * - Real-time updates via WebSocket
 * - sessionStorage only for page refresh recovery
 *
 * Note: Wrapped in Suspense to satisfy Next.js useSearchParams() requirement
 * Fallback uses sessionStorage + path params until query params are available
 */
export function GlobalRestaurantProvider({ children }: GlobalRestaurantProviderProps) {
  return (
    <Suspense fallback={<GlobalRestaurantProviderFallback>{children}</GlobalRestaurantProviderFallback>}>
      <GlobalRestaurantProviderInner>
        {children}
      </GlobalRestaurantProviderInner>
    </Suspense>
  )
}
