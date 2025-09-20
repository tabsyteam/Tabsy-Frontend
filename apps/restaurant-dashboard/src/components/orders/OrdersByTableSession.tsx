'use client'

import { useState, useEffect } from 'react'
import { Button, Badge } from '@tabsy/ui-components'
import { useWebSocket, tabsyClient } from '@tabsy/api-client'
import {
  Users,
  Clock,
  ChefHat,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  ArrowRight,
  Banknote
} from 'lucide-react'
import type {
  Order,
  OrderStatus,
  MultiUserTableSession,
  TableSessionUser
} from '@tabsy/shared-types'
import { TableSessionStatus } from '@tabsy/shared-types'
import { OrderCard } from './OrderCard'
import { OrderDetailSlidePanel } from './OrderDetailSlidePanel'
import { toast } from 'sonner'

interface OrdersByTableSessionProps {
  restaurantId: string
}

interface TableSessionWithOrders {
  tableSession: MultiUserTableSession
  users: TableSessionUser[]
  ordersByRound: { [roundNumber: number]: Order[] }
  totalOrders: number
  activeOrders: number
  completedOrders: number
  totalAmount: number
  paidAmount: number
  tableName: string
}

const getSessionStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800'
    case 'ORDERING_LOCKED':
      return 'bg-yellow-100 text-yellow-800'
    case 'PAYMENT_PENDING':
      return 'bg-blue-100 text-blue-800'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getOrderStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'RECEIVED':
      return 'bg-blue-100 text-blue-800'
    case 'PREPARING':
      return 'bg-yellow-100 text-yellow-800'
    case 'READY':
      return 'bg-green-100 text-green-800'
    case 'DELIVERED':
      return 'bg-purple-100 text-purple-800'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function OrdersByTableSession({ restaurantId }: OrdersByTableSessionProps) {
  const [tableSessions, setTableSessions] = useState<TableSessionWithOrders[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'NEEDS_ATTENTION'>('ALL')

  const { isConnected } = useWebSocket()

  // Load table sessions with orders from API
  useEffect(() => {
    const loadTableSessions = async () => {
      try {
        setIsLoading(true)

        // Get active table sessions for the restaurant
        const response = await tabsyClient.restaurantTableSession.getAllSessions(
          { restaurantId, status: ['ACTIVE', 'ORDERING_LOCKED', 'PAYMENT_PENDING'] },
          1,
          50
        )

        if (response.success && response.data) {
          // Get detailed information for each session
          const sessionDataPromises = response.data.sessions.map(async (session) => {
            try {
              // Get detailed session information
              const detailsResponse = await tabsyClient.restaurantTableSession.getSessionDetails(session.id)

              if (detailsResponse.success && detailsResponse.data) {
                const details = detailsResponse.data

                // Group orders by round
                const ordersByRound: { [key: number]: any[] } = {}
                details.orders?.forEach(order => {
                  const round = order.round || 1
                  if (!ordersByRound[round]) {
                    ordersByRound[round] = []
                  }
                  ordersByRound[round].push(order)
                })

                const allOrders = details.orders || []
                const totalOrders = allOrders.length
                const activeOrders = allOrders.filter(order => !['COMPLETED', 'CANCELLED'].includes(order.status)).length
                const completedOrders = allOrders.filter(order => order.status === 'COMPLETED').length

                return {
                  tableSession: {
                    id: session.id,
                    tableId: session.tableId,
                    restaurantId: session.restaurantId,
                    sessionCode: session.sessionCode,
                    status: session.status,
                    totalAmount: session.totalAmount,
                    paidAmount: session.paidAmount,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                    lastActivity: session.lastActivity
                  },
                  users: details.users || [],
                  ordersByRound,
                  totalOrders,
                  activeOrders,
                  completedOrders,
                  totalAmount: session.totalAmount,
                  paidAmount: session.paidAmount,
                  tableName: session.tableName
                }
              } else {
                // Fallback to basic session info if details fail
                return {
                  tableSession: {
                    id: session.id,
                    tableId: session.tableId,
                    restaurantId: session.restaurantId,
                    sessionCode: session.sessionCode,
                    status: session.status,
                    totalAmount: session.totalAmount,
                    paidAmount: session.paidAmount,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                    lastActivity: session.lastActivity
                  },
                  users: [],
                  ordersByRound: {},
                  totalOrders: session.orderCount || 0,
                  activeOrders: session.orderCount || 0, // Assume active for basic info
                  completedOrders: 0,
                  totalAmount: session.totalAmount,
                  paidAmount: session.paidAmount,
                  tableName: session.tableName
                }
              }
            } catch (error) {
              console.error(`Error loading details for session ${session.id}:`, error)
              // Return basic session info on error
              return {
                tableSession: {
                  id: session.id,
                  tableId: session.tableId,
                  restaurantId: session.restaurantId,
                  sessionCode: session.sessionCode,
                  status: session.status,
                  totalAmount: session.totalAmount,
                  paidAmount: session.paidAmount,
                  createdAt: session.createdAt,
                  expiresAt: session.expiresAt,
                  lastActivity: session.lastActivity
                },
                users: [],
                ordersByRound: {},
                totalOrders: session.orderCount || 0,
                activeOrders: session.orderCount || 0, // Assume active for basic info
                completedOrders: 0,
                totalAmount: session.totalAmount,
                paidAmount: session.paidAmount,
                tableName: session.tableName
              }
            }
          })

          const sessionData = await Promise.all(sessionDataPromises)
          setTableSessions(sessionData)
        } else {
          setTableSessions([])
        }
      } catch (error) {
        console.error('[OrdersByTableSession] Error loading sessions:', error)
        toast.error('Failed to load table sessions')
        setTableSessions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTableSessions()
  }, [restaurantId])

  // Filter sessions based on status
  const filteredSessions = tableSessions.filter(session => {
    switch (statusFilter) {
      case 'ACTIVE':
        return session.activeOrders > 0
      case 'NEEDS_ATTENTION':
        const sessionAge = Date.now() - new Date(session.tableSession.createdAt).getTime()
        const isOld = sessionAge > 2 * 60 * 60 * 1000 // More than 2 hours
        const hasUnpaidBalance = session.paidAmount < session.totalAmount
        return isOld || hasUnpaidBalance
      case 'ALL':
      default:
        return true
    }
  })

  // Handle order status update
  const handleOrderStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      // In a real implementation:
      // await api.order.updateStatus(orderId, newStatus)

      // Update local state
      setTableSessions(prev =>
        prev.map(session => ({
          ...session,
          ordersByRound: Object.fromEntries(
            Object.entries(session.ordersByRound).map(([round, orders]) => [
              round,
              orders.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
              )
            ])
          )
        }))
      )

      toast.success(`Order status updated to ${newStatus}`)
    } catch (error) {
      console.error('[OrdersByTableSession] Error updating order status:', error)
      toast.error('Failed to update order status')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-content-secondary">Loading table sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Orders by Table Session</h2>
          <p className="text-content-secondary">
            Manage orders grouped by table sessions
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
          >
            All Sessions
          </Button>
          <Button
            variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Active Orders
          </Button>
          <Button
            variant={statusFilter === 'NEEDS_ATTENTION' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('NEEDS_ATTENTION')}
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            Needs Attention
          </Button>
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🍽️</div>
          <h3 className="text-xl font-medium mb-2">No table sessions found</h3>
          <p className="text-content-secondary">
            {statusFilter === 'ALL'
              ? 'No active table sessions at the moment'
              : `No sessions matching "${statusFilter}" filter`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSessions.map(session => {
            const sessionAge = Math.floor((Date.now() - new Date(session.tableSession.createdAt).getTime()) / (1000 * 60))
            const needsAttention = sessionAge > 120 || session.paidAmount < session.totalAmount

            return (
              <div
                key={session.tableSession.id}
                className={`bg-surface rounded-lg border p-6 space-y-4 ${
                  needsAttention ? 'border-warning' : 'border-default'
                }`}
              >
                {/* Session Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{session.tableName}</h3>
                    <p className="text-sm text-content-secondary">
                      Session: {session.tableSession.sessionCode}
                    </p>
                  </div>
                  <Badge
                    variant={session.tableSession.status === 'ACTIVE' ? 'success' : session.tableSession.status === 'PAYMENT_PENDING' ? 'info' : 'neutral'}
                  >
                    {session.tableSession.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Users */}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-content-secondary" />
                  <div className="flex flex-wrap gap-1">
                    {session.users.map(user => (
                      <Badge key={user.guestSessionId} variant="outline">
                        {user.userName} {user.isHost && '👑'}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Session Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold text-primary">{session.totalOrders}</div>
                    <div className="text-xs text-content-secondary">Orders</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-warning">{session.activeOrders}</div>
                    <div className="text-xs text-content-secondary">Active</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-success">{session.completedOrders}</div>
                    <div className="text-xs text-content-secondary">Done</div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="bg-surface-secondary rounded p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">Payment Status</span>
                    <Banknote className="w-4 h-4 text-content-secondary" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">${session.paidAmount.toFixed(2)} / ${session.totalAmount.toFixed(2)}</span>
                    <Badge
                      variant={session.paidAmount >= session.totalAmount ? 'success' : 'warning'}
                    >
                      {session.paidAmount >= session.totalAmount ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                  {session.paidAmount < session.totalAmount && (
                    <div className="text-xs text-warning mt-1">
                      Remaining: ${(session.totalAmount - session.paidAmount).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Orders by Round */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Orders by Round</h4>
                  {Object.entries(session.ordersByRound).map(([roundNum, orders]) => (
                    <div key={roundNum} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                          Round {roundNum}
                        </span>
                        <span className="text-xs text-content-secondary">
                          {orders.length} order{orders.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {orders.map(order => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-2 bg-surface-tertiary rounded cursor-pointer hover:bg-surface-secondary transition-colors"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{order.orderNumber}</span>
                              <Badge
                                variant={order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' ? 'destructive' : 'info'}
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">${Number(order.total).toFixed(2)}</span>
                              <ArrowRight className="w-3 h-3 text-content-secondary" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Attention Alerts */}
                {needsAttention && (
                  <div className="bg-warning/10 border border-warning/20 rounded p-3">
                    <div className="flex items-center gap-1 text-warning text-sm font-medium mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Needs Attention
                    </div>
                    <ul className="text-xs text-content-secondary space-y-0.5">
                      {sessionAge > 120 && (
                        <li>• Session active for {Math.floor(sessionAge / 60)}h {sessionAge % 60}m</li>
                      )}
                      {session.paidAmount < session.totalAmount && (
                        <li>• Unpaid balance: ${(session.totalAmount - session.paidAmount).toFixed(2)}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Session Actions */}
                <div className="flex gap-2 pt-2 border-t border-default">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Close Session
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Order Detail Panel */}
      {selectedOrder && (
        <OrderDetailSlidePanel
          isOpen={true}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleOrderStatusUpdate}
        />
      )}
    </div>
  )
}