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
      // Use today from midnight instead of rolling 24 hours for better alignment with orders page
      // This makes the dashboard consistent with what users see in orders management
      const now = new Date()
      // Today from midnight (more intuitive for business metrics)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

      // Yesterday from midnight to midnight for comparison
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
      const yesterdayEnd = new Date(todayStart.getTime() - 1)

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
            // Fetch all orders for restaurant and filter manually on frontend
            // Note: Backend API requires manual filtering due to date parameter limitations
            const allOrdersResponse = await client.order.getByRestaurant(restaurantId)

            // Filter orders manually on frontend since backend ignores date filters
            // Extract orders from correct API structure: response.data.orders
            const allOrders = Array.isArray(allOrdersResponse.data?.orders) ? allOrdersResponse.data.orders : []

            // Filter today's orders manually
            const todayOrders = allOrders.filter((order: any) => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= todayStart && orderDate <= now
            })

            // Filter yesterday's orders manually
            const yesterdayOrders = allOrders.filter((order: any) => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= yesterdayStart && orderDate <= yesterdayEnd
            })

            // Create fake response structure to match expected format
            const todayOrdersResponse = { data: todayOrders }
            const yesterdayOrdersResponse = { data: yesterdayOrders }
            
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
              allOrders: allOrdersResponse,
              tables: tablesResponse,
              menus: menuResponse
            })

            // DEBUG: Log the actual orders with restaurant IDs
            console.log('useDashboardMetrics - DEBUG: Raw order data:', {
              allOrdersData: allOrdersResponse.data,
              allOrdersCount: allOrders.length,
              todayOrdersCount: todayOrders.length,
              sampleAllOrders: allOrders.slice(0, 3).map((order: any) => ({
                id: order.id?.slice(-8),
                restaurantId: order.restaurantId,
                createdAt: order.createdAt,
                total: order.total || order.totalAmount
              })),
              sampleTodayOrders: todayOrders.slice(0, 3).map((order: any) => ({
                id: order.id?.slice(-8),
                restaurantId: order.restaurantId,
                createdAt: order.createdAt,
                total: order.total || order.totalAmount
              }))
            })
            
            // Process data - Use filtered orders from above
            const tablesData = tablesResponse.data || []
            const menusData = menuResponse.data || []

            // Ensure data is arrays (defensive programming)
            const tables = Array.isArray(tablesData) ? tablesData : []
            const menus = Array.isArray(menusData) ? menusData : []

            console.log('useDashboardMetrics - Date ranges:', {
              todayStart: todayStart.toISOString(),
              todayEnd: new Date().toISOString(),
              yesterdayStart: yesterdayStart.toISOString(),
              yesterdayEnd: yesterdayEnd.toISOString()
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
            
            // Calculate active tables - check what statuses actually exist and count non-AVAILABLE tables
            const activeTables = tables.filter((table: any) =>
              table.status && table.status !== 'AVAILABLE'
            ).length

            // Debug: Log table status distribution
            const tableStatuses = tables.reduce((acc: any, table: any) => {
              acc[table.status] = (acc[table.status] || 0) + 1
              return acc
            }, {})
            console.log('useDashboardMetrics - Table status distribution:', {
              totalTables: tables.length,
              activeTables,
              statusBreakdown: tableStatuses,
              sampleTables: tables.slice(0, 3).map((table: any) => ({
                id: table.id?.slice(-8),
                name: table.name,
                status: table.status
              }))
            })
            
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
        enabled: !!restaurantId,
        staleTime: 60000, // 1 minute - dashboard metrics don't need frequent updates
        refetchOnMount: true,
        refetchOnWindowFocus: false
        // Removed refetchInterval - rely on WebSocket for real-time updates
      })
    },

    useTodayOrders: (restaurantId: string) => {
      // Use today from midnight for consistency with dashboard metrics
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

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
          if (result.data?.orders && Array.isArray(result.data.orders)) {
            const allOrders = result.data.orders
            const todayOrders = allOrders.filter((order: any) => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= todayStart && orderDate <= now
            })
            // Update the result structure to match expected format
            result.data = { ...result.data, orders: todayOrders, totalCount: todayOrders.length }
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

    useWeeklyOrderStats: (restaurantId: string) => {
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
          // Extract orders from correct API structure: response.data.orders
          const allOrders = Array.isArray(response.data?.orders) ? response.data.orders : []
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
        enabled: !!restaurantId,
        staleTime: 300000, // 5 minutes - weekly stats change infrequently
        refetchOnMount: true
        // Removed refetchInterval - weekly stats don't need frequent updates
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
        staleTime: 120000, // 2 minutes
        refetchOnMount: true
        // Removed refetchInterval - rely on WebSocket for real-time updates
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
      if (result.data?.orders && Array.isArray(result.data.orders)) {
        const allOrders = result.data.orders
        const todayOrders = allOrders.filter((order: any) => {
          const orderDate = new Date(order.createdAt)
          return orderDate >= todayStart && orderDate <= now
        })
        // Update the result structure to match expected format
        result.data = { ...result.data, orders: todayOrders, totalCount: todayOrders.length }
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