'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  Clock,
  CheckCircle,
  ChefHat,
  Bell,
  Utensils,
  Receipt,
  ArrowRight,
  RefreshCw,
  Plus,
  AlertCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useApi } from '@/components/providers/api-provider'
import { OrderStatus, Order as ApiOrder } from '@tabsy/shared-types'
import { SessionManager } from '@/lib/session'

// Using Order and OrderItem types from shared-types
type Order = ApiOrder & {
  restaurantName?: string // Additional field for display
}

const ORDER_STATUS_CONFIG = {
  [OrderStatus.RECEIVED]: {
    label: 'Order Received',
    icon: Receipt,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Order confirmed'
  },
  [OrderStatus.PREPARING]: {
    label: 'Preparing',
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Being prepared'
  },
  [OrderStatus.READY]: {
    label: 'Ready',
    icon: Bell,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Ready for pickup'
  },
  [OrderStatus.DELIVERED]: {
    label: 'Delivered',
    icon: Utensils,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Delivered to table'
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Order complete'
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    description: 'Order cancelled'
  }
} as const

export function OrdersView() {
  const router = useRouter()
  const { api } = useApi()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'current' | 'completed'>('current')

  // Check for session or order history
  const session = SessionManager.getDiningSession()
  const canAccess = SessionManager.canAccessOrders()

  // Load orders
  useEffect(() => {
    if (canAccess) {
      loadOrders()
    } else {
      setLoading(false)
    }
  }, [canAccess])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const allOrders: Order[] = []

      // First, try to load orders from API if we have a dining session
      if (session) {
        try {
          const response = await api.order.list()
          if (response.success && response.data) {
            const apiOrders: Order[] = response.data.map((order: ApiOrder) => ({
              ...order,
              restaurantName: undefined
            }))
            allOrders.push(...apiOrders)
          }
        } catch (apiError) {
          console.warn('Failed to load orders from API:', apiError)
        }
      }

      // Load orders from order history (placed during this session)
      const orderHistory = SessionManager.getOrderHistory()
      for (const orderId of orderHistory.orderIds) {
        try {
          // Try to get individual order details
          const response = await api.order.getById(orderId)
          if (response.success && response.data) {
            const existingOrder = allOrders.find(o => o.id === orderId)
            if (!existingOrder) {
              allOrders.push({
                ...response.data,
                restaurantName: undefined
              })
            }
          }
        } catch (orderError) {
          console.warn(`Failed to load order ${orderId}:`, orderError)

          // If API fails, try to get basic info from sessionStorage
          const currentOrder = SessionManager.getCurrentOrder()
          if (currentOrder && currentOrder.orderId === orderId) {
            const existingOrder = allOrders.find(o => o.id === orderId)
            if (!existingOrder) {
              // Create a basic order object from session data
              const basicOrder: Order = {
                id: currentOrder.orderId,
                orderNumber: currentOrder.orderNumber,
                status: currentOrder.status as any,
                createdAt: new Date(currentOrder.createdAt).toISOString(),
                updatedAt: new Date(currentOrder.createdAt).toISOString(),
                total: '0.00', // Will be updated when API is available
                subtotal: '0.00',
                tax: '0.00',
                tip: '0.00',
                restaurantId: session?.restaurantId || '',
                tableId: session?.tableId || '',
                customerId: undefined,
                customerName: undefined,
                customerPhone: undefined,
                customerEmail: undefined,
                specialInstructions: undefined,
                estimatedPreparationTime: undefined,
                items: [],
                restaurantName: session?.restaurantName
              }
              allOrders.push(basicOrder)
            }
          }
        }
      }

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

  const handleNewOrder = () => {
    router.push(SessionManager.getMenuUrl())
  }

  const currentOrders = orders.filter(order =>
    order.status !== OrderStatus.COMPLETED
  )

  const completedOrders = orders.filter(order =>
    order.status === OrderStatus.COMPLETED
  )

  const displayOrders = activeTab === 'current' ? currentOrders : completedOrders

  const getTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  }

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
              <h1 className="text-2xl font-bold text-content-primary">My Orders</h1>
              <p className="text-content-secondary">Track your current and past orders</p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6 bg-background-secondary rounded-lg p-1">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'current'
                  ? 'bg-surface text-content-primary shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Current Orders ({currentOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'bg-surface text-content-primary shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Completed ({completedOrders.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Empty State */}
        {displayOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-content-primary mb-2">
              {activeTab === 'current' ? 'No current orders' : 'No completed orders'}
            </h3>
            <p className="text-content-secondary mb-6">
              {activeTab === 'current'
                ? 'Ready to place your first order? Browse our delicious menu!'
                : 'Your completed orders will appear here'
              }
            </p>
            {activeTab === 'current' && (
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
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {displayOrders.map((order) => {
              const statusConfig = ORDER_STATUS_CONFIG[order.status]
              const StatusIcon = statusConfig.icon

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOrderClick(order.id)}
                  className="bg-surface rounded-xl border p-6 cursor-pointer hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full ${statusConfig.bgColor} flex items-center justify-center`}>
                        <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-content-primary">
                          Order #{order.orderNumber}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-content-secondary">
                          <span>{statusConfig.label}</span>
                          <span>•</span>
                          <span>{getTimeAgo(order.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold text-content-primary">
                        ${typeof order.total === 'string' ? parseFloat(order.total).toFixed(2) : order.total.toFixed(2)}
                      </div>
                      {order.status !== OrderStatus.COMPLETED && order.estimatedPreparationTime && (
                        <div className="flex items-center text-sm text-content-tertiary">
                          <Clock className="w-3 h-3 mr-1" />
                          {order.estimatedPreparationTime} min
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Restaurant Name */}
                  {order.restaurantName && (
                    <div className="text-sm text-content-secondary mb-3">
                      {order.restaurantName}
                    </div>
                  )}

                  {/* Items Summary */}
                  <div className="mb-4">
                    <div className="text-sm text-content-secondary">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}:
                    </div>
                    <div className="text-sm text-content-primary">
                      {order.items.map(item =>
                        `${item.quantity}x ${item.menuItem?.name || (item as any).name || 'Unknown Item'}`
                      ).join(', ')}
                    </div>
                  </div>

                  {/* Status Description and Action */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-tertiary">
                      {statusConfig.description}
                    </span>
                    <ArrowRight className="w-4 h-4 text-content-tertiary" />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Floating Action Button for New Order */}
        {activeTab === 'current' && currentOrders.length > 0 && (
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