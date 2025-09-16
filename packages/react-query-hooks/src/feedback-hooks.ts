import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI, CreateFeedbackRequest, FeedbackListParams } from '@tabsy/api-client'

export const FEEDBACK_KEYS = {
  all: ['feedback'] as const,
  lists: () => [...FEEDBACK_KEYS.all, 'list'] as const,
  list: (params: FeedbackListParams) => [...FEEDBACK_KEYS.lists(), params] as const,
  details: () => [...FEEDBACK_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...FEEDBACK_KEYS.details(), id] as const,
  stats: () => [...FEEDBACK_KEYS.all, 'stats'] as const,
  restaurantStats: (restaurantId: string, period?: string) => [...FEEDBACK_KEYS.stats(), restaurantId, period] as const,
}

/**
 * Hook to create new feedback
 */
export function useCreateFeedback(api: TabsyAPI) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) => api.feedback.create(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate feedback lists for the restaurant
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.lists()
        })

        // Invalidate restaurant stats
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.restaurantStats(variables.restaurantId)
        })
      }
    }
  })
}

/**
 * Hook to get feedback by ID
 */
export function useFeedback(api: TabsyAPI, id: string | null) {
  return useQuery({
    queryKey: FEEDBACK_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Feedback ID is required')
      const result = await api.feedback.getById(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!id
  })
}

/**
 * Hook to get feedback list for a restaurant
 */
export function useRestaurantFeedback(api: TabsyAPI, params: FeedbackListParams) {
  return useQuery({
    queryKey: FEEDBACK_KEYS.list(params),
    queryFn: async () => {
      const result = await api.feedback.getByRestaurant(params)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!params.restaurantId
  })
}

/**
 * Hook to get feedback statistics for a restaurant
 */
export function useFeedbackStats(api: TabsyAPI, restaurantId: string, period?: 'week' | 'month' | 'quarter' | 'year') {
  return useQuery({
    queryKey: FEEDBACK_KEYS.restaurantStats(restaurantId, period),
    queryFn: async () => {
      const result = await api.feedback.getStats(restaurantId, period)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!restaurantId
  })
}

/**
 * Hook to upload feedback photos
 */
export function useUploadFeedbackPhotos(api: TabsyAPI) {
  return useMutation({
    mutationFn: (files: File[]) => api.feedback.uploadPhotos(files)
  })
}

/**
 * Hook to delete feedback photo
 */
export function useDeleteFeedbackPhoto(api: TabsyAPI) {
  return useMutation({
    mutationFn: (photoId: string) => api.feedback.deletePhoto(photoId)
  })
}

/**
 * Hook to respond to feedback (restaurant staff)
 */
export function useRespondToFeedback(api: TabsyAPI) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ feedbackId, message }: { feedbackId: string; message: string }) =>
      api.feedback.respond(feedbackId, message),
    onSuccess: (result, { feedbackId }) => {
      if (result.success) {
        // Invalidate the specific feedback detail
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.detail(feedbackId)
        })

        // Invalidate feedback lists
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.lists()
        })
      }
    }
  })
}

/**
 * Hook to flag feedback as inappropriate
 */
export function useFlagFeedback(api: TabsyAPI) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ feedbackId, reason }: { feedbackId: string; reason: string }) =>
      api.feedback.flag(feedbackId, reason),
    onSuccess: (result, { feedbackId }) => {
      if (result.success) {
        // Invalidate the specific feedback detail
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.detail(feedbackId)
        })

        // Invalidate feedback lists
        queryClient.invalidateQueries({
          queryKey: FEEDBACK_KEYS.lists()
        })
      }
    }
  })
}