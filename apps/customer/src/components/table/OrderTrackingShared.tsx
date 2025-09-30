'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import { motion } from 'framer-motion'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  RefreshCw,
  Users,
  Receipt,
  ChefHat
} from 'lucide-react'
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

const orderStatusConfig: Record<OrderStatus, { bg: string, text: string, icon: any }> = {
  RECEIVED: { bg: 'bg-status-info-light', text: 'text-status-info', icon: Receipt },
  PREPARING: { bg: 'bg-accent-light', text: 'text-accent', icon: ChefHat },
  READY: { bg: 'bg-status-success-light', text: 'text-status-success', icon: CheckCircle },
  DELIVERED: { bg: 'bg-secondary-light', text: 'text-secondary', icon: Package },
  COMPLETED: { bg: 'bg-surface-secondary', text: 'text-content-secondary', icon: CheckCircle },
  CANCELLED: { bg: 'bg-status-error-light', text: 'text-status-error', icon: AlertCircle }
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

  // Use global WebSocket connection for order tracking
  const { client } = useWebSocket()

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
  useWebSocketEvent('order:status_updated', handleOrderStatusUpdate, [handleOrderStatusUpdate], 'OrderTrackingShared')
  useWebSocketEvent('order:updated', handleOrderUpdate, [handleOrderUpdate], 'OrderTrackingShared')
  useWebSocketEvent('order:created', handleNewOrder, [handleNewOrder], 'OrderTrackingShared')

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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-xl border-b border-default/50">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">Order Status</h1>
              <div className="flex items-center gap-2 text-content-secondary text-sm">
                <Users size={16} />
                <span>Session: {tableSession.sessionCode}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-content-tertiary">Last updated</div>
              <div className="text-sm text-content-secondary flex items-center gap-1">
                <Clock size={14} />
                {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Status Banner */}
        {currentStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <ChefHat className="text-primary" size={24} />
              </div>
              <div>
                <div className="font-semibold text-primary text-lg">{currentStatus}</div>
                <div className="text-content-secondary text-sm">Your orders are being processed</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-default rounded-2xl p-4 text-center"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Receipt className="text-primary" size={20} />
            </div>
            <div className="text-2xl font-bold text-content-primary">{stats.totalOrders}</div>
            <div className="text-xs text-content-secondary">Total Orders</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-default rounded-2xl p-4 text-center"
          >
            <div className="w-10 h-10 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="text-accent" size={20} />
            </div>
            <div className="text-2xl font-bold text-content-primary">{stats.activeOrders}</div>
            <div className="text-xs text-content-secondary">In Progress</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-surface border border-default rounded-2xl p-4 text-center"
          >
            <div className="w-10 h-10 bg-status-success-light rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="text-status-success" size={20} />
            </div>
            <div className="text-2xl font-bold text-content-primary">{stats.completedOrders}</div>
            <div className="text-xs text-content-secondary">Completed</div>
          </motion.div>
        </div>

        {/* Orders by Round */}
        {roundNumbers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-2xl border border-default p-8 text-center"
          >
            <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="text-content-tertiary" size={32} />
            </div>
            <h3 className="font-semibold text-content-primary mb-2">No Orders Yet</h3>
            <p className="text-content-secondary">
              Orders placed by your table will appear here
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-content-primary text-lg">Order History</h3>
            {roundNumbers.map((roundNumber, index) => {
              const orders = ordersByRound[roundNumber]
              return (
                <motion.div
                  key={roundNumber}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-surface rounded-2xl border border-default overflow-hidden"
                >
                  <div className="bg-surface-secondary p-4 border-b border-default">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary">{roundNumber}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-content-primary">Round {roundNumber}</h4>
                        <p className="text-sm text-content-secondary">
                          {orders.length} order{orders.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-default">
                    {orders.map((order, orderIndex) => {
                      const statusConfig = orderStatusConfig[order.status as OrderStatus]
                      const StatusIcon = statusConfig.icon

                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (index * 0.1) + (orderIndex * 0.05) }}
                          className="p-4 hover:bg-surface-secondary/50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="font-semibold text-content-primary">{order.orderNumber}</div>
                              <div className="text-sm text-content-secondary">
                                Placed by {getUserName(order.guestSessionId || '')}
                              </div>
                              <div className="text-xs text-content-tertiary">
                                {new Date(order.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                                statusConfig.bg
                              } ${statusConfig.text}`}>
                                <StatusIcon size={14} />
                                {orderStatusLabels[order.status as OrderStatus]}
                              </div>
                              <div className="text-lg font-bold text-content-primary mt-2">
                                ${Number(order.total || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="bg-surface-tertiary rounded-xl p-4">
                            <div className="space-y-2">
                              {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-xs font-bold flex items-center justify-center">
                                      {item.quantity}
                                    </span>
                                    <span className="text-content-primary font-medium">{item.name}</span>
                                  </div>
                                  <span className="font-semibold text-content-primary">${Number(item.subtotal || 0).toFixed(2)}</span>
                                </div>
                              )) || (
                                <div className="text-sm text-content-secondary">
                                  Order details not available
                                </div>
                              )}
                            </div>

                            {order.specialInstructions && (
                              <div className="mt-3 pt-3 border-t border-default">
                                <div className="text-xs text-content-secondary mb-1">Special Instructions:</div>
                                <div className="text-sm text-content-primary bg-surface rounded-lg p-2">
                                  {order.specialInstructions}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={loadOrders}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <RefreshCw size={18} />
            Refresh Orders
          </motion.button>
        </div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-status-info-light border border-status-info rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-status-info-light rounded-full flex items-center justify-center mt-0.5">
              <Users className="text-status-info" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-status-info mb-2">Shared Table Orders</h4>
              <ul className="text-sm text-status-info space-y-1.5">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-status-info rounded-full mt-2 flex-shrink-0"></div>
                  All orders for Table {tableSession.table?.number || tableSession.tableId} are shown below
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-status-info rounded-full mt-2 flex-shrink-0"></div>
                  Orders are shared across everyone at your table
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-status-info rounded-full mt-2 flex-shrink-0"></div>
                  Status updates appear in real-time for all users
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-status-info rounded-full mt-2 flex-shrink-0"></div>
                  You can place multiple rounds of orders during your meal
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-status-info rounded-full mt-2 flex-shrink-0"></div>
                  Staff will notify you when orders are ready
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}