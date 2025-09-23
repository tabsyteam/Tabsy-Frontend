/**
 * Feedback Domain Types
 *
 * Comprehensive type definitions for the feedback and review system.
 * These types define the structure for customer feedback, ratings,
 * restaurant responses, and analytics.
 */


// Feedback flag reasons
export type FeedbackFlagReason = 'INAPPROPRIATE' | 'SPAM' | 'FAKE' | 'OFFENSIVE' | 'OTHER'

// Quick feedback types
export type QuickFeedbackType = 'positive' | 'neutral' | 'negative'

// Rating categories
export interface FeedbackCategories {
  food?: number       // 1-5 star rating for food quality
  service?: number    // 1-5 star rating for service
  speed?: number      // 1-5 star rating for speed
  value?: number      // 1-5 star rating for value for money
}

// Guest information for feedback
export interface FeedbackGuestInfo {
  name?: string
  email?: string
  phone?: string
}

// Feedback photo/attachment
export interface FeedbackPhoto {
  id: string
  filename: string
  originalName: string
  size: number
  type: string
  url: string
  thumbnailUrl: string
  uploadedAt: string
}


// Feedback flag info
export interface FeedbackFlag {
  reason: FeedbackFlagReason
  details?: string
  flaggedAt: string
  flaggedBy: string
}

// Core feedback entity
export interface Feedback {
  id: string
  orderId?: string
  restaurantId: string
  tableId?: string
  userId?: string        // If authenticated user
  sessionId?: string     // If guest session
  overallRating: number  // 1-5 star rating
  categories?: FeedbackCategories
  quickFeedback?: string[]  // Array of predefined feedback tags
  comment?: string
  photos?: FeedbackPhoto[]
  guestInfo?: FeedbackGuestInfo
  flagged?: FeedbackFlag
  createdAt: string
  updatedAt: string

  // Backend format support (individual rating fields)
  foodRating?: number
  serviceRating?: number
  ambianceRating?: number
  valueRating?: number

  // Backend format support (individual guest fields)
  guestName?: string
  guestEmail?: string
  guestPhone?: string

  // Backend format support (related objects)
  table?: {
    id: string
    tableNumber: string
  }
  restaurant?: {
    id: string
    name: string
  }
  order?: {
    id: string
    orderNumber: string
  }
}

// Request types for creating feedback
export interface CreateFeedbackRequest {
  orderId?: string
  restaurantId: string
  tableId?: string
  overallRating: number
  categories?: FeedbackCategories
  quickFeedback?: string[]
  comment?: string
  photos?: {
    id: string
    filename: string
    size: number
    type: string
  }[]
  guestInfo?: FeedbackGuestInfo
}

// Feedback list parameters for filtering/pagination
export interface FeedbackListParams {
  restaurantId?: string
  page?: number
  limit?: number
  rating?: number           // Filter by overall rating
  startDate?: string        // ISO date string
  endDate?: string          // ISO date string
  hasComment?: boolean      // Filter feedback with/without comments
  hasPhotos?: boolean       // Filter feedback with/without photos
  tableId?: string          // Filter by specific table
  orderId?: string          // Filter by specific order
  sortBy?: 'createdAt' | 'overallRating' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

// Pagination info for feedback lists
export interface FeedbackPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

// Basic feedback statistics
export interface FeedbackBasicStats {
  averageRating: number
  totalCount: number
  ratingDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

// Feedback list response
export interface FeedbackListResponse {
  feedback: Feedback[]
  pagination: FeedbackPagination
  stats: FeedbackBasicStats
}

// Comprehensive feedback statistics
export interface FeedbackStats {
  overview: {
    totalFeedback: number
    averageRating: number
  }
  ratings: {
    overall: {
      average: number
      distribution: Record<number, number>
    }
    categories: {
      food: { average: number, count: number }
      service: { average: number, count: number }
      speed: { average: number, count: number }
      value: { average: number, count: number }
    }
  }
  trends: {
    period: string
    averageRating: number
    feedbackCount: number
  }[]
  quickFeedback: {
    positive: { tag: string, count: number }[]
    negative: { tag: string, count: number }[]
    neutral: { tag: string, count: number }[]
  }
  photos: {
    totalPhotos: number
    recentPhotos: FeedbackPhoto[]
  }
}


// Request for flagging feedback
export interface FlagFeedbackRequest {
  reason: FeedbackFlagReason
  details?: string
}

// Photo upload request
export interface UploadFeedbackPhotosRequest {
  files: File[]
  feedbackId?: string
}

// Quick feedback option definition (for UI)
export interface QuickFeedbackOption {
  id: string
  label: string
  type: QuickFeedbackType
}

// Feedback category definition (for UI)
export interface FeedbackCategoryDefinition {
  id: keyof FeedbackCategories
  name: string
  description?: string
}

// Feedback form validation schema
export interface FeedbackValidation {
  overallRating: {
    required: true
    min: 1
    max: 5
  }
  categories: {
    min: 0
    max: 5
  }
  comment: {
    maxLength: 1000
  }
  photos: {
    maxCount: 5
    maxSizePerFile: 5242880  // 5MB in bytes
    allowedTypes: string[]   // ['image/jpeg', 'image/png', 'image/webp']
  }
  guestInfo: {
    email?: {
      format: 'email'
    }
    phone?: {
      format: 'phone'
    }
  }
}

// Feedback analytics period options
export type FeedbackAnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

// Feedback export options
export interface FeedbackExportOptions {
  restaurantId: string
  format: 'csv' | 'json' | 'xlsx'
  filters?: FeedbackListParams
  includePhotos?: boolean
}

// Common feedback constants
export const FEEDBACK_CONSTANTS = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  COMMENT_MAX_LENGTH: 1000,
  PHOTOS_MAX_COUNT: 5,
  PHOTO_MAX_SIZE: 5242880, // 5MB
  PHOTO_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const

// Predefined quick feedback options
export const DEFAULT_QUICK_FEEDBACK_OPTIONS: QuickFeedbackOption[] = [
  // Positive feedback
  { id: 'delicious', label: 'Delicious food', type: 'positive' },
  { id: 'friendly', label: 'Friendly staff', type: 'positive' },
  { id: 'fast', label: 'Quick service', type: 'positive' },
  { id: 'clean', label: 'Clean environment', type: 'positive' },
  { id: 'great_value', label: 'Great value', type: 'positive' },
  { id: 'recommended', label: 'Highly recommended', type: 'positive' },

  // Negative feedback
  { id: 'slow', label: 'Slow service', type: 'negative' },
  { id: 'cold', label: 'Food was cold', type: 'negative' },
  { id: 'expensive', label: 'Too expensive', type: 'negative' },
  { id: 'poor_quality', label: 'Poor food quality', type: 'negative' },
  { id: 'unfriendly', label: 'Unfriendly staff', type: 'negative' },
  { id: 'dirty', label: 'Cleanliness issues', type: 'negative' },

  // Neutral feedback
  { id: 'average', label: 'Just okay', type: 'neutral' },
  { id: 'as_expected', label: 'As expected', type: 'neutral' }
] as const

// Default feedback categories
export const DEFAULT_FEEDBACK_CATEGORIES: FeedbackCategoryDefinition[] = [
  { id: 'food', name: 'Food Quality', description: 'Taste, freshness, presentation' },
  { id: 'service', name: 'Service', description: 'Staff friendliness and helpfulness' },
  { id: 'speed', name: 'Speed', description: 'Order preparation and delivery time' },
  { id: 'value', name: 'Value for Money', description: 'Price compared to quality and quantity' }
] as const