'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { OrderFilterPills, FilterStatus, filterOrdersByStatus } from './OrderFilterPills'
import { OrderCard } from './OrderCard'
import { processOrderUpdatePayload } from '@/utils/websocket'

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

  // Get guest session ID once and memoize it to prevent infinite re-renders
  const guestSessionId = useMemo(() => api.getGuestSessionId(), [])

  // Get tableSessionId with fallback - memoized for consistency throughout component
  const tableSessionId = useMemo(() => {
    return session?.tableSessionId || (typeof window !== 'undefined' ? sessionStorage.getItem('tabsy-table-session-id') : null)
  }, [session?.tableSessionId])

  // Track if initial orders have been loaded to prevent unnecessary refetches
  const ordersLoadedRef = useRef(false)
  const initialLoadInProgressRef = useRef(false)

  // Use global WebSocket connection for real-time updates
  const { client: wsClient, isConnected: wsConnected } = useWebSocket()

  // Update view when URL parameter changes
  useEffect(() => {
    const urlView = searchParams.get('view')
    const newView = urlView === 'table' ? 'table' : 'my'

    if (currentView !== newView) {
      console.log(`[ViewUpdate] Updating view from ${currentView} to ${newView} based on URL parameter`)
      setCurrentView(newView)
    }
  }, [searchParams]) // FIXED: Removed currentView from dependencies to prevent infinite loop

  // Initial load only - prevent flickering and unnecessary API calls
  useEffect(() => {
    // Extra protection against infinite loops
    if (ordersLoadedRef.current || initialLoadInProgressRef.current) {
      console.log('[OrdersView] Skipping duplicate initial load')
      return
    }

    if (canAccess) {
      console.log('=== INITIAL ORDERS LOAD ===')
      console.log('URL view parameter:', searchParams.get('view'))
      console.log('Current view state:', currentView)
      console.log('Session:', session)

      // Check if we have the minimum required data for loading orders
      if (!session) {
        console.log('[OrdersView] No session available, cannot load orders')
        setLoading(false)
        setError('No active session found. Please scan the QR code to start a new session.')
        return
      }

      if (!guestSessionId || guestSessionId === 'null' || guestSessionId === 'undefined') {
        console.log('[OrdersView] No guest session ID available, cannot load orders')
        setLoading(false)
        setError('Session not properly initialized. Please scan the QR code again.')
        return
      }

      console.log('Loading orders for the first time...')
      console.log('Guest session ID:', guestSessionId)
      initialLoadInProgressRef.current = true
      loadOrdersInitial()
    } else if (!canAccess) {
      console.log('[OrdersView] Cannot access orders, stopping loading')
      setLoading(false)
      setError(null) // Clear any previous errors
    }
  }, [canAccess]) // Only depend on canAccess to prevent infinite loops

  // Initial load function - loads orders for the current view only to prevent flickering
  const loadOrdersInitial = async () => {
    try {
      setLoading(true)
      setError(null)

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('[OrdersView] Initial load timed out after 10 seconds')
        setError('Loading took too long. Please refresh the page.')
        ordersLoadedRef.current = true
        initialLoadInProgressRef.current = false
        setLoading(false)
      }, 10000)

      const allOrders: Order[] = []

      console.log('=== INITIAL ORDER LOADING DEBUG ===')
      console.log('Session:', session)
      console.log('Guest session ID:', guestSessionId)
      console.log('Current view:', currentView)
      console.log('Can access orders:', canAccess)

      if (session) {
        const currentUserSessionId = guestSessionId

        // Load both personal and table orders, then filter in UI by view
        // This ensures user can see their orders in both "My Orders" and "Table Orders"

        // Load personal orders
        if (currentUserSessionId && currentUserSessionId !== 'null' && currentUserSessionId !== 'undefined') {
          try {
            const response = await api.order.list({ sessionId: currentUserSessionId })
            console.log('Personal orders API response:', response)

            if (response.success && response.data) {
              let ordersArray: ApiOrder[] = []
              if (Array.isArray(response.data)) {
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                ordersArray = response.data.orders
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))
                allOrders.push(...apiOrders)
                console.log(`Loaded ${apiOrders.length} personal orders`)
              }
            }
          } catch (apiError) {
            console.warn('Failed to load personal orders from API:', apiError)
          }
        }

        // Load table orders (all orders for this table session)
        if (tableSessionId && tableSessionId !== 'null' && tableSessionId !== 'undefined') {
          try {
            const response = await api.order.list({ tableSessionId: tableSessionId })
            console.log('Table orders API response:', response)

            if (response.success && response.data) {
              let ordersArray: ApiOrder[] = []
              if (Array.isArray(response.data)) {
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                ordersArray = response.data.orders
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))

                // Merge table orders, avoiding duplicates with personal orders
                apiOrders.forEach(tableOrder => {
                  const exists = allOrders.some(existingOrder => existingOrder.id === tableOrder.id)
                  if (!exists) {
                    allOrders.push(tableOrder)
                  }
                })
                console.log(`Loaded ${apiOrders.length} table orders (${allOrders.length} total after dedup)`)
              }
            }
          } catch (apiError) {
            console.warn('Failed to load table orders from API:', apiError)
          }
        }
      }

      // Sort orders by creation date (newest first)
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setOrders(allOrders)
      console.log(`=== INITIAL LOAD COMPLETE: ${allOrders.length} orders for '${currentView}' view ===`)
      console.log('Loaded orders details:', allOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        guestSessionId: o.guestSessionId,
        tableSessionId: o.tableSessionId
      })))

      // Clear timeout and mark as loaded
      clearTimeout(timeoutId)
      ordersLoadedRef.current = true
      initialLoadInProgressRef.current = false
      setLoading(false)
    } catch (err: any) {
      console.error('Failed to load orders:', err)
      setError('Failed to load orders. Please check your connection and try again.')

      // Clear timeout and mark as loaded, even on error
      clearTimeout(timeoutId)
      ordersLoadedRef.current = true
      initialLoadInProgressRef.current = false
      setLoading(false)
    }
  }


  // Hybrid approach: WebSocket primary, API fallback when disconnected
  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const allOrders: Order[] = []

      // Always check URL parameter directly to avoid timing issues
      const urlView = searchParams.get('view')
      const actualView = urlView === 'table' ? 'table' : 'my'

      console.log('[OrdersView] Loading orders via API (WebSocket backup):', {
        currentView,
        actualView,
        wsConnected,
        reason: !wsConnected ? 'WebSocket disconnected' : 'Manual refresh'
      })

      if (actualView === 'my' && session) {
        // Load personal orders (current user's orders only)
        const currentUserSessionId = guestSessionId

        if (currentUserSessionId && currentUserSessionId !== 'null' && currentUserSessionId !== 'undefined') {
          try {
            const response = await api.order.list({ sessionId: currentUserSessionId })
            console.log('[OrdersView] Personal orders API response:', response)

            if (response.success && response.data) {
              let ordersArray: ApiOrder[] = []
              if (Array.isArray(response.data)) {
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                ordersArray = response.data.orders
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))
                allOrders.push(...apiOrders)
                console.log(`[OrdersView] Loaded ${apiOrders.length} personal orders via API`)
              }
            }
          } catch (apiError) {
            console.warn('[OrdersView] Failed to load personal orders from API:', apiError)
          }
        }
      } else if (actualView === 'table' && session) {
        // Load table orders (shared orders for all users at the table session)
        const tableSessionId = session.tableSessionId || sessionStorage.getItem('tabsy-table-session-id')

        if (tableSessionId && tableSessionId !== 'null' && tableSessionId !== 'undefined') {
          try {
            const response = await api.order.list({ tableSessionId: tableSessionId })
            console.log('[OrdersView] Table orders API response:', response)

            if (response.success && response.data) {
              let ordersArray: ApiOrder[] = []
              if (Array.isArray(response.data)) {
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                ordersArray = response.data.orders
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))
                allOrders.push(...apiOrders)
                console.log(`[OrdersView] Loaded ${apiOrders.length} table orders via API`)
              }
            }
          } catch (apiError) {
            console.warn('[OrdersView] Failed to load table orders from API:', apiError)
          }
        }
      }

      // Sort orders by creation date (newest first)
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setOrders(allOrders)
      console.log(`[OrdersView] API fallback complete: ${allOrders.length} orders loaded`)
    } catch (err: any) {
      console.error('[OrdersView] Failed to load orders via API:', err)
      setError('Failed to load your orders')
    } finally {
      setLoading(false)
    }
  }

  // Load orders for a specific view - used when switching tabs
  const loadOrdersForView = async (targetView: 'my' | 'table') => {
    try {
      setLoading(true)
      setError(null)

      const allOrders: Order[] = []

      console.log('[OrdersView] Loading orders for specific view:', {
        targetView,
        wsConnected,
        guestSessionId,
        tableSessionId
      })

      if (targetView === 'my' && session) {
        // Load personal orders (current user's orders only)
        const currentUserSessionId = guestSessionId

        if (currentUserSessionId && currentUserSessionId !== 'null' && currentUserSessionId !== 'undefined') {
          try {
            const response = await api.order.list({ sessionId: currentUserSessionId })
            console.log('[OrdersView] Personal orders API response:', response)

            if (response.success && response.data) {
              let ordersArray: ApiOrder[] = []
              if (Array.isArray(response.data)) {
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                ordersArray = response.data.orders
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))
                allOrders.push(...apiOrders)
                console.log(`[OrdersView] Loaded ${apiOrders.length} personal orders for view switch`)
              }
            }
          } catch (apiError) {
            console.warn('[OrdersView] Failed to load personal orders from API:', apiError)
          }
        }
      } else if (targetView === 'table' && session) {
        // Load table orders (shared orders for all users at the table session)
        const tableSessionId = session.tableSessionId || sessionStorage.getItem('tabsy-table-session-id')

        if (tableSessionId && tableSessionId !== 'null' && tableSessionId !== 'undefined') {
          try {
            const response = await api.order.list({ tableSessionId: tableSessionId })
            console.log('[OrdersView] Table orders API response:', response)

            if (response.success && response.data) {
              let ordersArray: ApiOrder[] = []
              if (Array.isArray(response.data)) {
                ordersArray = response.data
              } else if (isPaginatedResponse(response.data)) {
                ordersArray = response.data.orders
              }

              if (ordersArray.length > 0) {
                const apiOrders: Order[] = ordersArray.map((order: ApiOrder) => ({
                  ...order,
                  restaurantName: session.restaurantName
                }))
                allOrders.push(...apiOrders)
                console.log(`[OrdersView] Loaded ${apiOrders.length} table orders for view switch`)
              }
            }
          } catch (apiError) {
            console.warn('[OrdersView] Failed to load table orders from API:', apiError)
          }
        }
      }

      // Sort orders by creation date (newest first)
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setOrders(allOrders)
      console.log(`[OrdersView] View switch complete: ${allOrders.length} orders loaded for '${targetView}' view`)
    } catch (err: any) {
      console.error('[OrdersView] Failed to load orders for view switch:', err)
      setError('Failed to load orders for this view')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    console.log('[OrdersView] Manual refresh triggered, using API fallback')
    loadOrders() // Always use API for manual refresh to ensure latest data
  }

  // Auto-fallback when WebSocket disconnects - TEMPORARILY DISABLED to prevent infinite API calls
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // DISABLED: These effects were causing infinite API calls
  // useEffect(() => {
  //   if (!wsConnected && session && ordersLoadedRef.current) {
  //     console.log('[OrdersView] WebSocket disconnected, setting up API fallback...')

  //     // Debounce fallback to prevent rapid API calls
  //     if (fallbackTimeoutRef.current) {
  //       clearTimeout(fallbackTimeoutRef.current)
  //     }

  //     fallbackTimeoutRef.current = setTimeout(() => {
  //       console.log('[OrdersView] Executing API fallback due to WebSocket disconnection')
  //       loadOrders()
  //     }, 2000) // Wait 2 seconds before falling back to API
  //   }

  //   // Cleanup timeout on unmount
  //   return () => {
  //     if (fallbackTimeoutRef.current) {
  //       clearTimeout(fallbackTimeoutRef.current)
  //     }
  //   }
  // }, [wsConnected, session])

  // DISABLED: This effect was causing infinite API calls when WebSocket reconnects
  // useEffect(() => {
  //   if (wsConnected && session && ordersLoadedRef.current) {
  //     console.log('[OrdersView] WebSocket reconnected, refreshing data to sync state')
  //     loadOrders()
  //   }
  // }, [wsConnected, session])

  const handleOrderClick = (orderId: string) => {
    const queryParams = SessionManager.getDiningQueryParams()
    router.push(`/order/${orderId}${queryParams}`)
  }

  // Intelligent debounced API calls - only when WebSocket is down or manual refresh
  const apiCallTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // const debouncedApiRefresh = useCallback((reason: string) => {
  //   if (apiCallTimeoutRef.current) {
  //     clearTimeout(apiCallTimeoutRef.current)
  //   }

  //   apiCallTimeoutRef.current = setTimeout(() => {
  //     // Only call API if WebSocket is disconnected or it's a manual refresh
  //     if (!wsConnected || reason === 'manual') {
  //       console.log(`[OrdersView] Debounced API call executing - reason: ${reason}`)
  //       loadOrders()
  //     } else {
  //       console.log(`[OrdersView] Skipping API call - WebSocket connected and reason: ${reason}`)
  //     }
  //   }, 500) // 500ms debounce
  // }, [wsConnected])

  const handleNewOrder = () => {
    router.push(SessionManager.getMenuUrl())
  }

  const handleViewChange = (newView: 'my' | 'table') => {
    console.log(`[ViewChange] Switching from ${currentView} to ${newView}`)

    // Update current view state directly (no page navigation)
    setCurrentView(newView)

    // Update URL without navigation to keep URL in sync
    const queryParams = SessionManager.getDiningQueryParams()
    const newUrl = `/orders${queryParams}&view=${newView}`
    window.history.replaceState({}, '', newUrl)

    // Load orders for the new view to ensure fresh data
    if (ordersLoadedRef.current) {
      console.log(`[ViewChange] Loading orders for new view: ${newView}`)
      loadOrdersForView(newView)
    }
  }

  // WebSocket event handlers for real-time updates - PURE STATE UPDATES ONLY
  const handleOrderCreated = (data: any) => {
    console.log('[OrdersView] New order created via WebSocket:', data)

    // Extract order from WebSocket payload (backend sends OrderCreatedPayload)
    const newOrder = data.order || data

    if (!newOrder || !newOrder.id) {
      console.warn('[OrdersView] Invalid order data in order:created event:', data)
      return
    }

    console.log('[OrdersView] Processing new order:', {
      orderId: newOrder.id,
      orderGuestSessionId: newOrder.guestSessionId,
      orderTableSessionId: newOrder.tableSessionId,
      currentUserSessionId: guestSessionId,
      currentTableSessionId: tableSessionId,
      currentView
    })

    // Add order to state if it belongs to current user OR current table session
    // The UI filtering will determine which view shows the order
    const belongsToUser = newOrder.guestSessionId === guestSessionId
    const belongsToTable = newOrder.tableSessionId === tableSessionId
    const shouldAddOrder = belongsToUser || belongsToTable

    console.log('[OrdersView] Order belongs to:', {
      belongsToUser,
      belongsToTable,
      shouldAddOrder,
      willShowInMyOrders: belongsToUser,
      willShowInTableOrders: belongsToTable
    })

    if (shouldAddOrder) {
      console.log('[OrdersView] Adding new order to current view state')
      setOrders(prevOrders => {
        // Check if order already exists (prevent duplicates)
        const exists = prevOrders.some(order => order.id === newOrder.id)
        if (exists) {
          console.log('[OrdersView] Order already exists in state, skipping duplicate')
          return prevOrders
        }

        // Add new order to beginning of list (most recent first)
        const orderWithRestaurantName = {
          ...newOrder,
          restaurantName: session?.restaurantName
        }
        console.log('[OrdersView] Successfully added new order to state')
        return [orderWithRestaurantName, ...prevOrders]
      })
    } else {
      console.log('[OrdersView] New order does not belong to current view, ignoring')
    }

    // NO API CALLS! Pure WebSocket state management
  }

  const handleOrderStatusUpdate = (data: any) => {
    console.log('[OrdersView] Order status updated:', data)

    // Use utility function to extract and validate order data
    const extractedData = processOrderUpdatePayload(data, 'OrdersView')

    if (!extractedData) {
      console.warn('[OrdersView] Failed to extract valid order data, skipping update')
      return
    }

    const { orderId, status: newStatus, updatedAt } = extractedData

    // Update the specific order in the list
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus!,
              updatedAt: updatedAt || new Date().toISOString()
            }
          : order
      )
    )

    console.log('[OrdersView] Successfully updated order status:', { orderId, newStatus })
  }

  const handleOrderUpdate = (data: any) => {
    console.log('[OrdersView] Order updated via WebSocket:', data)

    // Extract order from WebSocket payload (backend sends OrderUpdatedPayload)
    const updatedOrder = data.order || data

    if (!updatedOrder || !updatedOrder.id) {
      console.warn('[OrdersView] Invalid order data in order:updated event:', data)
      return
    }

    console.log('[OrdersView] Processing order update:', {
      orderId: updatedOrder.id,
      orderGuestSessionId: updatedOrder.guestSessionId,
      orderTableSessionId: updatedOrder.tableSessionId,
      currentUserSessionId: guestSessionId,
      currentTableSessionId: tableSessionId,
      currentView
    })

    // Update order in state if it exists - keep it in current view regardless of payload fields
    setOrders(prevOrders => {
      const orderIndex = prevOrders.findIndex(order => order.id === updatedOrder.id)

      if (orderIndex === -1) {
        console.log('[OrdersView] Order not found in current state, ignoring update')
        return prevOrders
      }

      // IMPORTANT: If order exists in current view, keep it there
      // Don't remove based on potentially missing guestSessionId/tableSessionId in WebSocket payload
      const existingOrder = prevOrders[orderIndex]

      // Update the order in place, preserving existing fields that might be missing from WebSocket payload
      const newOrders = [...prevOrders]
      newOrders[orderIndex] = {
        ...existingOrder, // Start with existing order data
        ...updatedOrder,  // Apply updates from WebSocket
        restaurantName: session?.restaurantName,
        // Preserve critical fields if missing from WebSocket payload
        guestSessionId: updatedOrder.guestSessionId || existingOrder.guestSessionId,
        tableSessionId: updatedOrder.tableSessionId || existingOrder.tableSessionId
      }

      console.log('[OrdersView] Successfully updated order in state:', {
        orderId: updatedOrder.id,
        preservedGuestSessionId: newOrders[orderIndex].guestSessionId,
        preservedTableSessionId: newOrders[orderIndex].tableSessionId
      })
      return newOrders
    })

    // NO API CALLS! Pure WebSocket state management
  }

  // Set up WebSocket event listeners
  useWebSocketEvent('order:created', handleOrderCreated, [handleOrderCreated, session?.tableId], 'OrdersView')
  useWebSocketEvent('order:status_updated', handleOrderStatusUpdate, [handleOrderStatusUpdate], 'OrdersView')
  useWebSocketEvent('order:updated', handleOrderUpdate, [handleOrderUpdate], 'OrdersView')

  // Filter orders by view (My Orders vs Table Orders) - computed from all loaded orders
  const viewFilteredOrders = useMemo(() => {
    if (!session) return []

    // Use component-level tableSessionId with fallback

    console.log('[ViewFiltering] Debug info:', {
      currentView,
      totalOrders: orders.length,
      guestSessionId,
      sessionTableSessionId: session.tableSessionId,
      fallbackTableSessionId: sessionStorage.getItem('tabsy-table-session-id'),
      actualTableSessionId: tableSessionId,
      orders: orders.map(o => ({
        id: o.id,
        guestSessionId: o.guestSessionId,
        tableSessionId: o.tableSessionId
      }))
    })

    if (currentView === 'my') {
      // My Orders: Filter by current user's guest session ID
      const filtered = orders.filter(order =>
        order.guestSessionId === guestSessionId
      )
      console.log('[ViewFiltering] My Orders filtered:', filtered.length)
      return filtered
    } else {
      // Table Orders: Filter by current table session ID (with fallback)
      const filtered = orders.filter(order =>
        order.tableSessionId === tableSessionId
      )
      console.log('[ViewFiltering] Table Orders filtered:', filtered.length, 'using tableSessionId:', tableSessionId)
      return filtered
    }
  }, [orders, currentView, tableSessionId, guestSessionId])

  // Filter orders based on selected status filters
  const filteredOrders = filterOrdersByStatus(viewFilteredOrders, selectedFilters)

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
              <AnimatePresence mode="wait">
                <motion.h1
                  key={`title-${currentView}`}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="text-2xl font-bold text-content-primary"
                >
                  {currentView === 'my' ? 'My Orders' : 'Table Orders'}
                </motion.h1>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`subtitle-${currentView}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: 0.05 }}
                  className="text-content-secondary"
                >
                  {currentView === 'my'
                    ? 'Track your current and past orders'
                    : 'All orders for your table session'
                  }
                </motion.p>
              </AnimatePresence>
              {/* Connection Status */}
              {session && (
                <div className="mt-1">
                  {wsConnected ? (
                    <div className="flex items-center text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                      Live updates active
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-orange-600">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-1.5"></div>
                      Using API fallback - Tap refresh to sync
                    </div>
                  )}
                </div>
              )}
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
          {viewFilteredOrders.length > 0 && (
            <div className="mt-4">
              <OrderFilterPills
                orders={viewFilteredOrders}
                selectedFilters={selectedFilters}
                onFiltersChange={setSelectedFilters}
              />
            </div>
          )}
        </div>
      </div>

      <motion.div
        className="max-w-4xl mx-auto px-4 py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Empty State with Animation */}
        {filteredOrders.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
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
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                <Button onClick={handleNewOrder}>
                  <Plus className="w-4 h-4 mr-2" />
                  Order Now
                </Button>
              </motion.div>
            )}
          </motion.div>
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
      </motion.div>
    </div>
  )
}