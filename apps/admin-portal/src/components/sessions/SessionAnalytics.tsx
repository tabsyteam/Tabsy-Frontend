'use client'

import { useState, useEffect } from 'react'
import { tabsyClient } from '@tabsy/api-client'
import type { RestaurantSessionMetrics } from '@tabsy/api-client'

type SessionMetrics = RestaurantSessionMetrics
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Activity,
  BarChart3
} from 'lucide-react'
import { Badge } from '@tabsy/ui-components'

interface SessionAnalyticsProps {
  dateRange?: {
    from: string
    to: string
  }
}

export function SessionAnalytics({ dateRange }: SessionAnalyticsProps) {
  const api = tabsyClient
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [previousMetrics, setPreviousMetrics] = useState<SessionMetrics | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [dateRange])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)

      // Load current period metrics
      const response = await api.restaurantTableSession.getSessionMetrics(
        dateRange?.from,
        dateRange?.to
      )

      if (response.success && response.data) {
        setMetrics(response.data)
      }

      // Load previous period for comparison (if current period is specified)
      if (dateRange?.from && dateRange?.to) {
        const currentFrom = new Date(dateRange.from)
        const currentTo = new Date(dateRange.to)
        const periodLength = currentTo.getTime() - currentFrom.getTime()

        const previousFrom = new Date(currentFrom.getTime() - periodLength)
        const previousTo = new Date(currentFrom.getTime())

        const previousResponse = await api.restaurantTableSession.getSessionMetrics(
          previousFrom.toISOString(),
          previousTo.toISOString()
        )

        if (previousResponse.success && previousResponse.data) {
          setPreviousMetrics(previousResponse.data)
        }
      }
    } catch (error) {
      console.error('[SessionAnalytics] Error loading metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2">Loading analytics...</span>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-surface rounded-lg border border-default p-8 text-center">
        <BarChart3 className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
        <h3 className="font-medium text-lg mb-2">No Analytics Data</h3>
        <p className="text-content-secondary">Unable to load session analytics</p>
      </div>
    )
  }

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    color,
    previousValue,
    format = 'number'
  }: {
    title: string
    value: number
    icon: any
    color: string
    previousValue?: number
    format?: 'number' | 'currency' | 'percentage' | 'time'
  }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case 'currency':
          return `$${val.toLocaleString()}`
        case 'percentage':
          return `${val.toFixed(1)}%`
        case 'time':
          return `${val}m`
        default:
          return val.toLocaleString()
      }
    }

    const change = previousValue !== undefined ? calculatePercentageChange(value, previousValue) : undefined
    const isPositive = change !== undefined && change > 0
    const isNegative = change !== undefined && change < 0

    return (
      <div className="bg-surface rounded-lg border border-default p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          {change !== undefined && (
            <Badge
              variant={isPositive ? 'success' : isNegative ? 'destructive' : 'neutral'}
              className="inline-flex items-center gap-1"
            >
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold">{formatValue(value)}</p>
          <p className="text-sm text-content-secondary">{title}</p>
          {previousValue !== undefined && (
            <p className="text-xs text-content-tertiary mt-1">
              vs {formatValue(previousValue)} previous period
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sessions"
          value={metrics.totalSessions}
          icon={Activity}
          color="bg-primary/10 text-primary"
          previousValue={previousMetrics?.totalSessions}
        />

        <MetricCard
          title="Active Sessions"
          value={metrics.activeSessions}
          icon={Users}
          color="bg-success/10 text-success"
          previousValue={previousMetrics?.activeSessions}
        />

        <MetricCard
          title="Total Revenue"
          value={metrics.totalRevenue}
          icon={DollarSign}
          color="bg-info/10 text-info"
          previousValue={previousMetrics?.totalRevenue}
          format="currency"
        />

        <MetricCard
          title="Avg Duration"
          value={metrics.averageSessionDuration}
          icon={Clock}
          color="bg-warning/10 text-warning"
          previousValue={previousMetrics?.averageSessionDuration}
          format="time"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Sessions Today"
          value={metrics.sessionsToday}
          icon={TrendingUp}
          color="bg-status-success-light text-status-success"
          previousValue={previousMetrics?.sessionsToday}
        />

        <MetricCard
          title="Sessions This Week"
          value={metrics.sessionsThisWeek}
          icon={BarChart3}
          color="bg-status-info-light text-status-info"
          previousValue={previousMetrics?.sessionsThisWeek}
        />

        <MetricCard
          title="Avg Party Size"
          value={metrics.averagePartySize}
          icon={Users}
          color="bg-primary-light text-primary"
          previousValue={previousMetrics?.averagePartySize}
          format="percentage"
        />
      </div>

      {/* Top Restaurants */}
      {metrics.topRestaurants?.length > 0 && (
        <div className="bg-surface rounded-lg border border-default">
          <div className="p-6 border-b border-default">
            <h3 className="font-semibold text-lg">Top Performing Restaurants</h3>
            <p className="text-content-secondary">Restaurants with the most session activity</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {metrics.topRestaurants.slice(0, 5).map((restaurant, index) => (
                <div key={restaurant.restaurantId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{restaurant.restaurantName}</div>
                      <div className="text-sm text-content-secondary">
                        {restaurant.sessionCount} sessions
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${restaurant.revenue.toLocaleString()}</div>
                    <div className="text-sm text-content-secondary">revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-surface rounded-lg border border-default p-6">
        <h3 className="font-semibold mb-4">Quick Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">
              {((metrics.activeSessions / metrics.totalSessions) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-content-secondary">Active Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-success">
              ${(metrics.totalRevenue / metrics.totalSessions).toFixed(0)}
            </div>
            <div className="text-sm text-content-secondary">Avg Revenue</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-info">
              {(metrics.totalRevenue / metrics.sessionsToday).toFixed(0) || '0'}
            </div>
            <div className="text-sm text-content-secondary">Daily Avg</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning">
              {metrics.topRestaurants?.length || 0}
            </div>
            <div className="text-sm text-content-secondary">Active Restaurants</div>
          </div>
        </div>
      </div>
    </div>
  )
}