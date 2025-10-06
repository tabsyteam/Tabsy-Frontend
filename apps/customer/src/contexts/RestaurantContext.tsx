'use client'

import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import type { Restaurant, Table } from '@tabsy/shared-types'

interface RestaurantContextValue {
  restaurant: Restaurant | null
  table: Table | null
  currency: string
  isLoading: boolean
}

const RestaurantContext = createContext<RestaurantContextValue | undefined>(undefined)

export interface RestaurantProviderProps {
  children: ReactNode
  restaurant: Restaurant | null
  table: Table | null
  isLoading?: boolean
}

/**
 * RestaurantProvider - Provides restaurant data including currency to all components
 *
 * This context ensures all price displays throughout the app use the correct
 * currency symbol based on the restaurant's configuration (USD, AED, INR, etc.)
 *
 * IMPORTANT: When restaurant data is loading, it tries to use cached currency
 * from sessionStorage to prevent showing "$" (USD) as a flash before correct currency loads
 */
export function RestaurantProvider({
  children,
  restaurant,
  table,
  isLoading = false
}: RestaurantProviderProps) {
  const value: RestaurantContextValue = useMemo(() => {
    // Get currency from restaurant data, or fallback to cached value
    let currency = restaurant?.currency || 'USD'

    // If no restaurant data yet (e.g., on page refresh), try to get cached currency
    if (!restaurant && typeof window !== 'undefined') {
      try {
        const qrAccessData = sessionStorage.getItem('tabsy-qr-access')
        if (qrAccessData) {
          const parsed = JSON.parse(qrAccessData)
          if (parsed.restaurant?.currency) {
            currency = parsed.restaurant.currency
          }
        }
      } catch (error) {
        // Silently ignore, will use USD default
      }
    }

    console.log('[RestaurantProvider] 🎯 SIMPLE:', {
      hasRestaurant: !!restaurant,
      currency,
      isLoading
    })

    return {
      restaurant,
      table,
      currency,
      isLoading
    }
  }, [restaurant, table, isLoading])

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  )
}

/**
 * useRestaurant - Hook to access restaurant data and currency
 *
 * @example
 * const { currency, restaurant } = useRestaurant()
 * const formattedPrice = formatCurrency(price, currency)
 */
export function useRestaurant() {
  const context = useContext(RestaurantContext)

  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider')
  }

  return context
}

/**
 * useRestaurantOptional - Hook that doesn't throw if outside provider
 * Useful for components that may or may not be within RestaurantProvider
 */
export function useRestaurantOptional() {
  return useContext(RestaurantContext)
}
