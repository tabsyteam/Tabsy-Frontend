'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ApiProvider } from '@/components/providers/api-provider'

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
          {children}
          {/* Dev tools temporarily disabled due to type conflicts */}
        </ApiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
