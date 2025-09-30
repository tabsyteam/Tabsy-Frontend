'use client'

import { useState, useMemo } from 'react'
import { Button } from '@tabsy/ui-components'
import {
  Star,
  MessageSquare,
  Camera,
  Search,
  Download,
  Loader2,
  RefreshCw,
  Building2,
  User,
  Clock,
  TrendingUp
} from 'lucide-react'
import {
  useAdminFeedback,
  useAdminFeedbackStats
} from '@tabsy/react-query-hooks'
import { tabsyClient } from '@tabsy/api-client'
import type {
  Feedback,
  FeedbackListParams
} from '@tabsy/shared-types'

interface FeedbackViewFilters {
  rating: number | null
  search: string
  restaurantId: string | null
  dateRange: {
    startDate?: string
    endDate?: string
  }
}

export function AdminFeedbackViewer() {
  const api = tabsyClient

  // State management for filters and pagination
  const [filters, setFilters] = useState<FeedbackViewFilters>({
    rating: null,
    search: '',
    restaurantId: null,
    dateRange: {}
  })
  const [currentPage, setCurrentPage] = useState(1)

  // Build query parameters
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: 20,
    restaurantId: filters.restaurantId || undefined,
    startDate: filters.dateRange.startDate,
    endDate: filters.dateRange.endDate
  }), [currentPage, filters])

  // Data fetching
  const {
    data: feedbackData,
    isLoading: feedbackLoading,
    error: feedbackError,
    refetch: refetchFeedback
  } = useAdminFeedback(api, queryParams, {
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 1000 * 60 * 2 // 2 minutes
  })

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useAdminFeedbackStats(api, {
    refetchInterval: 60000, // Refetch every minute
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // Handle loading and error states
  const isLoading = feedbackLoading || statsLoading

  // Extract data safely
  const feedback = feedbackData?.feedback || []
  const stats = feedbackData?.stats || {
    totalCount: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  }
  const platformStats = statsData || {
    totalFeedback: 0,
    totalRestaurants: 0,
    avgRating: 0
  }

  // Filter feedback locally for search
  const filteredFeedback = feedback.filter(item => {
    if (filters.search && !item.comment?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.guestName?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.guestEmail?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.rating && item.overallRating !== filters.rating) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-content-primary">Customer Feedback</h1>
          <p className="text-content-secondary">
            Platform-wide customer feedback and reviews
            {platformStats.totalFeedback > 0 && (
              <span className="ml-2 text-primary font-medium">
                • {platformStats.totalFeedback} total reviews across {platformStats.totalRestaurants} restaurants
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
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Platform Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-2xl font-bold text-content-primary">{platformStats.totalFeedback}</p>
              )}
            </div>
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-content-secondary text-sm">Platform Average</p>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-content-tertiary">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-content-primary">
                    {platformStats.avgRating > 0 ? platformStats.avgRating.toFixed(1) : '0.0'}
                  </p>
                  <Star className="w-5 h-5 text-status-warning fill-current" />
                </div>
              )}
            </div>
            <TrendingUp className="w-8 h-8 text-status-success" />
          </div>
        </div>

        <div className="bg-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-content-secondary text-sm">Active Restaurants</p>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-content-tertiary">Loading...</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-content-primary">{platformStats.totalRestaurants}</p>
              )}
            </div>
            <Building2 className="w-8 h-8 text-status-info" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface rounded-lg border p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-content-tertiary" />
            <input
              type="text"
              placeholder="Search feedback by comment, customer name, or email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-content-primary">Rating:</span>
              <Button
                variant={filters.rating === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilters(prev => ({ ...prev, rating: null }))
                  setCurrentPage(1)
                }}
                disabled={isLoading}
              >
                All
              </Button>
              {[5, 4, 3, 2, 1].map(rating => (
                <Button
                  key={rating}
                  variant={filters.rating === rating ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, rating: filters.rating === rating ? null : rating }))
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
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-content-primary">
            Customer Feedback ({filteredFeedback.length} of {feedbackData?.pagination?.total || 0})
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

        {isLoading && filteredFeedback.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span className="text-content-secondary">Loading feedback...</span>
          </div>
        ) : (
          filteredFeedback.map(feedbackItem => (
            <div
              key={feedbackItem.id}
              className="bg-surface rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= feedbackItem.overallRating
                            ? 'text-status-warning fill-current'
                            : 'text-content-tertiary'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-content-secondary ml-2">
                      ({feedbackItem.overallRating}/5)
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-content-secondary">
                    <div className="flex items-center space-x-1">
                      <Building2 className="w-4 h-4" />
                      <span>Restaurant {feedbackItem.restaurantId.slice(-6)}</span>
                    </div>
                    {feedbackItem.tableId && <span>Table {feedbackItem.tableId}</span>}
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(feedbackItem.createdAt).toLocaleDateString()}</span>
                    </div>
                    {feedbackItem.photos && feedbackItem.photos.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Camera className="w-4 h-4" />
                        <span>{feedbackItem.photos.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-content-tertiary" />
                  <p className="font-medium text-content-primary">
                    {feedbackItem.guestName || 'Anonymous Customer'}
                  </p>
                  {feedbackItem.guestEmail && (
                    <span className="text-sm text-content-tertiary">
                      • {feedbackItem.guestEmail}
                    </span>
                  )}
                </div>
                {feedbackItem.comment && (
                  <p className="text-content-secondary pl-6">{feedbackItem.comment}</p>
                )}
              </div>

              <div className="flex items-center justify-end pt-4 border-t">
                <span className="text-xs text-content-tertiary">
                  ID: {feedbackItem.id.slice(-8)} • {new Date(feedbackItem.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty State */}
      {!isLoading && filteredFeedback.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-content-primary mb-2">
            {filters.rating !== null || filters.search
              ? 'No feedback matches your filters'
              : 'No feedback data available'
            }
          </h3>
          <p className="text-content-secondary">
            {filters.rating !== null || filters.search
              ? 'Try adjusting your filter criteria to see more results.'
              : 'Feedback from all restaurants will appear here as customers submit reviews.'
            }
          </p>
          {(filters.rating !== null || filters.search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  rating: null,
                  search: '',
                  restaurantId: null,
                  dateRange: {}
                })
                setCurrentPage(1)
              }}
              className="mt-4"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}