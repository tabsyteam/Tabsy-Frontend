'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { tabsyClient } from '@tabsy/api-client'
import { useAuth } from '@tabsy/ui-components'
import { Button } from '@tabsy/ui-components'
import { Order, OrderStatus } from '@tabsy/shared-types'
import { OrderCard } from './OrderCard'
import { OrderDetailSlidePanel } from './OrderDetailSlidePanel'
import { Filter, RefreshCw, AlertCircle, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { createOrderHooks } from '@tabsy/react-query-hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'

interface OrdersManagementProps {
  restaurantId: string
}


export function OrdersManagement({ restaurantId }: OrdersManagementProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')

  // Track locally initiated status changes to avoid processing our own WebSocket events
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Set<string>>(new Set())

  // CLEAN SOLUTION: Inject app's useQuery into factory
  const orderHooks = createOrderHooks(useQuery)
  
  // Get query client for manual cache invalidation
  const queryClient = useQueryClient()


  // Authentication
  const { session, user, isLoading: authLoading } = useAuth()


  // Sync authentication token with global API client
  useEffect(() => {
    if (session?.token) {
      tabsyClient.setAuthToken(session.token)
    } else {
      tabsyClient.clearAuthToken()
    }
  }, [session?.token])

  // Use factory-created hooks with proper QueryClient injection
  // All Orders Hook - using factory pattern to solve monorepo dependency issues
  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
    isFetching: ordersFetching
  } = orderHooks.useOrdersByRestaurant(restaurantId, undefined, {
    enabled: !!restaurantId && !!session?.token && !authLoading,
    staleTime: 300000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchIntervalInBackground: false
  })


  // Extract orders from the proper hook response
  let orders: Order[] = []
  
  // Use the proper useOrdersByRestaurant response
  if (ordersResponse && (ordersResponse as any).data?.orders) {
    orders = (ordersResponse as any).data.orders
  }
  
  // Final orders to display
  const finalOrders = orders
  
  // OPTIMIZATION: Memoize filtered orders to prevent unnecessary recalculations
  const filteredOrders: Order[] = useMemo(() => {
    return statusFilter === 'ALL'
      ? finalOrders
      : finalOrders.filter((order: Order) => order.status === statusFilter)
  }, [finalOrders, statusFilter])

  // Use unified WebSocket provider with proper cleanup
  const {
    isConnected,
    joinRoom,
    leaveRoom
  } = useWebSocket()

  useEffect(() => {
    // Join restaurant room for real-time updates
    if (isConnected && restaurantId) {
      joinRoom(`restaurant:${restaurantId}`)
      console.log(`Joined restaurant room: restaurant:${restaurantId}`)
    }

    return () => {
      if (restaurantId) {
        leaveRoom(`restaurant:${restaurantId}`)
      }
    }
  }, [isConnected, restaurantId, joinRoom, leaveRoom])

  // Clean WebSocket event handling with proper cleanup (fixes duplicate order bug)
  const handleNewOrder = useCallback((data: any) => {
    console.log('📦 New order received via WebSocket:', data)

    // Try to extract order data from different possible formats
    let order = null
    if (data?.data?.id) {
      order = data.data
    } else if (data?.id) {
      order = data
    } else if (data?.order?.id) {
      order = data.order
    }

    if (!order?.id) {
      console.error('❌ Invalid order data received:', data)
      refetchOrders()
      return
    }

    // Fix customization field mapping: WebSocket sends 'customizations' but UI expects 'options'
    if (order.items && Array.isArray(order.items)) {
      order.items = order.items.map((item: any) => {
        if (item.customizations && !item.options) {
          return { ...item, options: item.customizations }
        }
        return item
      })
    }

    toast.success(`New order #${order.id} received`)

    // Update orders cache
    queryClient.setQueryData(['orders', 'restaurant', restaurantId, undefined], (oldData: any) => {
      if (oldData?.data?.orders) {
        const updatedOrders = [order, ...oldData.data.orders]
        return {
          ...oldData,
          data: {
            ...oldData.data,
            orders: updatedOrders,
            totalCount: (oldData.data.totalCount || 0) + 1
          }
        }
      } else {
        return {
          data: {
            orders: [order],
            totalCount: 1,
            page: 1,
            limit: 50
          },
          success: true
        }
      }
    })

    // Update RECEIVED orders cache if needed
    if (order.status === 'RECEIVED') {
      queryClient.setQueryData(['orders', 'restaurant', restaurantId, { status: 'RECEIVED' }], (oldData: any) => {
        if (oldData?.data?.orders) {
          const updatedOrders = [order, ...oldData.data.orders]
          return {
            ...oldData,
            data: {
              ...oldData.data,
              orders: updatedOrders,
              totalCount: (oldData.data.totalCount || 0) + 1
            }
          }
        } else {
          return {
            data: {
              orders: [order],
              totalCount: 1,
              page: 1,
              limit: 50
            },
            success: true
          }
        }
      })
    }

    // Invalidate related caches
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', restaurantId] })
    queryClient.invalidateQueries({ queryKey: ['orders', 'today', restaurantId] })
  }, [queryClient, restaurantId, refetchOrders])

  const handleOrderUpdate = useCallback((data: any) => {
    console.log('📝 Order updated via WebSocket:', data)

    // Extract order data
    let order = null
    if (data?.data?.id) {
      order = data.data
    } else if (data?.id) {
      order = data
    } else if (data?.order?.id) {
      order = data.order
    }

    if (!order?.id) {
      console.error('❌ Invalid order update data:', data)
      return
    }

    // Fix customization field mapping
    if (order.items && Array.isArray(order.items)) {
      order.items = order.items.map((item: any) => {
        if (item.customizations && !item.options) {
          return { ...item, options: item.customizations }
        }
        return item
      })
    }

    // Check if this is a locally initiated status change
    if (order.status) {
      const changeKey = `${order.id}:${order.status}`
      if (pendingStatusChanges.has(changeKey)) {
        console.log('🔄 Ignoring locally initiated order update:', changeKey)
        return
      }
    }

    toast.info(`Order #${order.id} updated`)

    // Update orders cache
    queryClient.setQueryData(['orders', 'restaurant', restaurantId, undefined], (oldData: any) => {
      if (oldData?.data?.orders) {
        const updatedOrders = oldData.data.orders.map((existingOrder: Order) =>
          existingOrder.id === order.id ? order : existingOrder
        )
        return { ...oldData, data: { ...oldData.data, orders: updatedOrders } }
      }
      return oldData
    })

    // Update selected order if it matches
    setSelectedOrder(current =>
      current && current.id === order.id ? order : current
    )
  }, [queryClient, restaurantId, pendingStatusChanges])

  const handleOrderStatusChange = useCallback((data: { orderId: string; status: OrderStatus }) => {
    console.log('🔄 Order status changed via WebSocket:', data)

    // Check if this is a locally initiated change
    const changeKey = `${data.orderId}:${data.status}`
    if (pendingStatusChanges.has(changeKey)) {
      console.log('🔄 Ignoring locally initiated status change:', changeKey)
      return
    }

    toast.info(`Order #${data.orderId} status: ${data.status}`)

    // Update orders cache with status change
    let previousStatus: OrderStatus | null = null
    queryClient.setQueryData(['orders', 'restaurant', restaurantId, undefined], (oldData: any) => {
      if (oldData?.data?.orders) {
        const existingOrder = oldData.data.orders.find((order: Order) => order.id === data.orderId)
        previousStatus = existingOrder?.status || null

        const updatedOrders = oldData.data.orders.map((existingOrder: Order) =>
          existingOrder.id === data.orderId
            ? { ...existingOrder, status: data.status }
            : existingOrder
        )
        return { ...oldData, data: { ...oldData.data, orders: updatedOrders } }
      }
      return oldData
    })

    // Update RECEIVED orders cache for badge count
    queryClient.setQueryData(['orders', 'restaurant', restaurantId, { status: 'RECEIVED' }], (oldData: any) => {
      if (oldData?.data?.orders) {
        let updatedOrders = oldData.data.orders
        let totalCount = oldData.data.totalCount || 0

        if (previousStatus === 'RECEIVED' && data.status !== 'RECEIVED') {
          updatedOrders = updatedOrders.filter((order: Order) => order.id !== data.orderId)
          totalCount = Math.max(0, totalCount - 1)
        } else if (previousStatus !== 'RECEIVED' && data.status === 'RECEIVED') {
          const mainCache = queryClient.getQueryData(['orders', 'restaurant', restaurantId, undefined]) as any
          const fullOrder = mainCache?.data?.orders?.find((order: Order) => order.id === data.orderId)
          if (fullOrder) {
            updatedOrders = [{ ...fullOrder, status: data.status }, ...updatedOrders]
            totalCount = totalCount + 1
          }
        } else if (previousStatus === 'RECEIVED' && data.status === 'RECEIVED') {
          updatedOrders = updatedOrders.map((order: Order) =>
            order.id === data.orderId ? { ...order, status: data.status } : order
          )
        }

        return {
          ...oldData,
          data: {
            ...oldData.data,
            orders: updatedOrders,
            totalCount
          }
        }
      }
      return oldData
    })

    // Update selected order if it matches
    setSelectedOrder(current =>
      current && current.id === data.orderId
        ? { ...current, status: data.status }
        : current
    )
  }, [queryClient, restaurantId, pendingStatusChanges])

  // Use clean useWebSocketEvent hooks (prevents duplicate event listeners)
  useWebSocketEvent('order:created', handleNewOrder, [handleNewOrder])
  useWebSocketEvent('order:updated', handleOrderUpdate, [handleOrderUpdate])
  useWebSocketEvent('order:status_updated', handleOrderStatusChange, [handleOrderStatusChange])
  
  // Update selected order when orders data changes
  // Use more efficient comparison instead of expensive JSON.stringify
  useEffect(() => {
    if (selectedOrder && finalOrders.length > 0) {
      const updatedOrder = finalOrders.find(order => order.id === selectedOrder.id)
      if (updatedOrder) {
        // Compare key fields instead of full object serialization
        const hasChanges =
          updatedOrder.status !== selectedOrder.status ||
          updatedOrder.updatedAt !== selectedOrder.updatedAt ||
          updatedOrder.totalAmount !== selectedOrder.totalAmount

        if (hasChanges) {
          setSelectedOrder(updatedOrder)
        }
      }
    }
  }, [finalOrders, selectedOrder])

  // OPTIMIZATION: Memoize handleRefresh to prevent unnecessary re-renders
  const handleRefresh = useCallback(() => {
    refetchOrders()
  }, [refetchOrders])

  // OPTIMIZATION: Memoize handleStatusChange to prevent unnecessary re-renders
  const handleStatusChange = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    // Track this as a locally initiated change to avoid processing our own WebSocket event
    const changeKey = `${orderId}:${newStatus}`
    setPendingStatusChanges(prev => new Set([...prev, changeKey]))

    console.log('🔄 Locally initiating status change:', { orderId, newStatus, changeKey })

    // Optimistic update using functional update to avoid stale closures
    setSelectedOrder(currentOrder => {
      if (currentOrder && currentOrder.id === orderId) {
        return { ...currentOrder, status: newStatus }
      }
      return currentOrder
    })

    try {
      const response = await tabsyClient.order.updateStatus(orderId, newStatus)
      toast.success('Order status updated successfully')

      // More specific cache invalidation to reduce unnecessary re-fetches
      queryClient.invalidateQueries({
        queryKey: ['orders', 'restaurant', restaurantId],
        exact: false
      })

      // Note: No need to refetch - WebSocket will handle real-time updates

      // Clear the pending change after a delay (allow time for WebSocket event)
      setTimeout(() => {
        setPendingStatusChanges(prev => {
          const newSet = new Set(prev)
          newSet.delete(changeKey)
          console.log('🔄 Cleared pending change:', changeKey)
          return newSet
        })
      }, 3000) // 3 second timeout
      
      // Update the selected order with the latest data from the cache
      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedOrder = finalOrders.find(order => order.id === orderId)
        if (updatedOrder) {
          setSelectedOrder(updatedOrder)
        }
      }
      
    } catch (err: any) {
      console.error('Failed to update order status:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.status,
        data: err.data
      })
      
      // Revert optimistic update on error
      if (selectedOrder && selectedOrder.id === orderId) {
        // Find the original order to revert to
        const originalOrder = finalOrders.find(order => order.id === orderId)
        if (originalOrder) {
          setSelectedOrder(originalOrder)
        }
      }
      
      // More specific error message
      if (err.status === 400) {
        toast.error('Invalid order status update request')
      } else if (err.status === 404) {
        toast.error('Order not found')
      } else {
        toast.error(`Failed to update order status: ${err.message || 'Unknown error'}`)
      }
    }
  }, [queryClient, restaurantId]) // Dependencies for useCallback

  // Show loading state during authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Show message if not authenticated
  if (!session?.token) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Authentication required to view orders</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10">
            <ShoppingCart className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orders Management</h1>
            <p className="text-foreground/80 mt-1">
              Manage and track restaurant orders in real-time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
            <span className="text-sm text-foreground/80">
              {isConnected ? 'Real-time connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={ordersLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Filter by status:</span>
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as OrderStatus | 'ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground/80 hover:bg-primary border-text-foreground hover:text-primary-foreground'
              }`}
            >
              {status === 'ALL' ? 'All Orders' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {ordersLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {ordersError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-destructive-foreground">Error loading orders</span>
          </div>
          <p className="text-destructive-foreground/80 mt-1 text-sm">{ordersError.message}</p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Orders Grid - Scrollable */}
      {!ordersLoading && !ordersError && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-6 pt-2">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full flex items-center justify-center h-64 bg-muted/50 rounded-lg border-2 border-dashed border-border">
                <div className="text-center">
                  <p className="text-foreground font-medium">No orders found</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {statusFilter === 'ALL'
                      ? 'No orders available for this restaurant'
                      : `No orders with status: ${statusFilter.toLowerCase()}`
                    }
                  </p>
                </div>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusChange}
                  onViewDetails={() => setSelectedOrder(order)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Order Detail Slide Panel */}
      <OrderDetailSlidePanel
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusUpdate={handleStatusChange}
      />
    </div>
  )
}