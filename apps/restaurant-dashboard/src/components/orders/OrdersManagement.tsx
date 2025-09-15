'use client'

import { useEffect, useState } from 'react'
import { useWebSocket, tabsyClient } from '@tabsy/api-client'
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

interface OrdersManagementProps {
  restaurantId: string
}


export function OrdersManagement({ restaurantId }: OrdersManagementProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')

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
  })


  // Extract orders from the proper hook response
  let orders: Order[] = []
  
  // Use the proper useOrdersByRestaurant response
  if (ordersResponse && (ordersResponse as any).data?.orders) {
    orders = (ordersResponse as any).data.orders
  }
  
  // Final orders to display
  const finalOrders = orders
  
  const filteredOrders: Order[] = statusFilter === 'ALL' 
    ? finalOrders 
    : finalOrders.filter((order: Order) => order.status === statusFilter)

  // WebSocket connection for real-time updates with authentication
  const { 
    isConnected, 
    connect, 
    disconnect,
    joinRoom,
    leaveRoom,
    client
  } = useWebSocket({
    auth: {
      token: session?.token,
      restaurantId: restaurantId,
      namespace: 'restaurant'
    },
    onConnect: () => {
      console.log('WebSocket connected successfully')
      toast.success('Connected to real-time updates')
    },
    onError: (error: Error) => {
      console.error('WebSocket connection error:', error)
      toast.error('Failed to connect to real-time updates')
    }
  })

  useEffect(() => {
    // Initialize WebSocket connection and join restaurant room only if authenticated
    const initializeRealtime = async () => {
      if (!session?.token || !user) {
        return
      }

      try {
        await connect()
        joinRoom(`restaurant:${restaurantId}`)
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err)
        toast.error('Failed to connect to real-time updates')
      }
    }

    initializeRealtime()

    return () => {
      leaveRoom(`restaurant:${restaurantId}`)
      disconnect()
    }
  }, [restaurantId, session?.token, user, connect, disconnect, joinRoom, leaveRoom])

  useEffect(() => {
    if (!client) return

    const handleNewOrder = (order: Order) => {
      console.log('📦 New order received via WebSocket:', order)
      toast.success(`New order #${order.id} received`)
      refetchOrders()
    }

    const handleOrderUpdate = (order: Order) => {
      console.log('📝 Order updated via WebSocket:', order)
      toast.info(`Order #${order.id} updated`)
      refetchOrders()
      
      // Update selected order if it matches the updated order
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(order)
      }
    }

    const handleOrderStatusChange = (data: { orderId: string; status: OrderStatus }) => {
      console.log('🔄 Order status changed via WebSocket:', data)
      toast.info(`Order #${data.orderId} status: ${data.status}`)
      refetchOrders()
      
      // Update selected order status if it matches
      if (selectedOrder && selectedOrder.id === data.orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: data.status
        })
      }
    }

    // Subscribe to real-time events
    client.on('order:new', handleNewOrder)
    client.on('order:updated', handleOrderUpdate)
    client.on('order:status_changed', handleOrderStatusChange)

    return () => {
      client.off('order:new', handleNewOrder)
      client.off('order:updated', handleOrderUpdate)
      client.off('order:status_changed', handleOrderStatusChange)
    }
  }, [client, refetchOrders, selectedOrder])
  
  // Update selected order when orders data changes
  useEffect(() => {
    if (selectedOrder && finalOrders.length > 0) {
      const updatedOrder = finalOrders.find(order => order.id === selectedOrder.id)
      if (updatedOrder && JSON.stringify(updatedOrder) !== JSON.stringify(selectedOrder)) {
        setSelectedOrder(updatedOrder)
      }
    }
  }, [finalOrders, selectedOrder])

  const handleRefresh = () => {
    refetchOrders()
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic update: Update the selected order immediately for better UX
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({
        ...selectedOrder,
        status: newStatus
      })
    }
    
    try {
      const response = await tabsyClient.order.updateStatus(orderId, newStatus)
      toast.success('Order status updated successfully')
      
      // Manually invalidate React Query cache to ensure UI sync
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'restaurant', restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      
      // Refetch orders to ensure fresh data
      await refetchOrders()
      
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
  }

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