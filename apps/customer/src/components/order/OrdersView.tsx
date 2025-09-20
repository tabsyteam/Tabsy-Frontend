'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  RefreshCw,
  Plus,
  AlertCircle,
  Receipt
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useApi } from '@/components/providers/api-provider'
import { OrderStatus, Order as ApiOrder } from '@tabsy/shared-types'
import { SessionManager } from '@/lib/session'
import { useWebSocket, useWebSocketEvent } from '@tabsy/api-client'
import { OrderFilterPills, FilterStatus, filterOrdersByStatus } from './OrderFilterPills'
import { OrderCard } from './OrderCard'

// Using Order and OrderItem types from shared-types
type Order = ApiOrder & {
  restaurantName?: string // Additional field for display
}

// API Response types
interface OrderListResponse {
  orders: ApiOrder[]
  totalCount: number
}

// Type guard to check if response is paginated
function isPaginatedResponse(data: any): data is OrderListResponse {
  return data && typeof data === 'object' && Array.isArray(data.orders) && typeof data.totalCount === 'number'
}


export function OrdersView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<FilterStatus[]>(['all'])

  // Get view from URL parameters - 'my' for personal orders, 'table' for shared orders
  const view = searchParams.get('view') || 'my'
  const [currentView, setCurrentView] = useState<'my' | 'table'>(() => {
    // Ensure we respect the URL parameter on initial load/refresh
    const urlView = searchParams.get('view')
    return (urlView === 'table' ? 'table' : 'my') as 'my' | 'table'
  })

  // Check for session or order history
  const session = SessionManager.getDiningSession()
  const canAccess = SessionManager.canAccessOrders()

  // Set up WebSocket connection for real-time updates (only if in table session)
  const { client: wsClient } = useWebSocket({
    auth: session ? {
      namespace: 'customer',
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      sessionId: api.getGuestSessionId() || ''
    } : undefined,
    autoConnect: !!session
  })

  // Update view when URL parameter changes
  useEffect(() => {
    const urlView = searchParams.get('view')
    const newView = urlView === 'table' ? 'table' : 'my'

    if (currentView !== newView) {
      console.log(`[ViewUpdate] Updating view from ${currentView} to ${newView} based on URL parameter`)
      setCurrentView(newView)
    }
  }, [searchParams, currentView])

  // Load orders
  useEffect(() => {
    if (canAccess) {
      console.log('=== LOAD ORDERS EFFECT DEBUG ===')
      console.log('URL view parameter:', searchParams.get('view'))
      console.log('Current view state:', currentView)
      console.log('Loading orders...')
      loadOrders()
    } else {
      setLoading(false)
    }
  }, [canAccess, currentView, searchParams])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const allOrders: Order[] = []

      // Always check URL parameter directly to avoid timing issues
      const urlView = searchParams.get('view')
      const actualView = urlView === 'table' ? 'table' : 'my'

      // Debug session information
      console.log('=== ORDER LOADING DEBUG ===')
      console.log('Current view state:', currentView)
      console.log('URL view parameter:', urlView)
      console.log('Actual view to use:', actualView)
      console.log('Session:', session)
      console.log('Guest session ID:', api.getGuestSessionId())
      console.log('Can access orders:', canAccess)
      console.log('loadOrders() called at:', new Date().toISOString())

      // Update currentView if it doesn't match the URL parameter
      if (currentView !== actualView) {
        console.log(`Correcting view state from ${currentView} to ${actualView}`)
        setCurrentView(actualView)
      }

      if (actualView === 'my' && session) {
        // Load personal orders (current user's orders only)
        const currentUserSessionId = api.getGuestSessionId()
        console.log('Loading personal orders for session:', currentUserSessionId)

        if (currentUserSessionId && currentUserSessionId !== 'null' && currentUserSessionId !== 'undefined') {
          try {
            // Filter by guest session ID (maps to guestSessionId in backend)
            const response = await api.order.list({ sessionId: currentUserSessionId })
            console.log('Personal orders API response:', response)

            if (response.success && response.data) {
              // Handle both direct array and paginated response structure
              let ordersArray: ApiOrder[] = []

              if (Array.isArray(response.data)) {
                // Direct array response
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                // Paginated response with {orders: [], totalCount: number} structure
                ordersArray = response.data.orders
                console.log(`Found ${response.data.totalCount} personal orders for current user`)
              } else {
                console.warn('Personal orders API response.data has unexpected structure:', typeof response.data, response.data)
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))
                allOrders.push(...apiOrders)
                console.log(`Loaded ${apiOrders.length} personal orders for current user`)
              }
            } else {
              console.warn('Personal orders API response not successful or no data:', response)
            }
          } catch (apiError) {
            console.warn('Failed to load personal orders from API:', apiError)
          }
        } else {
          console.warn('No valid guest session ID found for personal orders. guestSessionId:', currentUserSessionId)
        }
      } else if (actualView === 'table' && session) {
        // Load table orders (shared orders for all users at the table session)
        const tableSessionId = session.tableSessionId || sessionStorage.getItem('tabsy-table-session-id')
        console.log('Loading table orders for table session:', tableSessionId)
        console.log('Available session keys in sessionStorage:', Object.keys(sessionStorage))
        console.log('All session storage items:', Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])))

        if (tableSessionId && tableSessionId !== 'null' && tableSessionId !== 'undefined') {
          try {
            // Use order.list with tableSessionId filter for consistent backend handling
            console.log('Making API call with tableSessionId:', tableSessionId)
            const response = await api.order.list({ tableSessionId: tableSessionId })
            console.log('Table orders API response:', response)

            if (response.success && response.data) {
              // Handle both direct array and paginated response structure
              let ordersArray: ApiOrder[] = []

              if (Array.isArray(response.data)) {
                // Direct array response
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                // Paginated response with {orders: [], totalCount: number} structure
                ordersArray = response.data.orders
                console.log(`Found ${response.data.totalCount} table orders for table session`)
              } else {
                console.warn('Table orders API response.data has unexpected structure:', typeof response.data, response.data)
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))
                allOrders.push(...apiOrders)
                console.log(`Loaded ${apiOrders.length} table orders for table session`)
              }
            } else {
              console.warn('Table orders API response not successful or no data:', response)
            }
          } catch (apiError) {
            console.warn('Failed to load table orders from API:', apiError)
          }
        } else {
          console.warn('No valid table session ID found for table orders. tableSessionId:', tableSessionId)
        }
      }

      // No fallback to sessionStorage - rely purely on session-based API filtering
      console.log(`Loaded ${allOrders.length} orders from API for view: ${actualView} (currentView state: ${currentView})`)

      // Sort orders by creation date (newest first)
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setOrders(allOrders)
    } catch (err: any) {
      console.error('Failed to load orders:', err)
      setError('Failed to load your orders')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadOrders()
  }

  const handleOrderClick = (orderId: string) => {
    const queryParams = SessionManager.getDiningQueryParams()
    router.push(`/order/${orderId}${queryParams}`)
  }

  // Debounced version to prevent rapid successive calls
  const loadOrdersTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedLoadOrders = useCallback(() => {
    if (loadOrdersTimeoutRef.current) {
      clearTimeout(loadOrdersTimeoutRef.current)
    }
    loadOrdersTimeoutRef.current = setTimeout(() => {
      console.log('[OrdersView] Executing debounced loadOrders...')
      loadOrders()
    }, 150) // 150ms debounce to prevent rapid calls
  }, [])

  const handleNewOrder = () => {
    router.push(SessionManager.getMenuUrl())
  }

  const handleViewChange = (newView: 'my' | 'table') => {
    const queryParams = SessionManager.getDiningQueryParams()
    router.push(`/orders${queryParams}&view=${newView}`)
  }

  // WebSocket event handlers for real-time updates
  const handleOrderCreated = (data: any) => {
    console.log('[OrdersView] New order created:', data)
    if (data.tableId === session?.tableId) {
      console.log('[OrdersView] New order at our table - triggering reload to get latest data')
      // Simple approach: just reload data and let loadOrders() handle the view logic
      debouncedLoadOrders()
    }
  }

  const handleOrderStatusUpdate = (data: any) => {
    console.log('[OrdersView] Order status updated:', data)
    console.log('[OrdersView] Status update details:', {
      orderId: data.orderId,
      newStatus: data.newStatus,
      newStatusType: typeof data.newStatus,
      currentStatus: data.currentStatus || data.status,
      fullData: JSON.stringify(data, null, 2)
    })

    // Validate the new status before updating
    const newStatus = data.newStatus || data.status
    if (!newStatus || newStatus === 'undefined') {
      console.warn('[OrdersView] Invalid status in WebSocket update, skipping status update:', data)
      return
    }

    // Update the specific order in the list
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === data.orderId
          ? { ...order, status: newStatus }
          : order
      )
    )
  }

  const handleOrderUpdate = (data: any) => {
    console.log('[OrdersView] Order updated:', data)
    if (data.tableId === session?.tableId) {
      console.log('[OrdersView] Order update at our table - triggering reload to get latest data')
      // Simple approach: just reload data and let loadOrders() handle the view logic
      debouncedLoadOrders()
    }
  }

  // Set up WebSocket event listeners
  useWebSocketEvent(wsClient, 'order:created', handleOrderCreated, [handleOrderCreated, session?.tableId])
  useWebSocketEvent(wsClient, 'order:status_updated', handleOrderStatusUpdate, [handleOrderStatusUpdate])
  useWebSocketEvent(wsClient, 'order:updated', handleOrderUpdate, [handleOrderUpdate])

  // Filter orders based on selected filters
  const filteredOrders = filterOrdersByStatus(orders, selectedFilters)

  // Get counts for different order states
  const activeOrdersCount = orders.filter(order =>
    ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)
  ).length

  const completedOrdersCount = orders.filter(order =>
    order.status === OrderStatus.COMPLETED
  ).length


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-surface shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="h-8 w-32 bg-surface-secondary rounded animate-pulse mb-2" />
            <div className="h-5 w-48 bg-surface-secondary rounded animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  // Show "scan QR" message if no valid session or order history
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto bg-surface-secondary rounded-full flex items-center justify-center">
            <Receipt className="w-8 h-8 text-content-tertiary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Track Your Orders
            </h1>
            <p className="text-content-secondary mb-4">
              Your order history and real-time tracking will appear here once you scan the QR code at your table and place an order.
            </p>
            <div className="text-sm text-content-tertiary space-y-1">
              <p>• Scan the QR code at your table</p>
              <p>• Browse menu and place orders</p>
              <p>• Track order status in real-time</p>
              <p>• View complete order history</p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/')}
            className="w-full"
          >
            Scan QR Code to Get Started
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Unable to Load Orders
            </h1>
            <p className="text-content-secondary">{error}</p>
          </div>
          <Button onClick={handleRefresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">
                {currentView === 'my' ? 'My Orders' : 'Table Orders'}
              </h1>
              <p className="text-content-secondary">
                {currentView === 'my'
                  ? 'Track your current and past orders'
                  : 'All orders for your table session'
                }
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* View Toggle */}
          {session && (
            <div className="flex space-x-1 mt-6 bg-background-secondary rounded-lg p-1">
              <button
                onClick={() => handleViewChange('my')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'my'
                    ? 'bg-surface text-content-primary shadow-sm'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                My Orders
              </button>
              <button
                onClick={() => handleViewChange('table')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'table'
                    ? 'bg-surface text-content-primary shadow-sm'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                Table Orders
              </button>
            </div>
          )}

          {/* Filter Pills */}
          {orders.length > 0 && (
            <div className="mt-4">
              <OrderFilterPills
                orders={orders}
                selectedFilters={selectedFilters}
                onFiltersChange={setSelectedFilters}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-content-primary mb-2">
              {orders.length === 0
                ? `No ${currentView === 'table' ? 'table' : ''} orders yet`
                : `No ${selectedFilters.includes('all') ? '' : 'matching '}orders found`
              }
            </h3>
            <p className="text-content-secondary mb-6">
              {orders.length === 0
                ? currentView === 'table'
                  ? 'No orders have been placed at your table yet. Be the first to order!'
                  : 'Ready to place your first order? Browse our delicious menu!'
                : selectedFilters.includes('all')
                  ? 'All orders have been filtered out'
                  : 'Try adjusting your filters to see more orders'
              }
            </p>
            {(orders.length === 0 || activeOrdersCount > 0) && (
              <Button onClick={handleNewOrder}>
                <Plus className="w-4 h-4 mr-2" />
                Order Now
              </Button>
            )}
          </div>
        )}

        {/* Orders List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedFilters.join(',')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={handleOrderClick}
                showCustomer={currentView === 'table'}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Floating Action Button for New Order */}
        {activeOrdersCount > 0 && filteredOrders.length > 0 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNewOrder}
            className="fixed bottom-28 right-4 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 z-40"
          >
            <Plus size={24} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>
    </div>
  )
}