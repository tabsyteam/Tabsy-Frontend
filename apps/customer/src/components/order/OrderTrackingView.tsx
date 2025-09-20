'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  ChefHat,
  Bell,
  Utensils,
  CreditCard,
  Receipt,
  MessageCircle,
  Phone,
  HelpCircle,
  RefreshCw,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { OrderStatus } from '@tabsy/shared-types'
import { useWebSocket, useWebSocketEvent } from '@tabsy/api-client'
import { SessionManager } from '@/lib/session'
import { OrderStatusSkeleton, OrderTimelineSkeleton, OrderSummarySkeleton, HeaderSkeleton } from '../ui/Skeleton'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator'

interface OrderTrackingViewProps {
  orderId: string
  restaurantId?: string
  tableId?: string
}

// Transform API order response to local Order interface
const transformApiOrderToLocal = (apiOrder: any): Order => ({
  id: apiOrder.id,
  orderNumber: apiOrder.orderNumber,
  status: apiOrder.status,
  items: apiOrder.items.map((item: any) => ({
    id: item.id,
    name: item.menuItem?.name || item.name || 'Unknown Item',
    categoryName: item.menuItem?.categoryName || item.categoryName || 'Unknown Category',
    quantity: item.quantity,
    unitPrice: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0),
    totalPrice: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : (item.subtotal || 0),
    customizations: item.options
  })),
  subtotal: typeof apiOrder.subtotal === 'string' ? parseFloat(apiOrder.subtotal) : (apiOrder.subtotal || 0),
  tax: typeof apiOrder.tax === 'string' ? parseFloat(apiOrder.tax) : (apiOrder.tax || 0),
  total: typeof apiOrder.total === 'string' ? parseFloat(apiOrder.total) : (apiOrder.total || 0),
  guestInfo: {
    name: apiOrder.customerName || 'Guest',
    phone: apiOrder.customerPhone,
    email: apiOrder.customerEmail
  },
  specialInstructions: apiOrder.specialInstructions,
  estimatedTime: apiOrder.estimatedPreparationTime,
  createdAt: apiOrder.createdAt,
  updatedAt: apiOrder.updatedAt
})

interface OrderItem {
  id: string
  name: string
  categoryName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  customizations?: Record<string, any>
}

interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  guestInfo: {
    name: string
    phone?: string
    email?: string
  }
  specialInstructions?: string
  estimatedTime?: number
  createdAt: string
  updatedAt: string
}

const ORDER_STATUSES = [
  {
    key: OrderStatus.RECEIVED,
    label: 'Order Received',
    description: 'Your order has been received',
    icon: Receipt,
    color: 'text-blue-600'
  },
  {
    key: OrderStatus.PREPARING,
    label: 'Preparing',
    description: 'Your delicious food is being prepared',
    icon: ChefHat,
    color: 'text-orange-600'
  },
  {
    key: OrderStatus.READY,
    label: 'Ready',
    description: 'Your order is ready to be served',
    icon: Bell,
    color: 'text-purple-600'
  },
  {
    key: OrderStatus.DELIVERED,
    label: 'Delivered',
    description: 'Enjoy your meal!',
    icon: Utensils,
    color: 'text-green-600'
  },
  {
    key: OrderStatus.COMPLETED,
    label: 'Completed',
    description: 'Thank you for dining with us!',
    icon: CheckCircle,
    color: 'text-green-600'
  },
  {
    key: OrderStatus.CANCELLED,
    label: 'Cancelled',
    description: 'This order has been cancelled',
    icon: XCircle,
    color: 'text-red-600'
  }
]

export function OrderTrackingView({ orderId, restaurantId, tableId }: OrderTrackingViewProps) {
  const router = useRouter()
  const { api } = useApi()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showPaymentOption, setShowPaymentOption] = useState(false)

  // Refresh function for pull-to-refresh
  const refreshOrder = async () => {
    try {
      setError(null)
      const response = await api.order.getById(orderId)

      if (response.success && response.data) {
        const orderData = transformApiOrderToLocal(response.data)
        setOrder(orderData)

        // Save order to SessionManager for navigation access
        SessionManager.setCurrentOrder({
          orderId: response.data.id,
          orderNumber: response.data.orderNumber,
          status: response.data.status,
          createdAt: Date.now()
        })

        if (response.data.status === OrderStatus.DELIVERED) {
          setShowPaymentOption(true)
        }

        toast.success('Order refreshed!', { icon: '✅' })
      } else {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Order not found'
        )
      }
    } catch (err: any) {
      console.error('Failed to refresh order:', err)
      setError(err.message || 'Failed to refresh order')
      toast.error('Failed to refresh order')
    }
  }

  // Get session info from SessionManager for WebSocket auth
  const diningSession = SessionManager.getDiningSession()
  const sessionId = diningSession?.sessionId || null

  // Real-time WebSocket connection to customer namespace
  const {
    isConnected: wsConnected,
    client: wsClient
  } = useWebSocket({
    url: process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5001',
    auth: {
      namespace: 'customer',
      restaurantId: restaurantId || undefined,
      tableId: tableId || undefined,
      sessionId: sessionId || undefined
    },
    autoConnect: true,
    onConnect: () => {
      console.log('Connected to order tracking updates')
    },
    onDisconnect: () => {
      console.log('Disconnected from order tracking updates')
    },
    onError: (error) => {
      console.error('Order tracking WebSocket error:', error)
    }
  })

  // Listen for order status updates
  useWebSocketEvent(
    wsClient,
    'order:status_updated',
    (payload) => {
      if (payload.orderId === orderId) {
        console.log('Order status updated via WebSocket:', payload)
        setOrder(prevOrder => {
          if (!prevOrder) return prevOrder

          // Extract status from the payload structure - can be in payload.order.status or payload.status
          const newStatus = (payload as any).order?.status || (payload as any).status || payload.newStatus

          if (!newStatus) {
            console.warn('No status found in payload:', payload)
            return prevOrder
          }

          const updatedOrder = {
            ...prevOrder,
            status: newStatus as OrderStatus,
            updatedAt: new Date().toISOString()
          }

          // If we have a full order object in the payload, use it to update more fields
          if ((payload as any).order && typeof (payload as any).order === 'object') {
            Object.assign(updatedOrder, (payload as any).order)
            updatedOrder.updatedAt = new Date().toISOString()
          }

          if (payload.estimatedTime || (payload as any).order?.estimatedPreparationTime) {
            updatedOrder.estimatedTime = payload.estimatedTime || (payload as any).order.estimatedPreparationTime
          }

          // Show notification for status change
          if (newStatus !== prevOrder.status) {
            const statusInfo = ORDER_STATUSES.find(s => s.key === newStatus)
            if (statusInfo) {
              toast.success(statusInfo.label, {
                description: statusInfo.description,
                duration: 4000,
                icon: '🔔'
              })
            }
            // Show payment option if order is delivered
            if (newStatus === OrderStatus.DELIVERED) {
              setShowPaymentOption(true)
            }
          }

          // Update SessionManager with the updated order
          SessionManager.setCurrentOrder({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            createdAt: Date.now()
          })

          return updatedOrder
        })
      }
    },
    [orderId]
  )

  // Listen for general order updates
  useWebSocketEvent(
    wsClient,
    'order:updated',
    (payload) => {
      if (payload.orderId === orderId) {
        console.log('🔄 Order updated via WebSocket:', payload)

        // Update order directly from WebSocket data instead of making API call
        setOrder(prevOrder => {
          if (!prevOrder) return prevOrder

          const updatedOrder = { ...prevOrder }

          // Handle different payload structures
          if ((payload as any).order && typeof (payload as any).order === 'object') {
            // If we have a full order object, merge it
            Object.assign(updatedOrder, transformApiOrderToLocal((payload as any).order))
          } else if (payload.changes && typeof payload.changes === 'object') {
            // If we have changes object, apply the changes
            Object.assign(updatedOrder, payload.changes)
          } else {
            // Apply any direct fields from payload (excluding metadata)
            const { orderId, timestamp, restaurantId, tableId, userId, ...orderFields } = payload as any
            Object.assign(updatedOrder, orderFields)
          }

          updatedOrder.updatedAt = new Date().toISOString()

          // Update SessionManager with the updated order
          SessionManager.setCurrentOrder({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            createdAt: Date.now()
          })

          return updatedOrder
        })
      }
    },
    [orderId]
  )



  // Pull-to-refresh hook
  const pullToRefresh = usePullToRefresh({
    onRefresh: refreshOrder,
    threshold: 80,
    enabled: !loading && !!order
  })

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await api.order.getById(orderId)

        if (response.success && response.data) {
          const orderData = transformApiOrderToLocal(response.data)
          setOrder(orderData)

          // Save order to SessionManager for navigation access
          SessionManager.setCurrentOrder({
            orderId: response.data.id,
            orderNumber: response.data.orderNumber,
            status: response.data.status,
            createdAt: Date.now()
          })

          // Show payment option if order is delivered but not completed
          if (response.data.status === OrderStatus.DELIVERED) {
            setShowPaymentOption(true)
          }
        } else {
          throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Order not found'
        )
        }
      } catch (err: any) {
        console.error('Failed to load order:', err)

        let errorMessage = 'Failed to load order information'
        if (err?.response?.status === 404) {
          errorMessage = 'Order not found. Please check your order number.'
        } else if (err?.response?.status === 403) {
          errorMessage = 'You do not have permission to view this order.'
        }

        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, api])

  // Set up time tracking
  useEffect(() => {
    // if (order && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
    //   const startTime = new Date(order.createdAt).getTime()

    //   const updateTimer = () => {
    //     const now = Date.now()
    //     const elapsed = Math.floor((now - startTime) / 1000 / 60) // minutes
    //     setTimeElapsed(elapsed)
    //   }

    //   updateTimer()
    //   intervalRef.current = setInterval(updateTimer, 60000) // Update every minute

    //   return () => {
    //     if (intervalRef.current) {
    //       clearInterval(intervalRef.current)
    //     }
    //   }
    // }

    // return () => {
    //   if (intervalRef.current) {
    //     clearInterval(intervalRef.current)
    //   }
    // }
  }, [order])

  // Real-time updates via WebSocket only - no fallback polling
  useEffect(() => {
    // console.log('🔌 Customer WebSocket connection status:', {
    //   wsConnected,
    //   hasOrder: !!order,
    //   orderStatus: order?.status,
    //   orderId,
    //   restaurantId,
    //   tableId,
    //   sessionId
    // })

    // // Log connection status for debugging
    // if (!wsConnected && order && order.status !== OrderStatus.COMPLETED) {
    //   console.warn('⚠️ WebSocket not connected - real-time updates may be delayed')
    //   console.log('🔧 WebSocket auth params:', {
    //     namespace: 'customer',
    //     restaurantId: restaurantId || undefined,
    //     tableId: tableId || undefined,
    //     sessionId: sessionId || undefined
    //   })
    // } else if (wsConnected) {
    //   console.log('✅ WebSocket connected - real-time updates active')
    // }

    // // NO FALLBACK POLLING - rely exclusively on WebSocket for real-time updates
    // // This eliminates the 1-minute API polling that was causing delays
  }, [wsConnected, order, orderId, restaurantId, tableId, sessionId])

  const getCurrentStatusIndex = (): number => {
    if (!order) return 0

    // For cancelled orders, return -1 as they don't follow normal progression
    if (order.status === OrderStatus.CANCELLED) return -1

    // For normal orders, find index in the filtered array (excluding CANCELLED)
    const normalStatuses = ORDER_STATUSES.filter(status => status.key !== OrderStatus.CANCELLED)
    return normalStatuses.findIndex(status => status.key === order.status)
  }

  const handlePayment = () => {
    // Navigate to payment page
    router.push(`/payment?order=${orderId}&restaurant=${restaurantId}&table=${tableId}`)
  }

  const handleCallWaiter = () => {
    toast.success('Waiter called!', {
      description: 'A member of our staff will be with you shortly',
      duration: 3000
    })

    // TODO: Implement actual waiter call functionality
  }

  const handleBackToMenu = () => {
    router.push(`/menu?restaurant=${restaurantId}&table=${tableId}`)
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <HeaderSkeleton />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Status and Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Status Skeleton */}
              <OrderStatusSkeleton />

              {/* Timeline Skeleton */}
              <div className="bg-surface rounded-xl border p-6">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <OrderTimelineSkeleton />
              </div>
            </div>

            {/* Order Summary Skeleton */}
            <div className="space-y-6">
              <OrderSummarySkeleton />

              {/* Action buttons skeleton */}
              <div className="space-y-3">
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Unable to Load Order
            </h1>
            <p className="text-content-secondary">
              {error}
            </p>
          </div>
          <div className="space-y-3">
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentStatusIndex = getCurrentStatusIndex()

  return (
    <div className="min-h-screen bg-background pb-24" ref={pullToRefresh.bind}>
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        pullDistance={pullToRefresh.pullDistance}
        canRefresh={pullToRefresh.canRefresh}
        progress={pullToRefresh.progress}
      />

      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const queryParams = SessionManager.getDiningQueryParams()
                    router.push(`/orders${queryParams}&view=my`)
                  }}
                  className="p-2 hover:bg-interactive-hover transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </motion.div>
              <div>
                <h1 className="text-xl font-semibold">Order #{order.orderNumber}</h1>
                <div className="flex items-center space-x-3">
                  <p className="text-sm text-content-tertiary">
                    {order.guestInfo.name} • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <span className="text-xs text-content-tertiary">
                      {wsConnected ? 'Live' : 'Polling'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="p-2 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Status and Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-xl border p-6"
            >
              {order.status === OrderStatus.CANCELLED ? (
                // Special cancelled status display
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-4 py-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-red-600">
                      Order Cancelled
                    </h3>
                    <p className="text-sm text-content-tertiary">
                      This order has been cancelled
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">
                        Cancelled at {new Date(order.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // Normal status progression for non-cancelled orders
                ORDER_STATUSES.filter(status => status.key !== OrderStatus.CANCELLED)
                  .slice(0, currentStatusIndex + 1).map((status, index) => {
                  const isActive = index === currentStatusIndex
                  const isCompleted = index < currentStatusIndex
                  const IconComponent = status.icon
                  const normalStatuses = ORDER_STATUSES.filter(s => s.key !== OrderStatus.CANCELLED)

                  return (
                    <motion.div
                      key={status.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center space-x-4 py-4 ${
                        index < normalStatuses.length - 1 ? 'border-b border-default' : ''
                      }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-primary text-primary-foreground animate-pulse'
                          : isCompleted
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-content-secondary'}`}>
                          {status.label}
                        </h3>
                        <p className="text-sm text-content-tertiary">
                          {status.description}
                        </p>
                        {isActive && order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-orange-600">
                              {timeElapsed > 0 ? `${timeElapsed} min` : 'Just started'}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>

            {/* Order Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    className="flex justify-between items-start py-3 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-content-primary">{item.name}</h4>
                      {item.categoryName && (
                        <p className="text-sm text-content-secondary">{item.categoryName}</p>
                      )}
                      <div className="flex items-center space-x-2 text-sm text-content-tertiary">
                        <span>${item.unitPrice.toFixed(2)} each</span>
                        <span>•</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      {item.customizations && Object.keys(item.customizations).length > 0 && (
                        <div className="mt-1 text-xs text-content-tertiary">
                          Customizations: {JSON.stringify(item.customizations)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-content-primary">
                        ${item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {order.specialInstructions && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <h4 className="text-sm font-medium text-orange-800 mb-1">
                    Special Instructions
                  </h4>
                  <p className="text-sm text-orange-700">
                    {order.specialInstructions}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface rounded-xl border p-6 sticky top-24"
            >
              <h3 className="text-xl font-semibold text-content-primary mb-6">
                Order Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-content-secondary">
                  <span>Subtotal ({order.items.length} items)</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-content-secondary">
                  <span>Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold text-content-primary">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <AnimatePresence>
                  {showPaymentOption && order.status === OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Button
                        onClick={handlePayment}
                        className="w-full"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Special message for cancelled orders */}
                {order.status === OrderStatus.CANCELLED && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-800">Order Cancelled</h4>
                        <p className="text-sm text-red-600">
                          This order has been cancelled. No payment is required.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Button
                  variant="outline"
                  onClick={handleCallWaiter}
                  className="w-full"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Waiter
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleBackToMenu}
                  className="w-full"
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  Back to Menu
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    // Share order functionality
                    if (navigator.share) {
                      navigator.share({
                        title: `Order #${order.orderNumber}`,
                        text: `Track order #${order.orderNumber}`,
                        url: window.location.href
                      })
                    } else {
                      navigator.clipboard.writeText(window.location.href)
                      toast.success('Order link copied to clipboard!')
                    }
                  }}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Share Order
                </Button>
              </div>

              {/* Guest Information */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-content-primary mb-3">
                  Guest Information
                </h4>
                <div className="space-y-2 text-sm text-content-secondary">
                  <div>Name: {order.guestInfo.name}</div>
                  {order.guestInfo.phone && (
                    <div>Phone: {order.guestInfo.phone}</div>
                  )}
                  {order.guestInfo.email && (
                    <div>Email: {order.guestInfo.email}</div>
                  )}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-content-primary mb-3">
                  Order Timeline
                </h4>
                <div className="space-y-2 text-xs text-content-tertiary">
                  <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
                  <div>Updated: {new Date(order.updatedAt).toLocaleString()}</div>
                  {order.estimatedTime && (
                    <div>Est. Time: {order.estimatedTime} minutes</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
