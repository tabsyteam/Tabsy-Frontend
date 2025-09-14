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
    useDashboardMetrics: (restaurantId: string) => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      
      const yesterdayEnd = new Date(todayStart)
      yesterdayEnd.setMilliseconds(yesterdayEnd.getMilliseconds() - 1)

      return useQuery({
        queryKey: ['dashboard-metrics', restaurantId, todayStart.toISOString()],
        queryFn: async (): Promise<DashboardMetrics> => {
          console.log('useDashboardMetrics - Making API call:', {
            restaurantId,
            hasToken: !!tabsyClient.getAuthToken()
          })
          // Use the shared client instance that has the auth token
          const client = tabsyClient
          
          try {
            // Fetch today's orders
            const todayOrdersResponse = await client.order.getByRestaurant(restaurantId, {
              dateFrom: todayStart.toISOString(),
              dateTo: new Date().toISOString()
            })
            
            // Fetch yesterday's orders for trend calculation
            const yesterdayOrdersResponse = await client.order.getByRestaurant(restaurantId, {
              dateFrom: yesterdayStart.toISOString(),
              dateTo: yesterdayEnd.toISOString()
            })
            
            // Fetch restaurant tables (handle 404 gracefully)
            let tablesResponse
            try {
              tablesResponse = await client.table.list(restaurantId)
            } catch (tableError: any) {
              console.warn('Tables fetch failed, using empty array:', tableError)
              tablesResponse = { data: [] }
            }
            
            // Fetch restaurant menu to count items (handle 404 gracefully)
            let menuResponse
            try {
              menuResponse = await client.menu.listMenus(restaurantId)
            } catch (menuError: any) {
              console.warn('Menu fetch failed, using empty array:', menuError)
              menuResponse = { data: [] }
            }
            
            console.log('useDashboardMetrics - API responses:', {
              todayOrders: todayOrdersResponse,
              tables: tablesResponse,
              menus: menuResponse
            })
            
            // Process data - Fix: Extract orders from the correct data structure
            const todayOrders = todayOrdersResponse.data?.orders || []
            const yesterdayOrders = yesterdayOrdersResponse.data?.orders || []
            const tables = tablesResponse.data || []
            const menus = menuResponse.data || []
            
            // Calculate metrics
            const todayOrdersCount = todayOrders.length
            const yesterdayOrdersCount = yesterdayOrders.length
            
            const todayRevenue = todayOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
            const yesterdayRevenue = yesterdayOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
            
            const activeTables = tables.filter((table: any) => table.status === 'OCCUPIED' || table.status === 'RESERVED').length
            
            const totalMenuItems = menus.reduce((sum: number, menu: any) => {
              return sum + (menu.categories?.reduce((catSum: number, category: any) => {
                return catSum + (category.items?.length || 0)
              }, 0) || 0)
            }, 0)
            
            const averageOrderValue = todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0
            
            // Calculate trends (percentage change from yesterday)
            const ordersTrend = yesterdayOrdersCount > 0 
              ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100 
              : todayOrdersCount > 0 ? 100 : 0
            
            const revenueTrend = yesterdayRevenue > 0 
              ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
              : todayRevenue > 0 ? 100 : 0
            
            // Generate recent activity
            const recentActivity = todayOrders
              .slice(-10)
              .reverse()
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
        enabled: !!restaurantId,
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
      })
    },

    useTodayOrders: (restaurantId: string) => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      return useQuery({
        queryKey: ['orders', 'today', restaurantId],
        queryFn: async () => {
          console.log('useTodayOrders - Making API call:', {
            restaurantId,
            hasToken: !!tabsyClient.getAuthToken()
          })
          const result = await tabsyClient.order.getByRestaurant(restaurantId, {
            dateFrom: todayStart.toISOString(),
            dateTo: new Date().toISOString()
          })
          console.log('useTodayOrders - API result:', result)
          return result
        },
        enabled: !!restaurantId,
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchInterval: 15000 // Refetch every 15 seconds
      })
    },

    useWeeklyOrderStats: (restaurantId: string) => {
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - 6) // Last 7 days
      startOfWeek.setHours(0, 0, 0, 0)
      
      return useQuery({
        queryKey: ['orders', 'weekly', restaurantId],
        queryFn: async () => {
          console.log('useWeeklyOrderStats - Making API call:', {
            restaurantId,
            hasToken: !!tabsyClient.getAuthToken()
          })
          // Use the shared client instance that has the auth token
          const client = tabsyClient
          const response = await client.order.getByRestaurant(restaurantId, {
            dateFrom: startOfWeek.toISOString(),
            dateTo: new Date().toISOString()
          })
          
          console.log('useWeeklyOrderStats - API response:', response)
          
          // Group orders by day for chart data - Fix: Extract orders from correct structure
          const orders = response.data?.orders || []
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
            
            const dayRevenue = dayOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
            
            dailyStats.push({
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              date: date.toISOString().split('T')[0],
              orders: dayOrders.length,
              revenue: dayRevenue
            })
          }
          
          return { data: dailyStats }
        },
        enabled: !!restaurantId,
        staleTime: 0,
        refetchOnMount: true,
        refetchInterval: 60000 // Refetch every minute
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
          // Use the shared client instance that has the auth token
          const client = tabsyClient
          const result = await client.table.list(restaurantId)
          console.log('useDashboardTables - API result:', result)
          return result
        },
        enabled: !!restaurantId,
        staleTime: 0,
        refetchOnMount: true,
        refetchInterval: 30000 // Refetch every 30 seconds
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
  
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
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
    // Return a mock implementation if useQuery is not available
    return {
      data: null,
      isLoading: false,
      error: new Error('useQuery from @tanstack/react-query is required but not available'),
      refetch: () => Promise.resolve()
    }
  }
  
  return useQuery({
    queryKey: ['orders', 'today', restaurantId],
    queryFn: async () => {
      console.log('useTodayOrders - Making API call:', {
        restaurantId,
        hasToken: !!tabsyClient.getAuthToken()
      })
      const result = await tabsyClient.order.getByRestaurant(restaurantId, {
        dateFrom: todayStart.toISOString(),
        dateTo: new Date().toISOString()
      })
      console.log('useTodayOrders - API result:', result)
      return result
    },
    enabled: !!restaurantId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: 15000 // Refetch every 15 seconds
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