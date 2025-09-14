import { useQuery, QueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

/**
 * A client-safe wrapper around useQuery that prevents SSR issues
 * Note: This version requires QueryClient to be passed in to avoid monorepo dependency issues
 */
export function useClientSafeQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options: any = {},
  queryClient?: QueryClient
) {
  // Use state to track client-side hydration
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Effect to set hydration state
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // Check if we're on the client side and hydrated
  const isClient = typeof window !== 'undefined' && isHydrated
  
  // Detailed debugging
  console.log('useClientSafeQuery - Detailed debugging:', {
    queryKey,
    isClient,
    isHydrated,
    hasQueryClient: !!queryClient,
    queryClientProvided: !!queryClient,
    windowExists: typeof window !== 'undefined'
  })

  // Return early if not on client or not hydrated
  if (!isClient || !isHydrated) {
    console.log('useClientSafeQuery - Not client/hydrated, returning fallback')
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve({} as any),
      isPending: false,
      isSuccess: false,
      isFetching: false,
      status: 'pending' as const
    }
  }

  // Return early if no QueryClient provided
  if (!queryClient) {
    console.log('useClientSafeQuery - No QueryClient provided, returning fallback')
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve({} as any),
      isPending: false,
      isSuccess: false,
      isFetching: false,
      status: 'pending' as const
    }
  }

  // Use the actual useQuery hook with provided QueryClient
  console.log('useClientSafeQuery - Using actual useQuery with provided QueryClient')
  return useQuery({
    queryKey,
    queryFn,
    ...options
  })
}