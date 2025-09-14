'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  ShoppingBag, Building, BarChart3, PieChart,
  Download
} from 'lucide-react'
import { format, subDays } from 'date-fns'

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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '3m' | '1y'>('30d')
  const [loading, setLoading] = useState(true)

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockData: AnalyticsData = {
        revenue: {
          total: 125000,
          change: 12.5,
          trend: 'up'
        },
        orders: {
          total: 2450,
          change: -3.2,
          trend: 'down'
        },
        customers: {
          total: 15672,
          active: 12340,
          new: 890
        },
        restaurants: {
          total: 45,
          active: 42,
          topPerforming: ['Bella Italia', 'Sushi Master', 'BBQ Palace']
        },
        dailyMetrics: Array.from({ length: 30 }, (_, i) => ({
          date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
          revenue: Math.floor(Math.random() * 5000) + 2000,
          orders: Math.floor(Math.random() * 100) + 50,
          customers: Math.floor(Math.random() * 200) + 100
        })),
        categoryBreakdown: [
          { category: 'Italian', revenue: 45000, percentage: 36 },
          { category: 'Asian', revenue: 35000, percentage: 28 },
          { category: 'American', revenue: 25000, percentage: 20 },
          { category: 'Mexican', revenue: 15000, percentage: 12 },
          { category: 'Other', revenue: 5000, percentage: 4 }
        ],
        restaurantPerformance: [
          { id: '1', name: 'Bella Italia', revenue: 25000, orders: 450, rating: 4.8, status: 'ACTIVE' },
          { id: '2', name: 'Sushi Master', revenue: 22000, orders: 380, rating: 4.7, status: 'ACTIVE' },
          { id: '3', name: 'BBQ Palace', revenue: 18000, orders: 320, rating: 4.6, status: 'ACTIVE' },
          { id: '4', name: 'Taco Fiesta', revenue: 15000, orders: 280, rating: 4.5, status: 'ACTIVE' },
          { id: '5', name: 'Green Garden', revenue: 12000, orders: 200, rating: 4.3, status: 'INACTIVE' }
        ]
      }
      
      setAnalyticsData(mockData)
      setLoading(false)
    }

    fetchAnalytics()
  }, [dateRange])

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
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    )
  }

  const getTrendColor = (trend: 'up' | 'down') => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">System-wide performance metrics and insights</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '3m' | '1y')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={() => onExportData?.(dateRange)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.revenue.total)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon(analyticsData.revenue.trend)}
            <span className={`text-sm font-medium ${getTrendColor(analyticsData.revenue.trend)}`}>
              {analyticsData.revenue.change > 0 ? '+' : ''}{analyticsData.revenue.change}%
            </span>
            <span className="text-sm text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analyticsData.orders.total)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon(analyticsData.orders.trend)}
            <span className={`text-sm font-medium ${getTrendColor(analyticsData.orders.trend)}`}>
              {analyticsData.orders.change > 0 ? '+' : ''}{analyticsData.orders.change}%
            </span>
            <span className="text-sm text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analyticsData.customers.active)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-gray-600">
              +{formatNumber(analyticsData.customers.new)} new this period
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Restaurants</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.restaurants.active}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Building className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-gray-600">
              of {analyticsData.restaurants.total} total
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-end justify-between gap-1">
            {analyticsData.dailyMetrics.slice(-14).map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(day.revenue / 5000) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                  {format(new Date(day.date), 'M/d')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue by Category</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.categoryBreakdown.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(category.revenue)}
                  </div>
                  <div className="text-xs text-gray-500">{category.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Restaurant Performance Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Restaurant Performance</h3>
          <p className="text-sm text-gray-600">Top performing restaurants by revenue</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.restaurantPerformance.map((restaurant) => (
                <tr key={restaurant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{restaurant.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(restaurant.revenue)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatNumber(restaurant.orders)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">★ {restaurant.rating}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      restaurant.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
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