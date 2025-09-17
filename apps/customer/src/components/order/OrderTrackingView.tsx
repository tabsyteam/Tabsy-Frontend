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
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { OrderStatus } from '@tabsy/shared-types'
import { useWebSocket, useWebSocketEvent } from '@tabsy/api-client'
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

  // Get session info from sessionStorage for WebSocket auth
  const sessionData = typeof window !== 'undefined' ? sessionStorage.getItem('tabsy-session') : null
  const sessionId = sessionData ? JSON.parse(sessionData)?.sessionId : null

  // Real-time WebSocket connection to customer namespace
  const {
    isConnected: wsConnected,
    client: wsClient
  } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5001',
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
          const newStatus = payload.order?.status || payload.status || payload.newStatus

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
          if (payload.order && typeof payload.order === 'object') {
            Object.assign(updatedOrder, payload.order)
            updatedOrder.updatedAt = new Date().toISOString()
          }

          if (payload.estimatedTime || payload.order?.estimatedPreparationTime) {
            updatedOrder.estimatedTime = payload.estimatedTime || payload.order.estimatedPreparationTime
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
          if (payload.order && typeof payload.order === 'object') {
            // If we have a full order object, merge it
            Object.assign(updatedOrder, transformApiOrderToLocal(payload.order))
          } else if (payload.changes && typeof payload.changes === 'object') {
            // If we have changes object, apply the changes
            Object.assign(updatedOrder, payload.changes)
          } else {
            // Apply any direct fields from payload (excluding metadata)
            const { orderId, timestamp, restaurantId, tableId, userId, ...orderFields } = payload
            Object.assign(updatedOrder, orderFields)
          }

          updatedOrder.updatedAt = new Date().toISOString()
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
    if (order && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
      const startTime = new Date(order.createdAt).getTime()

      const updateTimer = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000 / 60) // minutes
        setTimeElapsed(elapsed)
      }

      updateTimer()
      intervalRef.current = setInterval(updateTimer, 60000) // Update every minute

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [order])

  // Real-time updates via WebSocket only - no fallback polling
  useEffect(() => {
    console.log('🔌 Customer WebSocket connection status:', {
      wsConnected,
      hasOrder: !!order,
      orderStatus: order?.status,
      orderId,
      restaurantId,
      tableId,
      sessionId
    })

    // Log connection status for debugging
    if (!wsConnected && order && order.status !== OrderStatus.COMPLETED) {
      console.warn('⚠️ WebSocket not connected - real-time updates may be delayed')
      console.log('🔧 WebSocket auth params:', {
        namespace: 'customer',
        restaurantId: restaurantId || undefined,
        tableId: tableId || undefined,
        sessionId: sessionId || undefined
      })
    } else if (wsConnected) {
      console.log('✅ WebSocket connected - real-time updates active')
    }

    // NO FALLBACK POLLING - rely exclusively on WebSocket for real-time updates
    // This eliminates the 1-minute API polling that was causing delays
  }, [wsConnected, order, orderId, restaurantId, tableId, sessionId])

  const getCurrentStatusIndex = (): number => {
    if (!order) return 0
    return ORDER_STATUSES.findIndex(status => status.key === order.status)
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
    <div className="min-h-screen bg-background" ref={pullToRefresh.bind}>
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        pullDistance={pullToRefresh.pullDistance}
        canRefresh={pullToRefresh.canRefresh}
        progress={pullToRefresh.progress}
      />

      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Order #{order.orderNumber}</h1>
                <div className="flex items-center space-x-3">
                  <p className="text-sm text-content-tertiary">
                    {order.guestInfo.name} • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                  {/* WebSocket Connection Status */}
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <span className="text-xs text-content-tertiary">
                      {wsConnected ? 'Live' : 'Polling'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

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
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  ORDER_STATUSES[currentStatusIndex]?.color === 'text-green-600' ? 'bg-green-100' :
                  ORDER_STATUSES[currentStatusIndex]?.color === 'text-orange-600' ? 'bg-orange-100' :
                  ORDER_STATUSES[currentStatusIndex]?.color === 'text-purple-600' ? 'bg-purple-100' :
                  ORDER_STATUSES[currentStatusIndex]?.color === 'text-blue-600' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {React.createElement(ORDER_STATUSES[currentStatusIndex]?.icon || Clock, {
                    className: `w-6 h-6 ${ORDER_STATUSES[currentStatusIndex]?.color || 'text-gray-600'}`
                  })}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-content-primary">
                    {ORDER_STATUSES[currentStatusIndex]?.label || 'Processing'}
                  </h2>
                  <p className="text-content-secondary">
                    {ORDER_STATUSES[currentStatusIndex]?.description || 'Please wait'}
                  </p>
                </div>
              </div>

              {timeElapsed > 0 && order.status !== OrderStatus.DELIVERED && (
                <div className="flex items-center space-x-2 text-sm text-content-tertiary">
                  <Clock className="w-4 h-4" />
                  <span>Time elapsed: {timeElapsed} minute{timeElapsed !== 1 ? 's' : ''}</span>
                </div>
              )}
            </motion.div>

            {/* Progress Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4">
                Order Progress
              </h3>

              <div className="space-y-4">
                {ORDER_STATUSES.map((status, index) => {
                  const isCompleted = index <= currentStatusIndex
                  const isCurrent = index === currentStatusIndex

                  return (
                    <div key={status.key} className="flex items-center space-x-4">
                      <div className={`relative flex-shrink-0 w-8 h-8 rounded-full border-2 transition-colors ${
                        isCompleted
                          ? 'bg-primary border-primary'
                          : 'border-gray-300 bg-background'
                      }`}>
                        {isCompleted && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <CheckCircle className="w-4 h-4 text-white" />
                          </motion.div>
                        )}

                        {isCurrent && !isCompleted && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-1 bg-primary rounded-full"
                          />
                        )}

                        {index < ORDER_STATUSES.length - 1 && (
                          <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-6 ${
                            isCompleted ? 'bg-primary' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>

                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          isCompleted ? 'text-content-primary' : 'text-content-tertiary'
                        }`}>
                          {status.label}
                        </h4>
                        <p className={`text-sm ${
                          isCompleted ? 'text-content-secondary' : 'text-content-tertiary'
                        }`}>
                          {status.description}
                        </p>
                      </div>

                      {isCurrent && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex-shrink-0"
                        >
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Order Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface rounded-xl border p-6"
            >
              <h3 className="text-lg font-semibold text-content-primary mb-4">
                Order Items
              </h3>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium text-content-primary">{item.name}</h4>
                      <div className="text-sm text-content-secondary">
                        ${(item.unitPrice || 0).toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-semibold text-content-primary">
                      ${(item.totalPrice || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {order.specialInstructions && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-content-primary mb-2">Special Instructions</h4>
                  <p className="text-content-secondary text-sm bg-gray-50 p-3 rounded-lg">
                    {order.specialInstructions}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Actions and Summary */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface rounded-xl border p-6"
              >
                <h3 className="text-lg font-semibold text-content-primary mb-4">
                  Quick Actions
                </h3>

                <div className="space-y-3">
                  <Button
                    onClick={handleCallWaiter}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Call Waiter
                  </Button>

                  <Button
                    onClick={handleBackToMenu}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Utensils className="w-4 h-4 mr-2" />
                    Order More Items
                  </Button>

                  {order.guestInfo.phone && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open(`tel:${order.guestInfo.phone}`)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Contact Restaurant
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Payment Option */}
              <AnimatePresence>
                {showPaymentOption && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-primary/5 border border-primary/20 rounded-xl p-6"
                  >
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-content-primary mb-2">
                          Ready to Pay?
                        </h3>
                        <p className="text-sm text-content-secondary">
                          Your meal is served! You can now pay for your order.
                        </p>
                      </div>
                      <Button onClick={handlePayment} className="w-full">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now - ${(order.total || 0).toFixed(2)}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Order Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-surface rounded-xl border p-6"
              >
                <h3 className="text-lg font-semibold text-content-primary mb-4">
                  Order Total
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-content-secondary">
                    <span>Subtotal</span>
                    <span>${(order.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-content-secondary">
                    <span>Tax</span>
                    <span>${(order.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-semibold text-content-primary">
                      <span>Total</span>
                      <span>${(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}