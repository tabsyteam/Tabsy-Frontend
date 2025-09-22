'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { AuthProvider, ToastProvider } from '@tabsy/ui-components'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ApiClientProvider } from './api-client-context'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { NotificationMuteProvider } from '@/contexts/NotificationMuteContext'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'

interface ClientProvidersProps {
  children: React.ReactNode
}

/**
 * Inner component that has access to auth context
 */
function InnerProviders({ children }: { children: React.ReactNode }) {
  const { restaurantId } = useCurrentRestaurant()

  return (
    <WebSocketProvider restaurantId={restaurantId} namespace="restaurant">
      <NotificationMuteProvider>
        <ThemeProvider variant="restaurant">
          <ToastProvider>
            {children as any}
          </ToastProvider>
        </ThemeProvider>
      </NotificationMuteProvider>
    </WebSocketProvider>
  )
}

/**
 * Client-side providers wrapper for React Query, Authentication, and Toast notifications
 * This component ensures proper hydration and client-side initialization
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  // Use the shared tabsyClient instance for consistency
  // This ensures the AuthProvider and menu hooks use the same client
  const apiClient = tabsyClient

  // PERFORMANCE: Remove excessive debug logging in production
  // Only log in development if needed for debugging
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PROVIDERS) {
    console.log('🔧 ClientProviders - Rendering with QueryClient:', {
      queryClient,
      hasQueryClient: !!queryClient,
      queryClientType: typeof queryClient,
      children: !!children
    })
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <AuthProvider apiClient={apiClient}>
          <InnerProviders>
            {children}
          </InnerProviders>
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  )
}