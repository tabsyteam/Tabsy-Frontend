'use client'

import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ApiProvider } from '@/components/providers/api-provider'
import { CartProvider } from '@/hooks/useCart'
import { NavigationProvider } from '@/components/providers/navigation-provider'

// NEW: Import unified providers for testing alongside existing ones
import { ConnectionProvider, WebSocketProvider, SessionProvider } from '@tabsy/ui-components'
import { tabsyClient } from '@tabsy/api-client'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time for better performance
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Cache time for offline support
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
})

// Inner provider that integrates with SessionProvider (Layer 3)
function WebSocketWithSessionIntegration({ children }: { children: React.ReactNode }) {
  const [sessionData, setSessionData] = useState<{
    restaurantId?: string
    tableId?: string
    sessionId?: string
  } | null>(null)

  // Monitor session storage for WebSocket auth data
  useEffect(() => {
    const updateSessionData = () => {
      if (typeof window === 'undefined') return

      try {
        // Get dining session data (primary source)
        const diningSessionStr = sessionStorage.getItem('tabsy-dining-session')
        const guestSessionId = sessionStorage.getItem('tabsy-guest-session-id')

        if (diningSessionStr) {
          const diningSession = JSON.parse(diningSessionStr)
          setSessionData({
            restaurantId: diningSession.restaurantId,
            tableId: diningSession.tableId,
            sessionId: guestSessionId || diningSession.sessionId
          })
          console.log('[WebSocketWithSessionIntegration] Updated session data from dining session:', {
            restaurantId: diningSession.restaurantId,
            tableId: diningSession.tableId,
            hasSessionId: !!(guestSessionId || diningSession.sessionId)
          })
        } else if (guestSessionId) {
          console.log('[WebSocketWithSessionIntegration] Only guest session available, waiting for dining session...')
          setSessionData({ sessionId: guestSessionId })
        } else {
          console.log('[WebSocketWithSessionIntegration] No session data found')
          setSessionData(null)
        }
      } catch (error) {
        console.warn('[WebSocketWithSessionIntegration] Failed to parse session data:', error)
        setSessionData(null)
      }
    }

    // Initial load
    updateSessionData()

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tabsy-dining-session' || e.key === 'tabsy-guest-session-id') {
        console.log('[WebSocketWithSessionIntegration] Session storage changed, updating WebSocket auth')
        updateSessionData()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Check periodically for same-tab updates
    const interval = setInterval(updateSessionData, 3000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Only connect if we have the required customer auth data
  const canConnect = sessionData?.sessionId && sessionData?.tableId && sessionData?.restaurantId

  return (
    <WebSocketProvider
      authToken={sessionData?.sessionId}
      restaurantId={sessionData?.restaurantId}
      tableId={sessionData?.tableId}
      namespace="customer"
      autoConnect={!!canConnect}
    >
      <SessionProvider>
        {children}
      </SessionProvider>
    </WebSocketProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <ConnectionProvider apiClient={tabsyClient}>
            <WebSocketWithSessionIntegration>
              <CartProvider>
                <NavigationProvider>
                  {children}
                  {/* Dev tools temporarily disabled due to type conflicts */}
                </NavigationProvider>
              </CartProvider>
            </WebSocketWithSessionIntegration>
          </ConnectionProvider>
        </ApiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
