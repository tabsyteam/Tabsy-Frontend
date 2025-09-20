import { TabsyApiClient } from '../client'
import { z } from 'zod'
import { serializeQueryParams, createFilterParams } from '@tabsy/shared-utils'

/**
 * Feedback API endpoint for customer feedback and reviews
 */

// Validation schemas
const FeedbackPhotoSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string().optional()
})

const CreateFeedbackRequestSchema = z.object({
  orderId: z.string().optional(),
  restaurantId: z.string(),
  tableId: z.string().optional(),
  overallRating: z.number().min(1).max(5),
  categories: z.record(z.number().min(0).max(5)),
  quickFeedback: z.array(z.string()),
  comment: z.string().optional(),
  photos: z.array(FeedbackPhotoSchema).optional(),
  guestInfo: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional()
  }).optional()
})

const FeedbackResponseSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  restaurantId: z.string(),
  tableId: z.string().nullable(),
  overallRating: z.number(),
  categories: z.record(z.number()),
  quickFeedback: z.array(z.string()),
  comment: z.string().nullable(),
  photos: z.array(FeedbackPhotoSchema),
  guestInfo: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable()
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  restaurantResponse: z.object({
    message: z.string(),
    respondedAt: z.string(),
    respondedBy: z.string()
  }).optional()
})

const FeedbackListResponseSchema = z.object({
  feedbacks: z.array(FeedbackResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  }),
  averageRating: z.number(),
  totalFeedbacks: z.number()
})

const FeedbackStatsResponseSchema = z.object({
  totalFeedbacks: z.number(),
  averageRating: z.number(),
  ratingDistribution: z.record(z.number()),
  categoryAverages: z.record(z.number()),
  recentTrends: z.object({
    thisWeek: z.number(),
    lastWeek: z.number(),
    change: z.number()
  })
})

// Type definitions
export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequestSchema>
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>
export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>
export type FeedbackStatsResponse = z.infer<typeof FeedbackStatsResponseSchema>
export type FeedbackPhoto = z.infer<typeof FeedbackPhotoSchema>

export interface FeedbackListParams {
  restaurantId: string
  page?: number
  limit?: number
  rating?: number
  startDate?: string
  endDate?: string
  hasComment?: boolean
  orderBy?: 'createdAt' | 'rating'
  order?: 'asc' | 'desc'
}

export class FeedbackAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * Create new feedback for an order or general restaurant experience
   */
  async create(data: CreateFeedbackRequest): Promise<{
    success: boolean
    data?: FeedbackResponse
    error?: string
  }> {
    try {
      // Validate request data
      const validatedData = CreateFeedbackRequestSchema.parse(data)

      const response = await this.client.post<FeedbackResponse>('/feedback', validatedData)

      return {
        success: true,
        data: FeedbackResponseSchema.parse(response)
      }
    } catch (error) {
      console.error('Create feedback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create feedback'
      }
    }
  }

  /**
   * Get feedback by ID
   */
  async getById(id: string): Promise<{
    success: boolean
    data?: FeedbackResponse
    error?: string
  }> {
    try {
      const response = await this.client.get<FeedbackResponse>(`/feedback/${id}`)

      return {
        success: true,
        data: FeedbackResponseSchema.parse(response)
      }
    } catch (error) {
      console.error('Get feedback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get feedback'
      }
    }
  }

  /**
   * Get all feedback for a restaurant with pagination and filters
   */
  async getByRestaurant(params: FeedbackListParams): Promise<{
    success: boolean
    data?: FeedbackListResponse
    error?: string
  }> {
    try {
      const queryParams = serializeQueryParams(createFilterParams(params))

      const response = await this.client.get<FeedbackListResponse>(`/feedback?${queryParams}`)

      return {
        success: true,
        data: FeedbackListResponseSchema.parse(response)
      }
    } catch (error) {
      console.error('Get restaurant feedback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get restaurant feedback'
      }
    }
  }

  /**
   * Get feedback statistics for a restaurant
   */
  async getStats(restaurantId: string, period?: 'week' | 'month' | 'quarter' | 'year'): Promise<{
    success: boolean
    data?: FeedbackStatsResponse
    error?: string
  }> {
    try {
      const queryParams = serializeQueryParams({ restaurantId, period })

      const response = await this.client.get<FeedbackStatsResponse>(`/feedback/stats?${queryParams}`)

      return {
        success: true,
        data: FeedbackStatsResponseSchema.parse(response)
      }
    } catch (error) {
      console.error('Get feedback stats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get feedback stats'
      }
    }
  }

  /**
   * Upload feedback photos
   */
  async uploadPhotos(files: File[]): Promise<{
    success: boolean
    data?: FeedbackPhoto[]
    error?: string
  }> {
    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`photos[${index}]`, file)
      })

      const response = await this.client.postFormData<{ photos: FeedbackPhoto[] }>('/feedback/upload-photos', formData)

      return {
        success: true,
        data: response.photos
      }
    } catch (error) {
      console.error('Upload feedback photos error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload photos'
      }
    }
  }

  /**
   * Delete feedback photo
   */
  async deletePhoto(photoId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await this.client.delete(`/feedback/photos/${photoId}`)

      return {
        success: true
      }
    } catch (error) {
      console.error('Delete feedback photo error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete photo'
      }
    }
  }

  /**
   * Respond to feedback (restaurant staff only)
   */
  async respond(feedbackId: string, message: string): Promise<{
    success: boolean
    data?: FeedbackResponse
    error?: string
  }> {
    try {
      const response = await this.client.post<FeedbackResponse>(`/feedback/${feedbackId}/respond`, {
        message
      })

      return {
        success: true,
        data: FeedbackResponseSchema.parse(response)
      }
    } catch (error) {
      console.error('Respond to feedback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to respond to feedback'
      }
    }
  }

  /**
   * Flag feedback as inappropriate (moderation)
   */
  async flag(feedbackId: string, reason: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await this.client.post(`/feedback/${feedbackId}/flag`, {
        reason
      })

      return {
        success: true
      }
    } catch (error) {
      console.error('Flag feedback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to flag feedback'
      }
    }
  }
}