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
  Phone,
  HelpCircle,
  RefreshCw,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/components/providers/api-provider'
import { OrderStatus } from '@tabsy/shared-types'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { SessionManager } from '@/lib/session'
import { OrderStatusSkeleton, OrderTimelineSkeleton, OrderSummarySkeleton, HeaderSkeleton } from '../ui/Skeleton'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator'
import { processOrderUpdatePayload } from '@/utils/websocket'
import { CustomizationList } from '@tabsy/ui-components'

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
    categoryName: item.menuItem?.category?.name || item.menuItem?.categoryName || item.categoryName || 'Unknown Category',
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
    color: 'text-status-info'
  },
  {
    key: OrderStatus.PREPARING,
    label: 'Preparing',
    description: 'Your delicious food is being prepared',
    icon: ChefHat,
    color: 'text-status-warning'
  },
  {
    key: OrderStatus.READY,
    label: 'Ready',
    description: 'Your order is ready to be served',
    icon: Bell,
    color: 'text-secondary'
  },
  {
    key: OrderStatus.DELIVERED,
    label: 'Delivered',
    description: 'Enjoy your meal!',
    icon: Utensils,
    color: 'text-status-success'
  },
  {
    key: OrderStatus.COMPLETED,
    label: 'Completed',
    description: 'Thank you for dining with us!',
    icon: CheckCircle,
    color: 'text-status-success'
  },
  {
    key: OrderStatus.CANCELLED,
    label: 'Cancelled',
    description: 'This order has been cancelled',
    icon: XCircle,
    color: 'text-status-error'
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

  // Call waiter state
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [callWaiterCooldown, setCallWaiterCooldown] = useState(0)
  const [lastCallTime, setLastCallTime] = useState<number | null>(null)
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  // Use global WebSocket connection for real-time updates
  const { isConnected: wsConnected, client: wsClient } = useWebSocket()

  // Log connection status for debugging
  useEffect(() => {
    if (wsConnected) {
      console.log('Connected to order tracking updates')
    } else {
      console.log('Disconnected from order tracking updates')
    }
  }, [wsConnected])

  // Listen for order status updates
  useWebSocketEvent(
    'order:status_updated',
    (payload) => {
      console.log('[OrderTrackingView] Raw status update payload:', payload)

      // Use utility function to extract and validate order data
      const extractedData = processOrderUpdatePayload(payload, 'OrderTrackingView')

      if (!extractedData) {
        console.warn('[OrderTrackingView] Failed to extract valid order data, skipping update')
        return
      }

      const { orderId: payloadOrderId, status: newStatus, updatedAt, estimatedTime } = extractedData

      console.log('[OrderTrackingView] Extracted data:', {
        payloadOrderId,
        newStatus,
        currentOrderId: orderId,
        isMatchingOrder: payloadOrderId === orderId
      })

      // Check if this update is for our current order
      if (payloadOrderId === orderId) {
        console.log('[OrderTrackingView] Processing status update for matching order:', { payloadOrderId, newStatus })

        setOrder(prevOrder => {
          if (!prevOrder) {
            console.warn('[OrderTrackingView] No previous order state, skipping update')
            return prevOrder
          }

          console.log('[OrderTrackingView] Updating order status:', {
            from: prevOrder.status,
            to: newStatus,
            orderId: prevOrder.id
          })

          const updatedOrder = {
            ...prevOrder,
            status: newStatus!,
            updatedAt: updatedAt || new Date().toISOString()
          }

          // If we have estimated time in the payload, update it
          if (estimatedTime) {
            updatedOrder.estimatedTime = estimatedTime
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
              console.log('[OrderTrackingView] Showed status notification:', statusInfo.label)
            }

            // Show payment option if order is delivered
            if (newStatus === OrderStatus.DELIVERED) {
              setShowPaymentOption(true)
              console.log('[OrderTrackingView] Order delivered, showing payment option')
            }
          }

          // Update SessionManager with the updated order
          SessionManager.setCurrentOrder({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            createdAt: Date.now()
          })

          console.log('[OrderTrackingView] Successfully updated order state')
          return updatedOrder
        })
      } else {
        console.log('[OrderTrackingView] Status update for different order, ignoring:', {
          payloadOrderId,
          currentOrderId: orderId
        })
      }
    },
    [orderId],
    'OrderTrackingView'
  )

  // Listen for general order updates
  useWebSocketEvent(
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
    [orderId],
    'OrderTrackingView'
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

  // Cooldown timer for call waiter feature
  useEffect(() => {
    if (callWaiterCooldown > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCallWaiterCooldown(prev => {
          if (prev <= 1) {
            setWaiterCalled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current)
        }
      }
    }
  }, [callWaiterCooldown])

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

  const handleCallWaiter = async () => {
    // Prevent multiple calls if already processing or on cooldown
    if (loading || callWaiterCooldown > 0) return

    try {
      const diningSession = SessionManager.getDiningSession()
      if (!restaurantId || !tableId) {
        toast.error('Unable to call waiter - missing restaurant or table information')
        return
      }

      // Show loading state
      toast.loading('Calling waiter...', { id: 'call-waiter' })

      // Call the API
      const response = await api.restaurant.callWaiter(restaurantId, {
        tableId,
        orderId: order?.orderNumber,
        customerName: order?.guestInfo?.name || 'Guest',
        urgency: 'normal'
      })

      if (response.success) {
        // Set waiter called state and start cooldown (2 minutes)
        setWaiterCalled(true)
        setLastCallTime(Date.now())
        setCallWaiterCooldown(120) // 2 minutes cooldown

        toast.success('Waiter called!', {
          id: 'call-waiter',
          description: `A member of our staff will be with you shortly (${response.data?.estimatedResponseTime || '2-5 minutes'})`,
          duration: 4000
        })
      } else {
        throw new Error(response.error?.message || 'Failed to call waiter')
      }
    } catch (error: any) {
      console.error('Failed to call waiter:', error)
      toast.error('Failed to call waiter', {
        id: 'call-waiter',
        description: 'Please try again or contact restaurant staff directly',
        duration: 4000
      })
    }
  }

  const handleCancelWaiterCall = () => {
    setWaiterCalled(false)
    setCallWaiterCooldown(0)
    setLastCallTime(null)

    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current)
    }

    toast.success('Waiter call cancelled', {
      duration: 2000
    })
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
                <div className="h-5 w-32 bg-surface-tertiary rounded animate-pulse mb-4" />
                <OrderTimelineSkeleton />
              </div>
            </div>

            {/* Order Summary Skeleton */}
            <div className="space-y-6">
              <OrderSummarySkeleton />

              {/* Action buttons skeleton */}
              <div className="space-y-3">
                <div className="h-10 w-full bg-surface-tertiary rounded animate-pulse" />
                <div className="h-10 w-full bg-surface-tertiary rounded animate-pulse" />
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
          <div className="w-16 h-16 mx-auto bg-status-error-light rounded-full flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-status-error" />
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
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-status-success' : 'bg-status-warning'}`} />
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
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-status-error-light text-status-error">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-status-error">
                      Order Cancelled
                    </h3>
                    <p className="text-sm text-content-tertiary">
                      This order has been cancelled
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Clock className="w-4 h-4 text-status-error" />
                      <span className="text-sm text-status-error">
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
                          ? 'bg-status-success-light text-status-success'
                          : 'bg-surface-tertiary text-content-tertiary'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-status-success' : 'text-content-secondary'}`}>
                          {status.label}
                        </h3>
                        <p className="text-sm text-content-tertiary">
                          {status.description}
                        </p>
                        {isActive && order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Clock className="w-4 h-4 text-status-warning" />
                            <span className="text-sm text-status-warning">
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
                      {item.customizations && (
                        <div className="mt-2">
                          <CustomizationList
                            customizations={item.customizations}
                            compact={true}
                            showPrices={true}
                            className="text-xs"
                          />
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
                <div className="mt-4 p-3 bg-status-warning-light rounded-lg">
                  <h4 className="text-sm font-medium text-status-warning mb-1">
                    Special Instructions
                  </h4>
                  <p className="text-sm text-status-warning">
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
                    className="bg-status-error-light border border-status-error rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-status-error" />
                      <div>
                        <h4 className="font-medium text-status-error">Order Cancelled</h4>
                        <p className="text-sm text-status-error">
                          This order has been cancelled. No payment is required.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {waiterCalled && callWaiterCooldown > 0 ? (
                  <div className="space-y-2">
                    <div className="bg-status-success-light border border-status-success rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-status-success" />
                          <span className="text-sm font-medium text-status-success">
                            Waiter Called
                          </span>
                        </div>
                        <span className="text-xs text-status-success">
                          {Math.floor(callWaiterCooldown / 60)}:{(callWaiterCooldown % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-xs text-status-success mt-1">
                        Staff will be with you shortly
                      </p>
                    </div>
                    {callWaiterCooldown > 90 && (
                      <Button
                        variant="ghost"
                        onClick={handleCancelWaiterCall}
                        className="w-full text-xs"
                        size="sm"
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleCallWaiter}
                    disabled={callWaiterCooldown > 0}
                    className="w-full"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {callWaiterCooldown > 0
                      ? `Call Waiter (${Math.floor(callWaiterCooldown / 60)}:${(callWaiterCooldown % 60).toString().padStart(2, '0')})`
                      : 'Call Waiter'
                    }
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={handleBackToMenu}
                  className="w-full"
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  Back to Menu
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
