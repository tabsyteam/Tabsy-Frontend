'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  ShoppingBag, Building, BarChart3, PieChart,
  Download
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useAnalytics } from '@/hooks/api/useAnalytics'

interface AnalyticsData {
  revenue: {
    total: number
    change: number
    trend: 'up' | 'down'
  }
  orders: {
    total: number
    change: number
    trend: 'up' | 'down'
  }
  customers: {
    total: number
    active: number
    new: number
  }
  restaurants: {
    total: number
    active: number
    topPerforming: string[]
  }
  dailyMetrics: Array<{
    date: string
    revenue: number
    orders: number
    customers: number
  }>
  categoryBreakdown: Array<{
    category: string
    revenue: number
    percentage: number
  }>
  restaurantPerformance: Array<{
    id: string
    name: string
    revenue: number
    orders: number
    rating: number
    status: 'ACTIVE' | 'INACTIVE'
  }>
}

interface AnalyticsDashboardProps {
  onExportData?: (period: string) => void
}

export function AnalyticsDashboard({ onExportData }: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '3m' | '1y'>('30d')

  // Map dateRange to period for useAnalytics
  const period = dateRange === '7d' ? 'week' : dateRange === '30d' ? 'month' : dateRange === '3m' ? 'month' : 'year'

  // Use real analytics API
  const { data: analyticsApiData, isLoading: loading, error } = useAnalytics(period)

  // Transform API data to match component interface
  const analyticsData: AnalyticsData | null = analyticsApiData ? {
    revenue: {
      total: analyticsApiData.revenue.total,
      change: analyticsApiData.revenue.changePercent,
      trend: analyticsApiData.revenue.changePercent >= 0 ? 'up' : 'down'
    },
    orders: {
      total: analyticsApiData.orders.total,
      change: analyticsApiData.orders.changePercent,
      trend: analyticsApiData.orders.changePercent >= 0 ? 'up' : 'down'
    },
    customers: {
      total: analyticsApiData.customers.total,
      active: analyticsApiData.customers.total - analyticsApiData.customers.new,
      new: analyticsApiData.customers.new
    },
    restaurants: {
      total: analyticsApiData.restaurants.total,
      active: analyticsApiData.restaurants.active,
      topPerforming: analyticsApiData.topRestaurants.slice(0, 3).map(r => r.name)
    },
    dailyMetrics: [], // Would need historical daily data from API
    categoryBreakdown: [], // Would need category data from API
    restaurantPerformance: analyticsApiData.topRestaurants.map(r => ({
      id: r.name, // Using name as ID for now
      name: r.name,
      revenue: parseFloat(r.revenue),
      orders: r.orders,
      rating: 0, // Would need rating data
      status: 'ACTIVE' as const
    }))
  } : null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getTrendIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-status-success" />
    ) : (
      <TrendingDown className="w-4 h-4 text-status-error" />
    )
  }

  const getTrendColor = (trend: 'up' | 'down') => {
    return trend === 'up' ? 'text-status-success' : 'text-status-error'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-tertiary rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface p-6 rounded-lg border">
                <div className="h-4 bg-surface-tertiary rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-surface-tertiary rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-surface-tertiary rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Analytics Dashboard</h1>
          <p className="text-content-secondary">System-wide performance metrics and insights</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '3m' | '1y')}
            className="border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={() => onExportData?.(dateRange)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-interactive-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">Total Revenue</p>
              <p className="text-2xl font-bold text-content-primary">
                {formatCurrency(analyticsData.revenue.total)}
              </p>
            </div>
            <div className="bg-status-success-light p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-status-success" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon(analyticsData.revenue.trend)}
            <span className={`text-sm font-medium ${getTrendColor(analyticsData.revenue.trend)}`}>
              {analyticsData.revenue.change > 0 ? '+' : ''}{analyticsData.revenue.change}%
            </span>
            <span className="text-sm text-content-tertiary">vs last period</span>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">Total Orders</p>
              <p className="text-2xl font-bold text-content-primary">
                {formatNumber(analyticsData.orders.total)}
              </p>
            </div>
            <div className="bg-status-info-light p-3 rounded-full">
              <ShoppingBag className="w-6 h-6 text-status-info" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon(analyticsData.orders.trend)}
            <span className={`text-sm font-medium ${getTrendColor(analyticsData.orders.trend)}`}>
              {analyticsData.orders.change > 0 ? '+' : ''}{analyticsData.orders.change}%
            </span>
            <span className="text-sm text-content-tertiary">vs last period</span>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">Active Customers</p>
              <p className="text-2xl font-bold text-content-primary">
                {formatNumber(analyticsData.customers.active)}
              </p>
            </div>
            <div className="bg-secondary-light p-3 rounded-full">
              <Users className="w-6 h-6 text-secondary" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-content-secondary">
              +{formatNumber(analyticsData.customers.new)} new this period
            </span>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">Active Restaurants</p>
              <p className="text-2xl font-bold text-content-primary">
                {analyticsData.restaurants.active}
              </p>
            </div>
            <div className="bg-primary-light p-3 rounded-full">
              <Building className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-content-secondary">
              of {analyticsData.restaurants.total} total
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary">Revenue Trend</h3>
            <BarChart3 className="w-5 h-5 text-content-disabled" />
          </div>
          <div className="h-64 flex items-end justify-between gap-1">
            {analyticsData.dailyMetrics.slice(-14).map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-status-info rounded-t"
                  style={{ height: `${(day.revenue / 5000) * 100}%` }}
                ></div>
                <span className="text-xs text-content-tertiary mt-1 transform -rotate-45 origin-left">
                  {format(new Date(day.date), 'M/d')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary">Revenue by Category</h3>
            <PieChart className="w-5 h-5 text-content-disabled" />
          </div>
          <div className="space-y-3">
            {analyticsData.categoryBreakdown.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                  ></div>
                  <span className="text-sm font-medium text-content-secondary">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-content-primary">
                    {formatCurrency(category.revenue)}
                  </div>
                  <div className="text-xs text-content-tertiary">{category.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Restaurant Performance Table */}
      <div className="bg-surface rounded-lg border">
        <div className="p-6 border-b border-border-secondary">
          <h3 className="text-lg font-semibold text-content-primary">Restaurant Performance</h3>
          <p className="text-sm text-content-secondary">Top performing restaurants by revenue</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border-tertiary">
              {analyticsData.restaurantPerformance.map((restaurant) => (
                <tr key={restaurant.id} className="hover:bg-interactive-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-content-primary">{restaurant.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-content-primary">{formatCurrency(restaurant.revenue)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-content-primary">{formatNumber(restaurant.orders)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-content-primary">★ {restaurant.rating}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      restaurant.status === 'ACTIVE'
                        ? 'bg-status-success-light text-status-success-dark'
                        : 'bg-surface-tertiary text-content-secondary'
                    }`}>
                      {restaurant.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}