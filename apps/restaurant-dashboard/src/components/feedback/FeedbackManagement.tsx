'use client'

import { useState, useMemo } from 'react'
import { Button } from '@tabsy/ui-components'
import {
  Star,
  MessageSquare,
  Camera,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import {
  useRestaurantFeedback,
  useFeedbackStats,
  FEEDBACK_KEYS
} from '@tabsy/react-query-hooks'
import type {
  Feedback,
  FeedbackStatus,
  FeedbackListParams
} from '@tabsy/shared-types'
import { toast } from 'sonner'

interface FeedbackManagementProps {
  restaurantId: string
}

export function FeedbackManagement({ restaurantId }: FeedbackManagementProps) {
  const api = useApiClient()

  // State management
  const [selectedFilter, setSelectedFilter] = useState<FeedbackStatus | 'all'>('all')
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({})

  // Build query parameters
  const queryParams = useMemo((): FeedbackListParams => ({
    restaurantId,
    page: currentPage,
    limit: 10,
    status: selectedFilter === 'all' ? undefined : selectedFilter,
    rating: selectedRating || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }), [restaurantId, currentPage, selectedFilter, selectedRating, dateRange])

  // Data fetching with React Query
  const {
    data: feedbackData,
    isLoading: feedbackLoading,
    error: feedbackError,
    refetch: refetchFeedback
  } = useRestaurantFeedback(api, queryParams, {
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 1000 * 60 * 2 // 2 minutes
  })

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useFeedbackStats(api, restaurantId, dateRange, {
    enabled: !!restaurantId,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 1000 * 60 * 5 // 5 minutes
  })


  // Handle loading and error states
  const isLoading = feedbackLoading || statsLoading
  const hasError = feedbackError || statsError

  // Extract data safely
  const feedback = feedbackData?.feedback || []
  const stats = feedbackData?.stats || {
    totalCount: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  }
  const detailedStats = statsData || {
    categoryAverages: {},
    trends: {},
    monthlyGrowth: 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Customer Feedback</h1>
          <p className="text-content-secondary">
            Manage and respond to customer reviews
            {stats.totalCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                • {stats.totalCount} total reviews
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchFeedback()
              refetchStats()
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Last 30 days
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Error State */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Unable to Load Feedback Data</h3>
              <p className="text-red-700 text-sm mt-1">
                {feedbackError?.message || statsError?.message || 'The feedback service is currently unavailable.'}
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchFeedback()
                    refetchStats()
                  }}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Status Notice */}
      {!hasError && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Feedback System Active</h3>
              <p className="text-blue-700 text-sm mt-1">
                Real-time feedback monitoring, analytics, and response management are now available.
                {isLoading && ' Loading latest data...'}
              </p>
              <p className="text-blue-700 text-sm mt-2">
                <strong>Features:</strong> Automatic notifications, detailed analytics,
                response tracking, and customer engagement metrics.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-content-secondary text-sm">Total Feedback</p>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-content-tertiary">Loading...</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-content-primary">{stats.totalCount}</p>
              )}
            </div>
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-content-secondary text-sm">Average Rating</p>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-content-tertiary">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-content-primary">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                  </p>
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                </div>
              )}
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>


        <div className="bg-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-content-secondary text-sm">This Month</p>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-content-tertiary">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-content-primary">
                    {detailedStats.monthlyGrowth > 0 ? `+${detailedStats.monthlyGrowth}` : detailedStats.monthlyGrowth || '0'}
                  </p>
                  {detailedStats.monthlyGrowth > 0 && (
                    <p className="text-green-600 text-sm">↗ Growth</p>
                  )}
                  {detailedStats.monthlyGrowth < 0 && (
                    <p className="text-red-600 text-sm">↘ Decline</p>
                  )}
                  {detailedStats.monthlyGrowth === 0 && (
                    <p className="text-content-tertiary text-sm">→ No change</p>
                  )}
                </>
              )}
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-surface rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-content-primary mb-4">Rating Distribution</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-content-secondary">Loading distribution...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] || 0
              const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  </div>
                  <div className="flex-1 bg-surface-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-content-secondary w-12">{count}</span>
                </div>
              )
            })}
            {stats.totalCount === 0 && (
              <p className="text-center text-content-tertiary text-sm py-4">
                No feedback data available yet
              </p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-content-primary">Filter:</span>
          {(['all', 'FLAGGED'] as const).map(filter => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedFilter(filter)
                setCurrentPage(1) // Reset to first page when filter changes
              }}
              disabled={isLoading}
            >
              {filter === 'all' ? 'All Feedback' : '⚠ Flagged Only'}
            </Button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-content-primary">Rating:</span>
          <Button
            variant={selectedRating === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedRating(null)
              setCurrentPage(1)
            }}
            disabled={isLoading}
          >
            All
          </Button>
          {[5, 4, 3, 2, 1].map(rating => (
            <Button
              key={rating}
              variant={selectedRating === rating ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedRating(selectedRating === rating ? null : rating)
                setCurrentPage(1)
              }}
              disabled={isLoading}
            >
              <Star className="w-3 h-3 mr-1 fill-current" />
              {rating}
            </Button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-content-primary">
            Recent Feedback ({feedback.length} of {feedbackData?.pagination?.total || 0})
          </h3>
          {feedbackData?.pagination && feedbackData.pagination.totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-content-secondary">
                Page {currentPage} of {feedbackData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(feedbackData.pagination!.totalPages, currentPage + 1))}
                disabled={currentPage === feedbackData.pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {isLoading && feedback.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span className="text-content-secondary">Loading feedback...</span>
          </div>
        ) : (
          feedback.map(feedbackItem => (
            <div key={feedbackItem.id} className="bg-surface rounded-xl border border-default p-8 hover:shadow-lg transition-all duration-200">
              {/* Header with Rating and Status */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-6">
                  {/* Overall Rating - Prominent Display */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-1 mb-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= feedbackItem.overallRating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-content-primary">
                      {feedbackItem.overallRating}.0
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-4 text-sm text-content-secondary">
                      {feedbackItem.tableId && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="font-medium">
                            Table {feedbackItem.table?.tableNumber || feedbackItem.tableId}
                          </span>
                        </div>
                      )}
                      {feedbackItem.orderId && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-secondary rounded-full"></div>
                          <span>Order #{feedbackItem.orderId.slice(-6)}</span>
                        </div>
                      )}
                    </div>
                    {feedbackItem.photos && feedbackItem.photos.length > 0 && (
                      <div className="flex items-center space-x-1 text-sm text-content-secondary">
                        <Camera className="w-4 h-4" />
                        <span>{feedbackItem.photos.length} photos</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status - Only show if flagged or needs attention */}
                {feedbackItem.status === 'FLAGGED' && (
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Flagged</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="font-medium text-content-primary mb-2">
                  {feedbackItem.guestInfo?.name || feedbackItem.guestName || 'Anonymous Customer'}
                  {(feedbackItem.guestInfo?.email || feedbackItem.guestEmail) && (
                    <span className="text-sm text-content-tertiary ml-2">
                      • {feedbackItem.guestInfo?.email || feedbackItem.guestEmail}
                    </span>
                  )}
                </p>
                {feedbackItem.comment && (
                  <p className="text-content-secondary">{feedbackItem.comment}</p>
                )}
              </div>

              {/* Category Ratings - Professional Restaurant View */}
              {(() => {
                // Handle both nested categories object and individual rating fields
                const categories: Record<string, number> = { ...feedbackItem.categories }

                // Map individual fields to categories if nested object doesn't exist or is empty
                if (Object.keys(categories).length === 0) {
                  if (feedbackItem.foodRating) categories.food = feedbackItem.foodRating
                  if (feedbackItem.serviceRating) categories.service = feedbackItem.serviceRating
                  if (feedbackItem.ambianceRating) categories.ambiance = feedbackItem.ambianceRating
                  if (feedbackItem.valueRating) categories.value = feedbackItem.valueRating
                }

                return Object.keys(categories).length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6 bg-surface-secondary/50 rounded-lg p-4">
                    {Object.entries(categories).map(([category, rating]) => {
                      const getRatingColor = (rating: number) => {
                        if (rating >= 4) return 'text-green-600'
                        if (rating >= 3) return 'text-yellow-600'
                        return 'text-red-600'
                      }

                      const getRatingBg = (rating: number) => {
                        if (rating >= 4) return 'bg-green-50'
                        if (rating >= 3) return 'bg-yellow-50'
                        return 'bg-red-50'
                      }

                      return (
                        <div key={category} className={`${getRatingBg(rating)} rounded-lg p-3 text-center`}>
                          <p className="text-sm font-medium text-content-primary capitalize mb-2">
                            {category === 'ambiance' ? 'Ambiance' : category}
                          </p>
                          <div className="flex items-center justify-center space-x-2">
                            <div className={`text-2xl font-bold ${getRatingColor(rating)}`}>
                              {rating}
                            </div>
                            <div className="flex space-x-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Quick Feedback Tags - Smart Color Coding */}
              {feedbackItem.quickFeedback && feedbackItem.quickFeedback.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-3">
                    {feedbackItem.quickFeedback.map((tag, index) => {
                      // Categorize feedback sentiment for color coding
                      const getTagStyle = (tag: string) => {
                        const positiveTerms = ['fast', 'friendly', 'clean', 'delicious', 'great_value', 'recommended', 'excellent', 'amazing', 'perfect']
                        const negativeTerms = ['slow', 'cold', 'expensive', 'poor_quality', 'unfriendly', 'dirty', 'rude', 'terrible', 'awful', 'bad']
                        const neutralTerms = ['average', 'as_expected', 'okay', 'normal']

                        const tagLower = tag.toLowerCase()

                        if (positiveTerms.some(term => tagLower.includes(term))) {
                          return {
                            bg: 'bg-green-100',
                            text: 'text-green-800',
                            border: 'border-green-200',
                            icon: '✓'
                          }
                        }

                        if (negativeTerms.some(term => tagLower.includes(term))) {
                          return {
                            bg: 'bg-red-100',
                            text: 'text-red-800',
                            border: 'border-red-200',
                            icon: '⚠'
                          }
                        }

                        return {
                          bg: 'bg-gray-100',
                          text: 'text-gray-700',
                          border: 'border-gray-200',
                          icon: '◦'
                        }
                      }

                      const formatTag = (tag: string) => {
                        return tag
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, l => l.toUpperCase())
                      }

                      const style = getTagStyle(tag)

                      return (
                        <div
                          key={index}
                          className={`${style.bg} ${style.text} ${style.border} border px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-sm`}
                        >
                          <span className="text-xs">{style.icon}</span>
                          <span>{formatTag(tag)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}


              {/* Timestamp */}
              <div className="pt-4 border-t border-default/30">
                <span className="text-sm text-content-tertiary">
                  Submitted {new Date(feedbackItem.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty State for No Feedback */}
      {!isLoading && feedback.length === 0 && !hasError && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-content-primary mb-2">
            {selectedFilter !== 'all' || selectedRating !== null ? 'No feedback matches your filters' : 'No feedback yet'}
          </h3>
          <p className="text-content-secondary">
            {selectedFilter !== 'all' || selectedRating !== null
              ? 'Try adjusting your filter criteria to see more results.'
              : 'Customer feedback will appear here once they start submitting reviews.'
            }
          </p>
          {(selectedFilter !== 'all' || selectedRating !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFilter('all')
                setSelectedRating(null)
                setCurrentPage(1)
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}