import { TabsyAPI, tabsyClient } from '@tabsy/api-client'
import { OrderStatus } from '@tabsy/shared-types'

// ===========================
// SENIOR ENGINEER SOLUTION: Simple Hook Factory Pattern for Dashboard
// ===========================

/**
 * Factory function that creates dashboard hooks with proper QueryClient injection
 * This is the clean, production-ready approach for monorepo shared hooks
 */
export function createDashboardHooks(useQuery: any) {
  return {
    useDashboardMetrics: (restaurantId: string, options?: any) => {
      // Use today from midnight instead of rolling 24 hours for better alignment with orders page
      // This makes the dashboard consistent with what users see in orders management
      const now = new Date()

      // Use today from midnight to midnight for current day metrics
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      // Yesterday from midnight to midnight for comparison
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
      const yesterdayEnd = new Date(todayStart.getTime() - 1)

      return useQuery({
        queryKey: ['dashboard-metrics', restaurantId],
        queryFn: async (): Promise<DashboardMetrics> => {
          console.log('useDashboardMetrics - Making API call:', {
            restaurantId,
            hasToken: !!tabsyClient.getAuthToken()
          })
          // Use the shared client instance that has the auth token
          const client = tabsyClient
          
          try {
            // SIMPLIFIED: Only fetch orders data - dashboard doesn't need live tables/menu data
            const allOrdersResponse = await client.order.getByRestaurant(restaurantId)
            const allOrders = Array.isArray(allOrdersResponse.data) ? allOrdersResponse.data : []

            // Filter today's orders manually
            const todayOrders = allOrders.filter((order: any) => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= todayStart && orderDate <= todayEnd
            })

            // Filter yesterday's orders manually
            const yesterdayOrders = allOrders.filter((order: any) => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= yesterdayStart && orderDate <= yesterdayEnd
            })

            // Fetch tables and menu data for dashboard metrics
            const [tablesResponse, menuResponse] = await Promise.all([
              client.table.list(restaurantId).catch(() => ({ data: [] })),
              client.menu.list(restaurantId).catch(() => ({ data: [] }))
            ])
            
            console.log('useDashboardMetrics - API responses:', {
              allOrders: allOrdersResponse,
              tables: tablesResponse,
              menus: menuResponse
            })

            // DEBUG: Log the actual orders with restaurant IDs and dates
            console.log('useDashboardMetrics - DEBUG: Raw order data:', {
              allOrdersResponseStructure: {
                success: allOrdersResponse.success,
                dataType: typeof allOrdersResponse.data,
                dataIsArray: Array.isArray(allOrdersResponse.data),
                dataLength: Array.isArray(allOrdersResponse.data) ? allOrdersResponse.data.length : 'not array',
                dataKeys: allOrdersResponse.data ? Object.keys(allOrdersResponse.data) : 'no data'
              },
              allOrdersCount: allOrders.length,
              todayOrdersCount: todayOrders.length,
              todayStart: todayStart.toISOString(),
              todayEnd: todayEnd.toISOString(),
              now: now.toISOString(),
              timezoneOffset: now.getTimezoneOffset(),
              localDateInfo: {
                original: now.toISOString(),
                todayStartLocal: todayStart.toString(),
                todayEndLocal: todayEnd.toString()
              },
              sampleAllOrders: allOrders.slice(0, 5).map((order: any) => ({
                id: order.id?.slice(-8),
                restaurantId: order.restaurantId,
                createdAt: order.createdAt,
                createdAtParsed: new Date(order.createdAt).toISOString(),
                createdAtLocal: new Date(order.createdAt).toString(),
                isAfterTodayStart: new Date(order.createdAt) >= todayStart,
                isBeforeTodayEnd: new Date(order.createdAt) <= todayEnd,
                qualifiesForToday: new Date(order.createdAt) >= todayStart && new Date(order.createdAt) <= todayEnd,
                total: order.total || order.totalAmount
              })),
              rawOrdersData: allOrdersResponse.data
            })
            
            // Process data - Use filtered orders from above
            const tablesData = tablesResponse.data || []
            const menusData = menuResponse.data || []

            // Ensure data is arrays (defensive programming)
            const tables = Array.isArray(tablesData) ? tablesData : []
            const menus = Array.isArray(menusData) ? menusData : []

            console.log('useDashboardMetrics - Date ranges:', {
              todayStart: todayStart.toISOString(),
              todayEnd: todayEnd.toISOString(),
              yesterdayStart: yesterdayStart.toISOString(),
              yesterdayEnd: yesterdayEnd.toISOString(),
              now: now.toISOString()
            })

            console.log('useDashboardMetrics - Processed arrays:', {
              allOrders: { length: allOrders.length, isArray: Array.isArray(allOrders) },
              todayOrders: {
                length: todayOrders.length,
                isArray: Array.isArray(todayOrders),
                sampleDates: todayOrders.slice(0, 3).map((order: any) => ({
                  id: order.id?.slice(-8),
                  createdAt: order.createdAt,
                  updatedAt: order.updatedAt
                }))
              },
              yesterdayOrders: { length: yesterdayOrders.length, isArray: Array.isArray(yesterdayOrders) },
              tables: { length: tables.length, isArray: Array.isArray(tables) },
              menus: { length: menus.length, isArray: Array.isArray(menus) }
            })

            // Calculate metrics
            const todayOrdersCount = todayOrders.length
            const yesterdayOrdersCount = yesterdayOrders.length

            // Calculate revenue with proper number parsing to fix concatenation bug
            const todayRevenue = todayOrders.reduce((sum: number, order: any) => {
              const orderAmount = parseFloat(order.totalAmount || order.total || '0')
              return sum + (isNaN(orderAmount) ? 0 : orderAmount)
            }, 0)
            const yesterdayRevenue = yesterdayOrders.reduce((sum: number, order: any) => {
              const orderAmount = parseFloat(order.totalAmount || order.total || '0')
              return sum + (isNaN(orderAmount) ? 0 : orderAmount)
            }, 0)

            // Debug: Log revenue calculation details
            console.log('useDashboardMetrics - Revenue calculation:', {
              todayOrdersCount: todayOrders.length,
              todayRevenue,
              yesterdayRevenue,
              sampleTodayOrders: todayOrders.slice(0, 3).map((order: any) => ({
                id: order.id?.slice(-8),
                totalAmount: order.totalAmount,
                total: order.total,
                price: order.price,
                createdAt: order.createdAt,
                allMoneyFields: Object.keys(order).filter(key => key.toLowerCase().includes('total') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('price'))
              }))
            })
            
            // Calculate active tables (tables with OCCUPIED status or active sessions)
            const activeTables = tables.filter((table: any) =>
              table.status === 'OCCUPIED' || table.status === 'RESERVED'
            ).length

            // Calculate total active menu items
            const totalMenuItems = menus.reduce((count: number, menu: any) => {
              const categories = menu.categories || []
              return count + categories.reduce((itemCount: number, category: any) => {
                const items = category.items || []
                return itemCount + items.filter((item: any) => item.active !== false).length
              }, 0)
            }, 0)
            
            const averageOrderValue = todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0
            
            // Calculate trends (percentage change from yesterday)
            const ordersTrend = yesterdayOrdersCount > 0 
              ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100 
              : todayOrdersCount > 0 ? 100 : 0
            
            const revenueTrend = yesterdayRevenue > 0 
              ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
              : todayRevenue > 0 ? 100 : 0
            
            // Generate recent activity from all recent orders, not just today's
            const recentActivity = allOrders
              .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
              .slice(0, 10)
              .map((order: any) => ({
                id: order.id,
                type: 'order' as const,
                message: `Order #${order.orderNumber || order.id.slice(-8)} ${getOrderStatusMessage(order.status)}`,
                timestamp: new Date(order.updatedAt || order.createdAt),
                metadata: { order }
              }))
            
            const result = {
              todayOrders: todayOrdersCount,
              todayRevenue,
              activeTables,
              totalMenuItems,
              averageOrderValue,
              ordersTrend,
              revenueTrend,
              recentActivity
            }
            
            console.log('useDashboardMetrics - Final result:', result)
            return result
          } catch (error) {
            console.error('useDashboardMetrics - Error:', error)
            throw error
          }
        },
        enabled: !!restaurantId && (options?.enabled !== false),
        staleTime: 0, // Always fetch fresh data for debugging
        cacheTime: 0, // Don't cache for debugging
        refetchOnMount: true, // Always refetch on mount
        refetchOnWindowFocus: true, // Refetch when window gets focus
        refetchInterval: false,
        refetchIntervalInBackground: false,
        // Merge with passed options, allowing caller to override defaults
        ...options
      })
    },

    useTodayOrders: (restaurantId: string) => {
      // Use today from midnight for consistency with dashboard metrics
      const now = new Date()

      // Use local time zone properly - don't adjust for timezone offset
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      return useQuery({
        queryKey: ['orders', 'today', restaurantId],
        queryFn: async () => {
          console.log('useTodayOrders - Making API call:', {
            restaurantId,
            hasToken: !!tabsyClient.getAuthToken()
          })
          // Fetch all orders and filter manually for accurate date-based results
          const result = await tabsyClient.order.getByRestaurant(restaurantId)

          // Filter manually for today's orders
          if (result.data && Array.isArray(result.data)) {
            const allOrders = result.data
            const todayOrders = allOrders.filter((order: any) => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= todayStart && orderDate <= todayEnd
            })
            // Update the result structure to return only the filtered orders array
            result.data = todayOrders
          }

          console.log('useTodayOrders - API result:', result)
          return result
        },
        enabled: !!restaurantId,
        staleTime: 60000, // 1 minute
        refetchOnMount: true,
        refetchOnWindowFocus: false
        // Removed refetchInterval - rely on WebSocket for real-time updates
      })
    },

    useWeeklyOrderStats: (restaurantId: string, options?: any) => {
      // Stabilize date by using day-based timestamp to prevent infinite re-renders
      const now = new Date()
      const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(currentDay.getTime() - 6 * 24 * 60 * 60 * 1000) // Last 7 days

      return useQuery({
        queryKey: ['orders', 'weekly', restaurantId],
        queryFn: async () => {
          console.log('useWeeklyOrderStats - Making API call:', {
            restaurantId,
            hasToken: !!tabsyClient.getAuthToken()
          })
          // Use the shared client instance that has the auth token
          const client = tabsyClient
          // Fetch all orders and apply manual date filtering for weekly stats
          const response = await client.order.getByRestaurant(restaurantId)

          console.log('useWeeklyOrderStats - API response:', response)

          // Filter orders manually for the last week since backend ignores date filters
          // Extract orders from correct API structure: response.data (already array)
          const allOrders = Array.isArray(response.data) ? response.data : []
          const orders = allOrders.filter((order: any) => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= startOfWeek && orderDate <= new Date()
          })

          console.log('useWeeklyOrderStats - Processed orders:', {
            orders: { length: orders.length, isArray: Array.isArray(orders) }
          })
          const dailyStats = []
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)
            
            const nextDate = new Date(date)
            nextDate.setDate(nextDate.getDate() + 1)
            
            const dayOrders = orders.filter((order: any) => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= date && orderDate < nextDate
            })
            
            const dayRevenue = dayOrders.reduce((sum: number, order: any) => {
              const orderAmount = parseFloat(order.totalAmount || order.total || '0')
              return sum + (isNaN(orderAmount) ? 0 : orderAmount)
            }, 0)
            
            dailyStats.push({
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              date: date.toISOString().split('T')[0],
              orders: dayOrders.length,
              revenue: dayRevenue
            })
          }
          
          return { data: dailyStats }
        },
        enabled: !!restaurantId && (options?.enabled !== false),
        staleTime: 0, // Always fetch fresh data for debugging
        cacheTime: 0, // Don't cache for debugging
        refetchOnMount: true, // Always refetch on mount
        refetchOnWindowFocus: true, // Refetch when window gets focus
        refetchInterval: false,
        refetchIntervalInBackground: false,
        // Merge with passed options, allowing caller to override defaults
        ...options
      })
    },

    useDashboardTables: (restaurantId: string) => {
      return useQuery({
        queryKey: ['dashboard', 'tables', restaurantId],
        queryFn: async () => {
          console.log('useDashboardTables - Making API call:', {
            restaurantId,
            hasToken: !!tabsyClient.getAuthToken()
          })
          try {
            // Use the shared client instance that has the auth token
            const client = tabsyClient
            const result = await client.table.list(restaurantId)
            console.log('useDashboardTables - API result:', result)
            return result
          } catch (error: any) {
            console.error('useDashboardTables - Error:', error)
            // Return empty result on error to prevent infinite retries
            if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
              return { data: [], success: true }
            }
            throw error
          }
        },
        enabled: !!restaurantId,
        staleTime: 300000, // 5 minutes - increased to reduce API calls
        refetchOnMount: false, // Don't refetch on mount to reduce initial load
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Don't retry rate limit errors
          if (error?.status === 429 || error?.code === 'RATE_LIMIT_EXCEEDED') {
            return false
          }
          // Only retry up to 2 times for other errors
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
      })
    }
  }
}

export interface DashboardMetrics {
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
    metadata?: any
  }>
}

// ===========================
// STANDALONE HOOKS FOR DIRECT IMPORT
// Note: These require @tanstack/react-query to be installed in the consuming app
// ===========================

/**
 * Standalone version of useTodayOrders hook
 * Requires @tanstack/react-query useQuery to be available in the consuming app
 */
export function useTodayOrders(restaurantId: string) {
  // This is a simplified version that works with the factory pattern
  // The actual implementation will be provided by the consuming app
  // through dependency injection or direct import of @tanstack/react-query

  // Use today from midnight for consistency with dashboard metrics
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // Import useQuery dynamically if available
  let useQuery: any
  try {
    // Use dynamic import for ES modules
    if (typeof window !== 'undefined') {
      useQuery = (globalThis as any).__TABSY_USE_QUERY__ || null
    }
  } catch (error) {
    console.warn('useQuery not available for useTodayOrders')
  }

  if (!useQuery) {
    // Throw an error if useQuery is not available - no mock fallback
    throw new Error('useQuery from @tanstack/react-query is required but not available. Please ensure @tanstack/react-query is properly installed and configured.')
  }

  return useQuery({
    queryKey: ['orders', 'today', restaurantId],
    queryFn: async () => {
      console.log('useTodayOrders - Making API call:', {
        restaurantId,
        hasToken: !!tabsyClient.getAuthToken()
      })
      // Fetch all orders and filter manually for today's orders
      const result = await tabsyClient.order.getByRestaurant(restaurantId)

      // Filter manually for today's orders
      if (result.data && Array.isArray(result.data)) {
        const allOrders = result.data
        const todayOrders = allOrders.filter((order: any) => {
          const orderDate = new Date(order.createdAt)
          return orderDate >= todayStart && orderDate <= todayEnd
        })
        // Update the result structure to return only the filtered orders array
        result.data = todayOrders
      }

      console.log('useTodayOrders - API result:', result)
      return result
    },
    enabled: !!restaurantId,
    staleTime: 300000, // 5 minutes - rely on WebSocket for real-time updates
    refetchOnMount: true,
    refetchOnWindowFocus: false
    // Removed refetchInterval - rely on WebSocket for real-time updates
  })
}

// ===========================
// HELPER FUNCTIONS
// ===========================

function getOrderStatusMessage(status: keyof typeof OrderStatus): string {
  switch (status) {
    case OrderStatus.RECEIVED:
      return 'was received'
    case OrderStatus.PREPARING:
      return 'is being prepared'
    case OrderStatus.READY:
      return 'is ready'
    case OrderStatus.DELIVERED:
      return 'was delivered'
    case OrderStatus.COMPLETED:
      return 'was completed'
    case OrderStatus.CANCELLED:
      return 'was cancelled'
    default:
      return 'status updated'
  }
}