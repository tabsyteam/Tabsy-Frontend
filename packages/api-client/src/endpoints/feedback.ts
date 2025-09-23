import { TabsyApiClient } from '../client'
import { z } from 'zod'
import { serializeQueryParams, createFilterParams } from '@tabsy/shared-utils'
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
 * Production Feedback API Client
 *
 * This client handles all feedback-related API calls with proper error handling,
 * validation, and type safety. It integrates with the main Tabsy backend.
 */

// Enhanced validation schemas with shared types
const CreateFeedbackRequestSchema = z.object({
  orderId: z.string().optional(),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  tableId: z.string().optional(),
  overallRating: z.number().min(1).max(5),
  categories: z.record(z.number().min(1).max(5)).optional(),
  quickFeedback: z.array(z.string()).optional(),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional(),
  photos: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    size: z.number(),
    type: z.string()
  })).max(5, 'Maximum 5 photos allowed').optional(),
  guestInfo: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().optional()
  }).optional()
})

const FeedbackListParamsSchema = z.object({
  restaurantId: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  rating: z.number().min(1).max(5).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hasComment: z.boolean().optional(),
  hasPhotos: z.boolean().optional(),
  tableId: z.string().optional(),
  orderId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'rating', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})


const FlagFeedbackSchema = z.object({
  reason: z.enum(['INAPPROPRIATE', 'SPAM', 'FAKE', 'OFFENSIVE', 'OTHER']),
  details: z.string().max(200, 'Details must be less than 200 characters').optional()
})

export class FeedbackAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * Create new feedback for an order or general restaurant experience
   */
  async create(data: CreateFeedbackRequest): Promise<{
    success: boolean
    data?: Feedback
    error?: string
  }> {
    try {
      // Validate request data
      const validatedData = CreateFeedbackRequestSchema.parse(data)

      const response = await this.client.post<Feedback>('/feedback', validatedData)

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create feedback')
      }

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Create feedback error:', error)

      // Enhanced error handling for production
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(e => e.message).join(', ')
        return {
          success: false,
          error: `Validation error: ${validationErrors}`
        }
      }

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
    data?: Feedback
    error?: string
  }> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Feedback ID is required')
      }

      const response = await this.client.get<Feedback>(`/feedback/${id}`)

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get feedback')
      }

      return {
        success: true,
        data: response.data
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
      // Validate parameters
      const validatedParams = FeedbackListParamsSchema.parse(params)

      if (!validatedParams.restaurantId) {
        throw new Error('Restaurant ID is required')
      }

      const queryParams = serializeQueryParams(createFilterParams(validatedParams))
      const endpoint = `/restaurants/${validatedParams.restaurantId}/feedback?${queryParams}`

      const response = await this.client.get<FeedbackListResponse>(endpoint)

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get restaurant feedback')
      }

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Get restaurant feedback error:', error)

      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(e => e.message).join(', ')
        return {
          success: false,
          error: `Validation error: ${validationErrors}`
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get restaurant feedback'
      }
    }
  }

  /**
   * Get feedback statistics for a restaurant
   */
  async getStats(restaurantId: string, params?: {
    startDate?: string
    endDate?: string
    groupBy?: 'day' | 'week' | 'month'
  }): Promise<{
    success: boolean
    data?: FeedbackStats
    error?: string
  }> {
    try {
      if (!restaurantId || restaurantId.trim() === '') {
        throw new Error('Restaurant ID is required')
      }

      const queryParams = params ? serializeQueryParams(createFilterParams(params)) : ''
      const endpoint = `/restaurants/${restaurantId}/feedback/stats${queryParams ? `?${queryParams}` : ''}`

      const response = await this.client.get<FeedbackStats>(endpoint)

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get feedback statistics')
      }

      return {
        success: true,
        data: response.data
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
      // Validation
      if (!files || files.length === 0) {
        throw new Error('No files provided')
      }

      if (files.length > 5) {
        throw new Error('Maximum 5 photos allowed')
      }

      // Validate each file
      for (const file of files) {
        if (file.size > 5242880) { // 5MB
          throw new Error(`File ${file.name} is too large. Maximum size is 5MB`)
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`File ${file.name} has unsupported format. Use JPEG, PNG, or WebP`)
        }
      }

      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append('photos', file) // Use consistent naming
      })

      const response = await this.client.postFormData<{ success: boolean; data: FeedbackPhoto[]; error?: string }>('/feedback/photos', formData)

      if (!response.success) {
        throw new Error(response.error || 'Failed to upload photos')
      }

      return {
        success: true,
        data: response.data
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
      if (!photoId || photoId.trim() === '') {
        throw new Error('Photo ID is required')
      }

      const response = await this.client.delete<{ success: boolean }>(`/feedback/photos/${photoId}`)

      if (!response.success) {
        throw new Error('Failed to delete photo')
      }

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
   * Flag feedback as inappropriate
   */
  async flag(feedbackId: string, data: FlagFeedbackRequest): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      if (!feedbackId || feedbackId.trim() === '') {
        throw new Error('Feedback ID is required')
      }

      const validatedData = FlagFeedbackSchema.parse(data)

      const response = await this.client.post<{ success: boolean }>(`/feedback/${feedbackId}/flag`, validatedData)

      if (!response.success) {
        throw new Error('Failed to flag feedback')
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Flag feedback error:', error)

      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(e => e.message).join(', ')
        return {
          success: false,
          error: `Validation error: ${validationErrors}`
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to flag feedback'
      }
    }
  }

  /**
   * Get all feedback for admin (across all restaurants)
   */
  async getAllFeedback(params?: {
    page?: number
    limit?: number
    restaurantId?: string
  }): Promise<{
    success: boolean
    data?: FeedbackListResponse
    error?: string
  }> {
    try {
      const queryParams = params ? serializeQueryParams(createFilterParams(params)) : ''
      const endpoint = `/admin/feedback${queryParams ? `?${queryParams}` : ''}`

      const response = await this.client.get<FeedbackListResponse>(endpoint)

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get all feedback')
      }

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Get all feedback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all feedback'
      }
    }
  }

  /**
   * Get platform-wide feedback statistics for admin
   */
  async getPlatformStats(): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const response = await this.client.get<any>('/admin/feedback/stats')

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get platform statistics')
      }

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Get platform stats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get platform statistics'
      }
    }
  }

}