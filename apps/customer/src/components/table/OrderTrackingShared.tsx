'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket, useWebSocketEvent } from '@tabsy/api-client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import type {
  TableSessionUser,
  MultiUserTableSession,
  Order,
  OrderStatus
} from '@tabsy/shared-types'

interface OrderTrackingSharedProps {
  tableSession: MultiUserTableSession
  currentUser: TableSessionUser
  users: TableSessionUser[]
  api: TabsyAPI
}

interface OrdersByRound {
  [roundNumber: number]: Order[]
}

const orderStatusLabels: Record<OrderStatus, string> = {
  RECEIVED: 'Order Received',
  PREPARING: 'Preparing',
  READY: 'Ready for Pickup',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

const orderStatusColors: Record<OrderStatus, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-yellow-100 text-yellow-800',
  READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

export function OrderTrackingShared({
  tableSession,
  currentUser,
  users,
  api
}: OrderTrackingSharedProps) {
  const [ordersByRound, setOrdersByRound] = useState<OrdersByRound>({})
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Set up WebSocket connection for order tracking
  const { client } = useWebSocket({
    auth: {
      namespace: 'customer',
      restaurantId: tableSession.restaurantId,
      tableId: tableSession.tableId,
      sessionId: currentUser.guestSessionId
    },
    autoConnect: true
  })

  // Load orders for table session
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await api.tableSession.getOrders(tableSession.id)

      if (response.success) {
        setOrdersByRound(response.data.ordersByRound)
        setLastUpdated(new Date())
        console.log('[OrderTrackingShared] Loaded orders for table session:', response.data)
      } else {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to load orders'
        )
      }
    } catch (error: any) {
      console.error('[OrderTrackingShared] Error loading orders:', error)
      toast.error('Failed to load orders', {
        description: error?.message || 'Please try refreshing the page'
      })
    } finally {
      setIsLoading(false)
    }
  }, [api, tableSession.id])

  // Handle real-time order updates
  const handleOrderStatusUpdate = useCallback((data: any) => {
    console.log('[OrderTrackingShared] Order status updated:', data)

    setOrdersByRound(prev => {
      const updated = { ...prev }

      // Find and update the order across all rounds
      Object.keys(updated).forEach(roundNum => {
        const roundNumber = parseInt(roundNum)
        updated[roundNumber] = updated[roundNumber].map(order =>
          order.id === data.orderId
            ? { ...order, status: data.newStatus }
            : order
        )
      })

      return updated
    })

    setLastUpdated(new Date())

    // Show toast notification for status changes
    const statusLabel = orderStatusLabels[data.newStatus as OrderStatus]
    toast.info(`Order ${data.orderNumber}: ${statusLabel}`)
  }, [])

  const handleOrderUpdate = useCallback((data: any) => {
    console.log('[OrderTrackingShared] Order updated:', data)
    // Reload orders to get latest data
    loadOrders()
  }, [loadOrders])

  const handleNewOrder = useCallback((data: any) => {
    console.log('[OrderTrackingShared] New order created:', data)
    if (data.tableId === tableSession.tableId) {
      loadOrders()
      toast.success(`New order placed: ${data.order.orderNumber}`)
    }
  }, [tableSession.tableId, loadOrders])

  // Set up WebSocket event listeners with useWebSocketEvent hooks
  useWebSocketEvent(client, 'order:status_updated', handleOrderStatusUpdate, [handleOrderStatusUpdate])
  useWebSocketEvent(client, 'order:updated', handleOrderUpdate, [handleOrderUpdate])
  useWebSocketEvent(client, 'order:created', handleNewOrder, [handleNewOrder])

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await loadOrders()
    }

    initialize()
  }, [loadOrders])

  // Get user name by session ID
  const getUserName = (guestSessionId: string) => {
    const user = users.find(u => u.guestSessionId === guestSessionId)
    return user?.userName || 'Unknown'
  }

  // Get current order status for the table
  const getCurrentStatus = () => {
    const allOrders = Object.values(ordersByRound).flat()
    if (allOrders.length === 0) return null

    const activeOrders = allOrders.filter(order =>
      !['COMPLETED', 'CANCELLED'].includes(order.status)
    )

    if (activeOrders.length === 0) return 'All orders completed'

    const statusCounts = activeOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<OrderStatus, number>)

    // Return the most common status
    const mostCommonStatus = Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as OrderStatus

    return orderStatusLabels[mostCommonStatus]
  }

  // Calculate total orders and estimated time
  const getOrderStats = () => {
    const allOrders = Object.values(ordersByRound).flat()
    const activeOrders = allOrders.filter(order =>
      !['COMPLETED', 'CANCELLED'].includes(order.status)
    )

    return {
      totalOrders: allOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: allOrders.length - activeOrders.length
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  const currentStatus = getCurrentStatus()
  const stats = getOrderStats()
  const roundNumbers = Object.keys(ordersByRound).map(Number).sort((a, b) => a - b)

  return (
    <div className="p-4 space-y-6">
      {/* Status Overview */}
      <div className="bg-surface rounded-lg border border-default p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Order Status</h2>
            <p className="text-content-secondary">Session: {tableSession.sessionCode}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-content-secondary">Last updated</div>
            <div className="text-sm">{lastUpdated.toLocaleTimeString()}</div>
          </div>
        </div>

        {currentStatus && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
            <div className="font-medium text-primary">{currentStatus}</div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
            <div className="text-sm text-content-secondary">Total Orders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{stats.activeOrders}</div>
            <div className="text-sm text-content-secondary">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.completedOrders}</div>
            <div className="text-sm text-content-secondary">Completed</div>
          </div>
        </div>
      </div>

      {/* Orders by Round */}
      {roundNumbers.length === 0 ? (
        <div className="bg-surface rounded-lg border border-default p-8 text-center">
          <div className="text-4xl mb-2">📝</div>
          <h3 className="font-medium mb-1">No Orders Yet</h3>
          <p className="text-content-secondary">
            Orders placed by your table will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold">Order History</h3>
          {roundNumbers.map(roundNumber => {
            const orders = ordersByRound[roundNumber]
            return (
              <div key={roundNumber} className="bg-surface rounded-lg border border-default">
                <div className="p-4 border-b border-default">
                  <h4 className="font-medium">Round {roundNumber}</h4>
                  <p className="text-sm text-content-secondary">
                    {orders.length} order{orders.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="divide-y divide-default">
                  {orders.map(order => (
                    <div key={order.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium">{order.orderNumber}</div>
                          <div className="text-sm text-content-secondary">
                            Placed by {getUserName(order.guestSessionId || '')}
                          </div>
                          <div className="text-xs text-content-tertiary">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            orderStatusColors[order.status as OrderStatus]
                          }`}>
                            {orderStatusLabels[order.status as OrderStatus]}
                          </span>
                          <div className="text-sm font-medium mt-1">
                            ${Number(order.total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="bg-surface-secondary rounded p-3">
                        <div className="space-y-1">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>${Number(item.subtotal || 0).toFixed(2)}</span>
                            </div>
                          )) || (
                            <div className="text-sm text-content-secondary">
                              Order details not available
                            </div>
                          )}
                        </div>

                        {order.specialInstructions && (
                          <div className="mt-2 pt-2 border-t border-default">
                            <div className="text-xs text-content-secondary">Special Instructions:</div>
                            <div className="text-sm">{order.specialInstructions}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm"
        >
          Refresh Orders
        </button>
      </div>

      {/* Help Text */}
      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <h4 className="font-medium text-info mb-2">Shared Table Orders</h4>
        <ul className="text-sm text-content-secondary space-y-1">
          <li>• All orders for Table {tableSession.table?.number || tableSession.tableId} are shown below</li>
          <li>• Orders are shared across everyone at your table</li>
          <li>• Status updates appear in real-time for all users</li>
          <li>• You can place multiple rounds of orders during your meal</li>
          <li>• Staff will notify you when orders are ready</li>
        </ul>
      </div>
    </div>
  )
}