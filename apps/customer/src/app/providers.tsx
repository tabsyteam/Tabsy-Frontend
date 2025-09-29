'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ApiProvider } from '@/components/providers/api-provider'
import { CartProvider } from '@/hooks/useCart'
import { NavigationProvider } from '@/components/providers/navigation-provider'
import { SessionReplacementHandler } from '@/components/session/SessionReplacementHandler'
import { WebSocketErrorBoundary } from '@/components/session/WebSocketErrorBoundary'

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

  // Define updateSessionData function - checking session storage for WebSocket auth data
  const updateSessionData = () => {
    if (typeof window === 'undefined') return

    try {
      // Get dining session data (primary source)
      const diningSessionStr = sessionStorage.getItem('tabsy-dining-session')
      const guestSessionId = sessionStorage.getItem('tabsy-guest-session-id')

      if (diningSessionStr) {
        const diningSession = JSON.parse(diningSessionStr)
        const newSessionData = {
          restaurantId: diningSession.restaurantId,
          tableId: diningSession.tableId,
          sessionId: guestSessionId || diningSession.sessionId
        }

        // Only update if session data actually changed
        if (!sessionData ||
            sessionData.restaurantId !== newSessionData.restaurantId ||
            sessionData.tableId !== newSessionData.tableId ||
            sessionData.sessionId !== newSessionData.sessionId) {
          setSessionData(newSessionData)
          console.log('[WebSocketWithSessionIntegration] Session data updated:', {
            restaurantId: newSessionData.restaurantId,
            tableId: newSessionData.tableId,
            hasSessionId: !!newSessionData.sessionId
          })
        }
      } else if (guestSessionId && (!sessionData || sessionData.sessionId !== guestSessionId)) {
        setSessionData({ sessionId: guestSessionId })
      } else if (!diningSessionStr && !guestSessionId && sessionData) {
        setSessionData(null)
      }
    } catch (error) {
      console.warn('[WebSocketWithSessionIntegration] Failed to parse session data:', error)
      setSessionData(null)
    }
  }

  // Monitor session storage for WebSocket auth data
  useEffect(() => {

    // Initial load
    updateSessionData()

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tabsy-dining-session' || e.key === 'tabsy-guest-session-id') {
        updateSessionData()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [sessionData])

  // Additional effect to check for session data when component mounts or updates
  // This helps with initial navigation timing issues
  useEffect(() => {
    const checkSessionDataPeriodically = () => {
      if (!sessionData) {
        updateSessionData()
      }
    }

    // Check immediately on mount
    checkSessionDataPeriodically()

    // Check periodically until we have session data (for up to 10 seconds)
    let attempts = 0
    const maxAttempts = 20 // 10 seconds with 500ms intervals
    const intervalId = setInterval(() => {
      if (!sessionData && attempts < maxAttempts) {
        console.log(`[WebSocketWithSessionIntegration] Retry ${attempts + 1}/${maxAttempts} checking for session data`)
        checkSessionDataPeriodically()
        attempts++
      } else {
        clearInterval(intervalId)
      }
    }, 500)

    return () => {
      clearInterval(intervalId)
    }
  }, [sessionData])

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
                <CartProvider>
                  <SessionReplacementHandler>
                    <NavigationProvider>
                      {children}
                      {/* Dev tools temporarily disabled due to type conflicts */}
                    </NavigationProvider>
                  </SessionReplacementHandler>
                </CartProvider>
              </WebSocketWithSessionIntegration>
            </WebSocketErrorBoundary>
          </ConnectionProvider>
        </ApiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
