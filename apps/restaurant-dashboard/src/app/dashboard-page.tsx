'use client'

import { useEffect, useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { useAuth } from '@tabsy/ui-components'
import { BarChart3, ShoppingCart, Users, Utensils, TrendingUp, Clock } from 'lucide-react'
import { OrdersManagement } from '@/components/orders/OrdersManagement'
import { MenuManagement } from '@/components/menu/MenuManagement'
import { DynamicWeeklyOverviewChart } from '@/components'
import { Header } from '@/components/layout'
import { useRouter } from 'next/navigation'
import { User as UserType } from '@tabsy/shared-types'
import { createDashboardHooks } from '@tabsy/react-query-hooks'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'
import { useQuery } from '@tanstack/react-query'

interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  activeTables: number
  totalMenuItems: number
  averageOrderValue: number
  ordersTrend: number
  revenueTrend: number
  recentActivity: Array<{
    id: string
    type: 'order' | 'payment' | 'table'
    message: string
    timestamp: Date
    metadata?: Record<string, unknown>
  }>
}

/**
 * Dashboard component with real API integration
 * This component uses real data from the Tabsy Core Server
 */
export function DashboardClient(): JSX.Element {
  const router = useRouter()
  const auth = useAuth()
  const user = auth.user as UserType | null
  // State hooks - ADD MENU AS A VIEW
  const [currentView, setCurrentView] = useState<'overview' | 'orders' | 'menu'>('overview')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Get current restaurant
  const { restaurantId, restaurant, hasRestaurantAccess, isLoading: restaurantLoading } = useCurrentRestaurant()
  
  // Debug logging for restaurant data
  console.log('🏪 Dashboard - Restaurant data:', {
    restaurantId,
    restaurant,
    hasRestaurantAccess,
    restaurantLoading,
    restaurantName: restaurant?.name
  })
  
  // ===========================
  // DASHBOARD HOOKS WITH FACTORY PATTERN
  // ===========================
  const dashboardHooks = createDashboardHooks(useQuery)
  
  // Use the factory hooks - NOW ENABLED!
  const { 
    data: metricsData, 
    isLoading: metricsLoading, 
    error: metricsError 
  } = dashboardHooks.useDashboardMetrics(restaurantId || '')
  
  const { 
    data: weeklyData, 
    isLoading: weeklyLoading 
  } = dashboardHooks.useWeeklyOrderStats(restaurantId || '')

  console.log('Dashboard - State:', {
    restaurantId,
    hasRestaurantAccess,
    metricsData,
    metricsLoading,
    metricsError,
    weeklyData,
    authToken: auth.session?.token ? '***present***' : 'missing',
    authUser: auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : 'no user'
  })

  // EFFECT HOOK - ALWAYS CALLED
  useEffect(() => {
    // Check if user has restaurant access
    if (!hasRestaurantAccess) {
      console.warn('User does not have restaurant access')
      // You might want to redirect or show an error message
    }
  }, [hasRestaurantAccess])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await auth.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // RENDER LOADING STATE - AFTER ALL HOOKS
  if (metricsLoading || restaurantLoading || !restaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-foreground/80">
            {restaurantLoading ? 'Loading restaurant...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  // Handle API error
  if (metricsError) {
    console.error('Dashboard metrics error:', metricsError)
    console.error('Error details:', {
      status: (metricsError as any)?.status,
      code: (metricsError as any)?.code,
      message: metricsError.message,
      details: (metricsError as any)?.details,
      stack: metricsError.stack
    })
    
    // Check if it's an authentication error
    const isAuthError = (metricsError as any)?.status === 401 || 
                       (metricsError as any)?.status === 403 ||
                       metricsError.message?.includes('401') ||
                       metricsError.message?.includes('Unauthorized')
    
    if (isAuthError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h2>
            <p className="text-foreground/80 mb-4">Your session has expired. Please sign in again.</p>
            <Button onClick={handleLogout}>Sign In Again</Button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Error Loading Dashboard</h2>
          <p className="text-foreground/80 mb-4">
            Failed to load dashboard data. Please try again later.
          </p>
          <p className="text-sm text-foreground/70 mb-4">
            Status: {(metricsError as any)?.status} | Code: {(metricsError as any)?.code}
          </p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
            <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
          </div>
        </div>
      </div>
    )
  }

  // Get stats from real data
  const metricsTyped = metricsData as DashboardStats | undefined | null
  const stats: DashboardStats = {
    todayOrders: metricsTyped?.todayOrders || 0,
    todayRevenue: metricsTyped?.todayRevenue || 0,
    activeTables: metricsTyped?.activeTables || 0,
    totalMenuItems: metricsTyped?.totalMenuItems || 0,
    averageOrderValue: metricsTyped?.averageOrderValue || 0,
    ordersTrend: metricsTyped?.ordersTrend || 0,
    revenueTrend: metricsTyped?.revenueTrend || 0,
    recentActivity: metricsTyped?.recentActivity || []
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatTrend = (trend: number): string => {
    const sign = trend >= 0 ? '+' : ''
    return `${sign}${trend.toFixed(1)}%`
  }

  const getTrendColor = (trend: number): string => {
    return trend >= 0 ? 'text-primary' : 'text-accent'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Modern Responsive Header */}
      <Header
        user={user}
        restaurantName={restaurant?.name}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-[calc(100vh-4rem)]">
        {currentView === 'overview' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-card rounded-lg shadow-lg border p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShoppingCart className="h-8 w-8 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Today&apos;s Orders</p>
                      <p className="text-2xl font-bold text-foreground">{stats.todayOrders}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${getTrendColor(stats.ordersTrend)}`}>
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    {formatTrend(stats.ordersTrend)}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-lg border p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-8 w-8 text-secondary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Today&apos;s Revenue</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(stats.todayRevenue)}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${getTrendColor(stats.revenueTrend)}`}>
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    {formatTrend(stats.revenueTrend)}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-lg border p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-accent" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Tables</p>
                    <p className="text-2xl font-bold text-foreground">{stats.activeTables}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-lg border p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Utensils className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(stats.averageOrderValue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Weekly Overview Chart */}
              <div className="lg:col-span-2 bg-card rounded-lg shadow-lg border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 text-primary mr-2" />
                  Weekly Overview
                </h3>
                {weeklyLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : (
                  <DynamicWeeklyOverviewChart data={((weeklyData as any)?.data || []) as Array<{ day: string; orders: number; revenue: number }>} />
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-lg shadow-lg border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                  <Utensils className="h-5 w-5 text-primary mr-2" />
                  Quick Actions
                </h3>
                <div className="space-y-4">
                  <Button 
                    className="w-full justify-start " 
                    variant="outline"
                    onClick={() => setCurrentView('orders')}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View All Orders
                  </Button>
                  <Button
                    className="w-full justify-start "
                    variant="outline"
                    onClick={() => setCurrentView('menu')}
                  >
                    <Utensils className="h-4 w-4 mr-2" />
                    Manage Menu
                  </Button>
                  <Button className="w-full justify-start " variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Table Management
                  </Button>
                  <Button className="w-full justify-start " variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-lg shadow-lg border">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-medium text-foreground flex items-center">
                  <Clock className="h-5 w-5 text-primary mr-2" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {stats.recentActivity && stats.recentActivity.length > 0 ? (
                    stats.recentActivity.slice(0, 3).map((activity: { id: string; type: string; message: string; timestamp: Date }, index: number) => (
                      <div key={activity.id} className={`flex items-center space-x-4 p-3 rounded-lg ${
                        index === 0 ? 'activity-primary' : index === 1 ? 'activity-secondary' : 'activity-accent'
                      }`}>
                        <div className="flex-shrink-0">
                          {activity.type === 'order' ? (
                            <ShoppingCart className="w-5 h-5 text-primary" />
                          ) : activity.type === 'payment' ? (
                            <Clock className="w-5 h-5 text-secondary" />
                          ) : (
                            <Users className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{activity.message}</p>
                          <p className="text-xs text-primary">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-foreground/70">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : currentView === 'orders' ? (
          <div className="h-full">
            {restaurantId ? (
              <OrdersManagement restaurantId={restaurantId} />
            ) : (
              <p className="text-foreground/80">No restaurant access available.</p>
            )}
          </div>
        ) : currentView === 'menu' ? (
          <div className="h-full overflow-y-auto">
            {restaurantId ? (
              <MenuManagement restaurantId={restaurantId} />
            ) : (
              <p className="text-foreground/80">No restaurant access available.</p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}