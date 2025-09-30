'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button, useAuth } from '@tabsy/ui-components'
import { BarChart3, ShoppingCart, Users, Utensils, TrendingUp, Clock, Star, CreditCard } from 'lucide-react'
import { logger } from '@/lib/logger'
import { QUERY_STALE_TIME, QUERY_REFETCH_INTERVAL, REDIRECT_DELAY, PAYMENT_INVALIDATION_DELAY, RETRY_CONFIG, NOTIFICATION_LIMITS } from '@/lib/constants'
import { OrdersManagement } from '@/components/orders/OrdersManagement'
import { MenuManagement } from '@/components/menu/MenuManagement'
import { TableManagement } from '@/components/tables/TableManagement'
import { FeedbackManagement } from '@/components/feedback/FeedbackManagement'
import { PaymentManagement } from '@/components/payments/PaymentManagement'
import { PaymentNotifications } from '@/components/payments/PaymentNotifications'
import { DynamicWeeklyOverviewChart } from '@/components'
import { Header } from '@/components/layout'
import { useRouter } from 'next/navigation'
import { User as UserType } from '@tabsy/shared-types'
import { createDashboardHooks, createNotificationHooks } from '@tabsy/react-query-hooks'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AssistanceAlertsContainer } from '@/components/alerts/AssistanceAlert'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { type Notification } from '@tabsy/shared-types'
import { useNotificationSound } from '@/hooks/useNotificationSound'

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
  const user = auth?.user as UserType | null
  // State hooks - ADD MENU AND TABLES AS VIEWS
  const [currentView, setCurrentView] = useState<'overview' | 'orders' | 'menu' | 'tables' | 'payments' | 'feedback'>('overview')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Get current restaurant
  const { restaurantId, restaurant, hasRestaurantAccess, isLoading: restaurantLoading } = useCurrentRestaurant()

  // Query client for cache invalidation
  const queryClient = useQueryClient()
  
  // Debug logging for restaurant data
  logger.restaurant('Restaurant data loaded', {
    restaurantId,
    hasRestaurantAccess,
    restaurantLoading,
    restaurantName: restaurant?.name
  })
  
  // ===========================
  // DASHBOARD HOOKS WITH FACTORY PATTERN
  // ===========================
  const dashboardHooks = createDashboardHooks(useQuery)
  
  // RE-ENABLE DASHBOARD METRICS WITH ENHANCED SAFEGUARDS
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError
  } = dashboardHooks.useDashboardMetrics(restaurantId || '', {
    enabled: !!restaurantId && !!auth?.session?.token,
    retry: (failureCount: number, error: any) => {
      // Don't retry rate limit errors or auth errors
      if (error?.status === 429 || error?.code === 'RATE_LIMIT_EXCEEDED' || error?.status === 401 || error?.status === 403) {
        return false
      }
      return failureCount < RETRY_CONFIG.MAX_ATTEMPTS
    },
    retryDelay: (attemptIndex: number) => Math.min(RETRY_CONFIG.BASE_DELAY * 2 ** attemptIndex, RETRY_CONFIG.MAX_DELAY)
  })

  // RE-ENABLE WEEKLY STATS WITH ENHANCED SAFEGUARDS
  const {
    data: weeklyData,
    isLoading: weeklyLoading
  } = dashboardHooks.useWeeklyOrderStats(restaurantId || '', {
    enabled: !!restaurantId && !!auth?.session?.token,
    staleTime: QUERY_STALE_TIME.LONG,
    retry: (failureCount: number, error: any) => {
      if (error?.status === 429 || error?.code === 'RATE_LIMIT_EXCEEDED' || error?.status === 401 || error?.status === 403) {
        return false
      }
      return failureCount < RETRY_CONFIG.MAX_ATTEMPTS
    },
    retryDelay: (attemptIndex: number) => Math.min(RETRY_CONFIG.BASE_DELAY * 2 ** attemptIndex, RETRY_CONFIG.MAX_DELAY)
  })

  // Assistance alerts and notifications
  const [assistanceNotifications, setAssistanceNotifications] = useState<Notification[]>([])

  // Notification sound for assistance requests
  const { playSound: playAssistanceSound } = useNotificationSound({
    enabled: true,
    volume: 0.7,
    priority: 'high'
  })

  // Re-enable notifications with proper configuration
  const notificationHooks = createNotificationHooks(useQuery)
  const {
    data: notificationsData,
    refetch: refetchNotifications
  } = notificationHooks.useUserNotifications(
    { limit: NOTIFICATION_LIMITS.DASHBOARD, unreadOnly: false },
    {
      enabled: !!user?.id,
      refetchInterval: QUERY_REFETCH_INTERVAL.NORMAL,
      staleTime: QUERY_STALE_TIME.SHORT,
      refetchOnWindowFocus: false
    }
  )

  // Use unified WebSocket provider
  const { isConnected: wsConnected } = useWebSocket()

  // Removed: Security risk - authentication token logging

  // Additional debug logging for dashboard data issues
  logger.debug('Dashboard metrics analysis', {
    metricsDataType: typeof metricsData,
    metricsDataKeys: metricsData ? Object.keys(metricsData) : 'no data',
    todayOrders: metricsData?.todayOrders,
    todayRevenue: metricsData?.todayRevenue,
    activeTables: metricsData?.activeTables,
    recentActivityCount: metricsData?.recentActivity?.length || 0
  })

  // EFFECT HOOK - ALWAYS CALLED
  useEffect(() => {
    // Check if user has restaurant access
    if (!hasRestaurantAccess) {
      logger.warn('User does not have restaurant access')
      // You might want to redirect or show an error message
    }
  }, [hasRestaurantAccess])

  // Redirect if user doesn't have restaurant access after authentication is complete
  useEffect(() => {
    if (!auth?.isLoading && !auth?.isVerifying && auth?.isAuthenticated && (!hasRestaurantAccess || !restaurantId)) {
      // Auto redirect to login after a short delay to show user the error
      const redirectTimer = setTimeout(() => {
        router.push('/login?error=no_restaurant_access')
      }, REDIRECT_DELAY.ERROR)

      return () => clearTimeout(redirectTimer)
    }
    return
  }, [auth?.isLoading, auth?.isVerifying, auth?.isAuthenticated, hasRestaurantAccess, restaurantId, router])

  // Update assistance notifications from notification data with deduplication
  useEffect(() => {
    if (notificationsData?.notifications) {
      const assistanceNotifs = notificationsData.notifications.filter(
        (notif: Notification) => notif.type === 'ASSISTANCE_REQUIRED' && !notif.isRead
      )

      // Deduplicate notifications by ID to prevent duplicates
      setAssistanceNotifications(prev => {
        const existingIds = new Set(prev.map((notif: Notification) => notif.id))
        const newNotifs = assistanceNotifs.filter((notif: Notification) => !existingIds.has(notif.id))

        if (newNotifs.length === 0 && prev.length === assistanceNotifs.length) {
          // No changes, return previous state to prevent re-renders
          return prev
        }

        // Return deduplicated list sorted by creation time (newest first)
        return assistanceNotifs.sort((a: Notification, b: Notification) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      })
    }
  }, [notificationsData])

  // WebSocket event listeners for real-time assistance requests
  const handleAssistanceRequested = useCallback((payload: any) => {
    logger.assistance('Assistance requested', payload)

    // Play assistance sound immediately
    playAssistanceSound()

    // Browser notification for background alerts
    if ('Notification' in window && Notification.permission === 'granted') {
      new window.Notification('🚨 Assistance Request', {
        body: `Table ${payload.tableId} needs assistance${payload.message ? ': ' + payload.message : ''}`,
        icon: '/favicon.ico',
        tag: 'assistance-request',
        requireInteraction: true
      })
    } else if ('Notification' in window && Notification.permission === 'default') {
      // Request permission for future notifications
      Notification.requestPermission()
    }

    // Refetch notifications to get the latest from server (single source of truth)
    refetchNotifications()
  }, [playAssistanceSound, refetchNotifications])

  useWebSocketEvent('assistance:requested', handleAssistanceRequested, [handleAssistanceRequested])

  // Note: notification:created event handler removed to prevent duplicate refetches
  // since assistance:requested already triggers refetchNotifications()

  // Note: Removed duplicate order:created and order:status_updated handlers
  // Dashboard metrics are automatically updated through React Query's invalidation cascade
  // when the Header component invalidates the orders cache

  const handlePaymentCompleted = useCallback((payload: any) => {
    logger.payment('Payment completed', payload)
    // Only invalidate revenue-related queries with throttling
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-metrics', restaurantId],
        exact: false
      })
      queryClient.invalidateQueries({
        queryKey: ['weekly-stats', restaurantId],
        exact: false
      })
    }, PAYMENT_INVALIDATION_DELAY)
  }, [queryClient, restaurantId])

  // Listen for payment events to keep dashboard in sync
  useWebSocketEvent('payment:completed', handlePaymentCompleted, [handlePaymentCompleted])

  // OPTIMIZATION: Memoize assistance handlers to prevent child re-renders
  const handleDismissAssistance = useCallback((notificationId: string) => {
    setAssistanceNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    )
  }, [])

  const handleAcknowledgeAssistance = useCallback((notificationId: string) => {
    setAssistanceNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    )
    // Refetch notifications to update the overall count
    refetchNotifications()
  }, [refetchNotifications])

  // OPTIMIZATION: Memoize event handlers to prevent child re-renders
  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true)
      await auth?.logout()
      router.push('/login')
    } catch (error) {
      logger.error('Logout error:', error as Error)
    } finally {
      setIsLoggingOut(false)
    }
  }, [auth, router])

  // OPTIMIZATION: Memoize stats calculation to prevent re-computation on every render
  const stats: DashboardStats = useMemo(() => {
    const metricsTyped = metricsData as DashboardStats | undefined | null
    return {
      todayOrders: metricsTyped?.todayOrders || 0,
      todayRevenue: metricsTyped?.todayRevenue || 0,
      activeTables: metricsTyped?.activeTables || 0,
      totalMenuItems: metricsTyped?.totalMenuItems || 0,
      averageOrderValue: metricsTyped?.averageOrderValue || 0,
      ordersTrend: metricsTyped?.ordersTrend || 0,
      revenueTrend: metricsTyped?.revenueTrend || 0,
      recentActivity: metricsTyped?.recentActivity || []
    }
  }, [metricsData])

  // OPTIMIZATION: Memoize formatting functions to prevent recreation on every render
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }, [])

  const formatTrend = useCallback((trend: number): string => {
    const sign = trend >= 0 ? '+' : ''
    return `${sign}${trend.toFixed(1)}%`
  }, [])

  const getTrendColor = useCallback((trend: number): string => {
    return trend >= 0 ? 'text-primary' : 'text-accent'
  }, [])

  // RENDER LOADING STATE - AFTER ALL HOOKS
  // Show loading during authentication verification or restaurant data loading
  if (auth?.isLoading || auth?.isVerifying || restaurantLoading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/80">
            {auth?.isVerifying ? 'Verifying credentials...' : 'Loading restaurant...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error if user doesn't have restaurant access (will auto-redirect)
  if (!hasRestaurantAccess || !restaurantId) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Restaurant Access Required</h2>
          <p className="text-foreground/80 mb-4">
            Your account is not associated with any restaurant. Please contact your administrator.
          </p>
          <p className="text-sm text-foreground/60 mb-4">
            User ID: {user?.id} | Role: {user?.role}
          </p>
          <p className="text-xs text-foreground/50 mb-4">
            Redirecting to login in 3 seconds...
          </p>
          <Button onClick={() => router.push('/login')} variant="outline">
            Sign In Again
          </Button>
        </div>
      </div>
    )
  }

  // Handle API error
  if (metricsError) {
    logger.error('Dashboard metrics error', metricsError)
    logger.error('Error details', {
      status: (metricsError as any)?.status,
      code: (metricsError as any)?.code,
      message: metricsError.message,
      details: (metricsError as any)?.details
    })
    
    // Check if it's an authentication error
    const isAuthError = (metricsError as any)?.status === 401 || 
                       (metricsError as any)?.status === 403 ||
                       metricsError.message?.includes('401') ||
                       metricsError.message?.includes('Unauthorized')
    
    if (isAuthError) {
      return (
        <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h2>
            <p className="text-foreground/80 mb-4">Your session has expired. Please sign in again.</p>
            <Button onClick={handleLogout}>Sign In Again</Button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Modern Responsive Header */}
      <Header
        user={user}
        restaurant={restaurant}
        restaurantName={restaurant?.name}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)]">
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                  <Button
                    className="w-full justify-start "
                    variant="outline"
                    onClick={() => setCurrentView('tables')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Table Management
                  </Button>
                  <Button
                    className="w-full justify-start "
                    variant="outline"
                    onClick={() => setCurrentView('payments')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment Management
                  </Button>
                  <Button
                    className="w-full justify-start "
                    variant="outline"
                    onClick={() => setCurrentView('feedback')}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Customer Feedback
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
        ) : currentView === 'tables' ? (
          <div className="h-full overflow-y-auto">
            {restaurantId ? (
              <TableManagement restaurantId={restaurantId} />
            ) : (
              <p className="text-foreground/80">No restaurant access available.</p>
            )}
          </div>
        ) : currentView === 'payments' ? (
          <div className="h-full overflow-y-auto">
            {restaurantId ? (
              <PaymentManagement restaurantId={restaurantId} />
            ) : (
              <p className="text-foreground/80">No restaurant access available.</p>
            )}
          </div>
        ) : currentView === 'feedback' ? (
          <div className="h-full overflow-y-auto">
            {restaurantId ? (
              <FeedbackManagement restaurantId={restaurantId} />
            ) : (
              <p className="text-foreground/80">No restaurant access available.</p>
            )}
          </div>
        ) : null}
      </main>

      {/* Assistance Alerts Overlay */}
      <AssistanceAlertsContainer
        notifications={assistanceNotifications}
        onDismiss={handleDismissAssistance}
        onAcknowledge={handleAcknowledgeAssistance}
      />

      {/* Payment Notifications Overlay */}
      {restaurantId && (
        <PaymentNotifications restaurantId={restaurantId} />
      )}
    </div>
  )
}