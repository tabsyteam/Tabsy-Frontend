'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ApiProvider } from '@/components/providers/api-provider'
import { CartProvider } from '@/hooks/useCart'
import { NavigationProvider } from '@/components/providers/navigation-provider'
import { SessionReplacementHandler } from '@/components/session/SessionReplacementHandler'
import { WebSocketErrorBoundary } from '@/components/session/WebSocketErrorBoundary'
import { WebSocketEventCoordinator } from '@/providers/WebSocketEventCoordinator'
import { GlobalRestaurantProvider } from '@/providers/GlobalRestaurantProvider'

// NEW: Import unified providers for testing alongside existing ones
import { ConnectionProvider, WebSocketProvider, SessionProvider } from '@tabsy/ui-components'
import { tabsyClient } from '@tabsy/api-client'
import { unifiedSessionStorage } from '@/lib/unifiedSessionStorage'

// Create a client with optimized defaults to prevent duplicate API calls
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // CRITICAL: Prevent duplicate fetches by caching aggressively
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh, won't refetch

      // Keep in cache for 30 minutes even if unused
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)

      // IMPORTANT: Don't refetch on window focus by default
      // Individual hooks can override this for real-time data
      refetchOnWindowFocus: false,

      // Don't refetch on mount if we have cached data
      refetchOnMount: false,

      // Retry failed requests with smart logic
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // Retry up to 2 times for server errors (reduced from 3)
        return failureCount < 2
      },

      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network mode - fail fast on offline
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
})

// Inner provider that integrates with SessionProvider (Layer 3)
function WebSocketWithSessionIntegration({ children }: { children: React.ReactNode }) {
  // Use lazy initialization to prevent SSR hydration mismatch
  // This ensures the initial state is consistent between server and client
  const [sessionData, setSessionData] = useState<{
    restaurantId?: string
    tableId?: string
    sessionId?: string
  } | null>(() => {
    // On server, return null
    if (typeof window === 'undefined') return null

    // On client, try to get session from storage
    try {
      const unifiedSession = unifiedSessionStorage.getSession()
      if (unifiedSession) {
        return {
          restaurantId: unifiedSession.restaurantId,
          tableId: unifiedSession.tableId,
          sessionId: unifiedSession.guestSessionId
        }
      }
    } catch (error) {
      console.warn('[WebSocketWithSessionIntegration] Failed to get initial session data:', error)
    }

    return null
  })

  // Define updateSessionData function - checking session storage for WebSocket auth data
  const updateSessionData = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      // FIXED: Use unifiedSessionStorage instead of direct sessionStorage access
      const unifiedSession = unifiedSessionStorage.getSession()

      if (unifiedSession) {
        const newSessionData = {
          restaurantId: unifiedSession.restaurantId,
          tableId: unifiedSession.tableId,
          sessionId: unifiedSession.guestSessionId
        }

        // Only update if session data actually changed
        setSessionData(prevSessionData => {
          if (!prevSessionData ||
              prevSessionData.restaurantId !== newSessionData.restaurantId ||
              prevSessionData.tableId !== newSessionData.tableId ||
              prevSessionData.sessionId !== newSessionData.sessionId) {
            console.log('[WebSocketWithSessionIntegration] Session data updated from unified storage:', {
              restaurantId: newSessionData.restaurantId,
              tableId: newSessionData.tableId,
              hasSessionId: !!newSessionData.sessionId,
              guestSessionId: newSessionData.sessionId
            })
            return newSessionData
          }
          return prevSessionData
        })
      } else {
        // No unified session found
        setSessionData(prevSessionData => {
          if (prevSessionData) {
            console.log('[WebSocketWithSessionIntegration] No unified session found, clearing session data')
            return null
          }
          return prevSessionData
        })
      }
    } catch (error) {
      console.warn('[WebSocketWithSessionIntegration] Failed to get session data:', error)
      setSessionData(null)
    }
  }, []) // Remove sessionData dependency to fix stale closure issue

  // Monitor session storage for WebSocket auth data
  useEffect(() => {

    // Initial load
    updateSessionData()

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      // FIXED: Listen for unified session key changes
      if (e.key === 'tabsy-session' || e.key === 'tabsy-guest-session-id') {
        console.log('[WebSocketWithSessionIntegration] Unified session storage changed, updating session data')
        updateSessionData()
      }
    }

    // Listen for visibility change (tab becomes active)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[WebSocketWithSessionIntegration] Tab became visible, refreshing session')
        updateSessionData()
      }
    }

    // Listen for window focus
    const handleFocus = () => {
      console.log('[WebSocketWithSessionIntegration] Window focused, refreshing session')
      updateSessionData()
    }

    window.addEventListener('storage', handleStorageChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [updateSessionData])

  // Additional effect to check for session data when component mounts or updates
  // This helps with initial navigation timing issues
  useEffect(() => {
    // Check immediately on mount only
    if (!sessionData) {
      updateSessionData()
    }

    // REMOVED: Periodic 500ms polling for up to 10 seconds
    // Container deployment optimization: Prevents wasteful CPU usage during initialization
    // Session data is now populated via:
    // 1. Initial check on mount (above)
    // 2. Storage event listeners (already set up in parent effect)
    // 3. Visibility/focus event listeners (already set up in parent effect)
    //
    // The event-driven approach is more efficient and responsive than polling
  }, [sessionData, updateSessionData])

  // Only connect if we have the required customer auth data
  const canConnect = sessionData?.sessionId && sessionData?.tableId && sessionData?.restaurantId

  // Debug: Log session data and connection readiness
  console.log('🔍 [WebSocketWithSessionIntegration] Current state:', {
    sessionData,
    canConnect,
    authToken: sessionData?.sessionId,
    restaurantId: sessionData?.restaurantId,
    tableId: sessionData?.tableId
  })

  return (
    <WebSocketProvider
      url={process.env.NEXT_PUBLIC_WS_BASE_URL}
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
            <WebSocketErrorBoundary>
              <WebSocketWithSessionIntegration>
                {/* 🎯 Centralized WebSocket Event Coordinator */}
                {/* This is the ONLY place where global events are listened to */}
                {/* All components read from React Query cache instead of listening directly */}
                <WebSocketEventCoordinator>
                  {/* 🌍 Global Restaurant Context - Provides currency and restaurant data to all components */}
                  <GlobalRestaurantProvider>
                    <CartProvider>
                      <SessionReplacementHandler>
                        <NavigationProvider>
                          {children}
                          {/* Dev tools temporarily disabled due to type conflicts */}
                        </NavigationProvider>
                      </SessionReplacementHandler>
                    </CartProvider>
                  </GlobalRestaurantProvider>
                </WebSocketEventCoordinator>
              </WebSocketWithSessionIntegration>
            </WebSocketErrorBoundary>
          </ConnectionProvider>
        </ApiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
