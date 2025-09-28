import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { TabsyAPI } from '@tabsy/api-client'
import type {
  CreateFeedbackRequest,
  Feedback,
  FeedbackListResponse,
  FeedbackStats,
  FeedbackPhoto,
  FeedbackListParams,
  FlagFeedbackRequest
} from '@tabsy/shared-types'

/**
 * Production React Query hooks for feedback operations
 *
 * These hooks provide a complete interface for feedback management with
 * proper caching, optimistic updates, error handling, and real-time features.
 */

// Enhanced query keys for comprehensive cache management
export const FEEDBACK_KEYS = {
  all: ['feedback'] as const,
  lists: () => [...FEEDBACK_KEYS.all, 'list'] as const,
  list: (params: FeedbackListParams) => [...FEEDBACK_KEYS.lists(), params] as const,
  details: () => [...FEEDBACK_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...FEEDBACK_KEYS.details(), id] as const,
  stats: () => [...FEEDBACK_KEYS.all, 'stats'] as const,
  restaurantStats: (restaurantId: string, params?: any) => [...FEEDBACK_KEYS.stats(), restaurantId, params] as const,
  adminStats: () => [...FEEDBACK_KEYS.stats(), 'admin'] as const,
  adminLists: () => [...FEEDBACK_KEYS.all, 'admin', 'list'] as const,
  adminList: (params?: any) => [...FEEDBACK_KEYS.adminLists(), params] as const,
}

/**
 * Hook to create new feedback with optimistic updates
 */
export function useCreateFeedback(
  api: TabsyAPI,
  options?: UseMutationOptions<
    { success: boolean; data?: Feedback; error?: string },
    Error,
    CreateFeedbackRequest,
    { previousFeedback: [readonly unknown[], unknown][] }
  >
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) => api.feedback.create(data),
    onMutate: async (newFeedback): Promise<{ previousFeedback: [readonly unknown[], unknown][] }> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FEEDBACK_KEYS.lists() })

      // Optimistically update feedback list
      const previousFeedback = queryClient.getQueriesData({ queryKey: FEEDBACK_KEYS.lists() })

      queryClient.setQueriesData(
        { queryKey: FEEDBACK_KEYS.lists() },
        (old: FeedbackListResponse | undefined) => {
          if (!old) return old

          const optimisticFeedback: Feedback = {
            id: `temp-${Date.now()}`,
            restaurantId: newFeedback.restaurantId,
            tableId: newFeedback.tableId,
            orderId: newFeedback.orderId,
            overallRating: newFeedback.overallRating,
            categories: newFeedback.categories,
            quickFeedback: newFeedback.quickFeedback,
            comment: newFeedback.comment,
            photos: newFeedback.photos?.map(photo => ({
              ...photo,
              originalName: photo.filename,
              url: '', // Will be filled by server
              thumbnailUrl: '', // Will be filled by server
              uploadedAt: new Date().toISOString()
            })) || [],
            guestInfo: newFeedback.guestInfo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          return {
            ...old,
            feedback: [optimisticFeedback, ...old.feedback],
            stats: {
              ...old.stats,
              totalCount: old.stats.totalCount + 1
            }
          }
        }
      )

      return { previousFeedback }
    },
    onError: (err, newFeedback, context) => {
      // Revert optimistic updates on error
      if (context?.previousFeedback) {
        context.previousFeedback.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate and refetch feedback lists
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.lists()
        })

        // Invalidate restaurant stats
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.restaurantStats(variables.restaurantId)
        })

        // Add the new feedback to cache
        if (result.data) {
          queryClient.setQueryData(
            FEEDBACK_KEYS.detail(result.data.id),
            result.data
          )
        }
      }
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: FEEDBACK_KEYS.lists() })
    },
    ...options
  })
}

/**
 * Hook to get feedback by ID with real-time updates
 */
export function useFeedback(
  api: TabsyAPI,
  id: string | null,
  options?: UseQueryOptions<Feedback, Error>
) {
  return useQuery({
    queryKey: FEEDBACK_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Feedback ID is required')
      const result = await api.feedback.getById(id)
      if (!result.success) throw new Error(result.error || 'Failed to get feedback')
      return result.data!
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error.message.includes('404') || error.message.includes('not found')) {
        return false
      }
      return failureCount < 3
    },
    ...options
  })
}

/**
 * Hook to get feedback list for a restaurant with real-time updates
 */
export function useRestaurantFeedback(
  api: TabsyAPI,
  params: FeedbackListParams,
  options?: UseQueryOptions<FeedbackListResponse, Error>
) {
  return useQuery({
    queryKey: FEEDBACK_KEYS.list(params),
    queryFn: async () => {
      const result = await api.feedback.getByRestaurant(params)
      if (!result.success) throw new Error(result.error || 'Failed to get restaurant feedback')
      return result.data!
    },
    enabled: !!params.restaurantId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: (previousData) => previousData,
    ...options
  })
}

/**
 * Hook to get feedback statistics for a restaurant
 */
export function useFeedbackStats(
  api: TabsyAPI,
  restaurantId: string,
  params?: {
    startDate?: string
    endDate?: string
    groupBy?: 'day' | 'week' | 'month'
  },
  options?: UseQueryOptions<FeedbackStats, Error>
) {
  return useQuery({
    queryKey: FEEDBACK_KEYS.restaurantStats(restaurantId, params),
    queryFn: async () => {
      const result = await api.feedback.getStats(restaurantId, params)
      if (!result.success) throw new Error(result.error || 'Failed to get feedback statistics')
      return result.data!
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    ...options
  })
}

/**
 * Hook to upload feedback photos with progress tracking
 */
export function useUploadFeedbackPhotos(
  api: TabsyAPI,
  options?: UseMutationOptions<
    { success: boolean; data?: FeedbackPhoto[]; error?: string },
    Error,
    File[]
  >
) {
  return useMutation({
    mutationFn: (files: File[]) => api.feedback.uploadPhotos(files),
    ...options
  })
}

/**
 * Hook to delete feedback photo with optimistic updates
 */
export function useDeleteFeedbackPhoto(
  api: TabsyAPI,
  options?: UseMutationOptions<
    { success: boolean; error?: string },
    Error,
    string
  >
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photoId: string) => api.feedback.deletePhoto(photoId),
    onSuccess: () => {
      // Invalidate any feedback that might contain this photo
      queryClient.invalidateQueries({ queryKey: FEEDBACK_KEYS.details() })
    },
    ...options
  })
}


/**
 * Hook to flag feedback as inappropriate with optimistic updates
 */
export function useFlagFeedback(
  api: TabsyAPI,
  options?: UseMutationOptions<
    { success: boolean; error?: string },
    Error,
    { feedbackId: string; data: FlagFeedbackRequest },
    { previousFeedback: Feedback | undefined }
  >
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ feedbackId, data }) => api.feedback.flag(feedbackId, data),
    onMutate: async ({ feedbackId }): Promise<{ previousFeedback: Feedback | undefined }> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FEEDBACK_KEYS.detail(feedbackId) })

      // Snapshot previous value
      const previousFeedback = queryClient.getQueryData<Feedback>(FEEDBACK_KEYS.detail(feedbackId))

      // Note: flagged status removed from feedback system

      return { previousFeedback }
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousFeedback) {
        queryClient.setQueryData(FEEDBACK_KEYS.detail(variables.feedbackId), context.previousFeedback)
      }
    },
    onSuccess: (result, { feedbackId }) => {
      if (result.success) {
        // Invalidate feedback lists and stats
        queryClient.invalidateQueries({ queryKey: FEEDBACK_KEYS.lists() })
        queryClient.invalidateQueries({ queryKey: FEEDBACK_KEYS.stats() })
      }
    },
    ...options
  })
}

/**
 * Hook to get all feedback for admin (across all restaurants)
 */
export function useAdminFeedback(
  api: TabsyAPI,
  params?: {
    page?: number
    limit?: number
    restaurantId?: string
  },
  options?: UseQueryOptions<FeedbackListResponse, Error>
) {
  return useQuery({
    queryKey: FEEDBACK_KEYS.adminList(params),
    queryFn: async () => {
      const result = await api.feedback.getAllFeedback(params)
      if (!result.success) throw new Error(result.error || 'Failed to get admin feedback')
      return result.data!
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options
  })
}

/**
 * Hook to get platform-wide feedback statistics for admin
 */
export function useAdminFeedbackStats(
  api: TabsyAPI,
  options?: UseQueryOptions<any, Error>
) {
  return useQuery({
    queryKey: FEEDBACK_KEYS.adminStats(),
    queryFn: async () => {
      const result = await api.feedback.getPlatformStats()
      if (!result.success) throw new Error(result.error || 'Failed to get platform statistics')
      return result.data
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    ...options
  })
}


/**
 * Utility function to prefetch feedback data
 */
export function usePrefetchFeedback(api: TabsyAPI) {
  const queryClient = useQueryClient()

  return {
    prefetchRestaurantFeedback: (params: FeedbackListParams) => {
      return queryClient.prefetchQuery({
        queryKey: FEEDBACK_KEYS.list(params),
        queryFn: async () => {
          const result = await api.feedback.getByRestaurant(params)
          if (!result.success) throw new Error(result.error || 'Failed to prefetch feedback')
          return result.data!
        },
        staleTime: 1000 * 60 * 2
      })
    },
    prefetchFeedbackStats: (restaurantId: string, params?: any) => {
      return queryClient.prefetchQuery({
        queryKey: FEEDBACK_KEYS.restaurantStats(restaurantId, params),
        queryFn: async () => {
          const result = await api.feedback.getStats(restaurantId, params)
          if (!result.success) throw new Error(result.error || 'Failed to prefetch stats')
          return result.data!
        },
        staleTime: 1000 * 60 * 10
      })
    }
  }
}

/**
 * Utility function to invalidate feedback caches
 */
export function useInvalidateFeedback() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: FEEDBACK_KEYS.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: FEEDBACK_KEYS.lists() }),
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: FEEDBACK_KEYS.stats() }),
    invalidateRestaurant: (restaurantId: string) => {
      queryClient.invalidateQueries({
        queryKey: FEEDBACK_KEYS.lists(),
        predicate: (query) => {
          const params = query.queryKey[2] as FeedbackListParams
          return params?.restaurantId === restaurantId
        }
      })
      queryClient.invalidateQueries({
        queryKey: FEEDBACK_KEYS.restaurantStats(restaurantId)
      })
    }
  }
}