'use client'

import { useState, useEffect } from 'react'
import { Button, Badge } from '@tabsy/ui-components'
import {
  X,
  Clock,
  Users,
  QrCode,
  Banknote,
  AlertTriangle,
  User,
  ShoppingBag,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { MultiUserTableSession, TableSessionUser } from '@tabsy/shared-types'
import { tabsyClient } from '@tabsy/api-client'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface SessionDetailsModalProps {
  sessionId: string
  onClose: () => void
  onSessionClosed?: () => void
}

interface SessionDetails {
  session: MultiUserTableSession & {
    tableName?: string
    restaurantName?: string
    needsAttention?: boolean
    alertReasons?: string[]
  }
  users: TableSessionUser[]
  orders: any[]
  payments: any[]
  timeline: {
    timestamp: string
    event: string
    description: string
    userId?: string
  }[]
}

export function SessionDetailsModal({ sessionId, onClose, onSessionClosed }: SessionDetailsModalProps) {
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null)
  const [paymentSummary, setPaymentSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { restaurant } = useCurrentRestaurant()
  const currency = (restaurant?.currency as CurrencyCode) || 'USD'

  // Use shared utility for consistent formatting
  const formatPrice = (price: number) => formatPriceUtil(price, currency)
  const [isClosing, setIsClosing] = useState(false)
  const [loadingPaymentSummary, setLoadingPaymentSummary] = useState(false)

  useEffect(() => {
    loadSessionDetails()
  }, [sessionId])

  const loadSessionDetails = async () => {
    try {
      setIsLoading(true)

      // Get session details from restaurant API
      const response = await tabsyClient.restaurantTableSession.getSessionDetails(sessionId)

      if (response.success && response.data) {
        setSessionDetails(response.data)
        // Also load payment summary for enhanced payment info
        await loadPaymentSummary()
      } else {
        toast.error('Session details not found')
        onClose()
      }
    } catch (error) {
      console.error('Error loading session details:', error)
      toast.error('Failed to load session details')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const loadPaymentSummary = async () => {
    try {
      setLoadingPaymentSummary(true)
      const response = await tabsyClient.restaurantTableSession.getPaymentSummary(sessionId)

      if (response.success && response.data) {
        setPaymentSummary(response.data)
      }
    } catch (error) {
      console.error('Error loading payment summary:', error)
      // Don't show error toast - this is supplementary information
    } finally {
      setLoadingPaymentSummary(false)
    }
  }

  const handleCloseSession = async () => {
    if (!sessionDetails) return

    try {
      setIsClosing(true)
      await tabsyClient.restaurantTableSession.forceCloseSession(
        sessionDetails.session.id,
        'Manually closed by restaurant staff'
      )

      toast.success('Session closed successfully')
      onSessionClosed?.()
      onClose()
    } catch (error) {
      console.error('Error closing session:', error)
      toast.error('Failed to close session')
    } finally {
      setIsClosing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'ORDERING_LOCKED':
        return 'warning'
      case 'PAYMENT_PENDING':
        return 'info'
      case 'CLOSED':
        return 'neutral'
      default:
        return 'neutral'
    }
  }

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes`
    } else {
      const hours = Math.floor(diffInMinutes / 60)
      const minutes = diffInMinutes % 60
      return `${hours}h ${minutes}m`
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg border border-default p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading session details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionDetails) {
    return null
  }

  const { session, users, orders, payments, timeline } = sessionDetails

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-background rounded-lg border border-default shadow-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-default flex-shrink-0">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Session Details</h2>
              <p className="text-sm text-content-secondary">
                Code: {session.sessionCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Session Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={getStatusColor(session.status) as any}>
                    {session.status.replace('_', ' ')}
                  </Badge>
                  {session.needsAttention && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Attention
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-content-secondary">Status</p>
              </div>

              <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-content-secondary" />
                  <span className="font-medium">{formatDuration(session.createdAt)}</span>
                </div>
                <p className="text-sm text-content-secondary">Duration</p>
              </div>

              <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-content-secondary" />
                  <span className="font-medium">{users.length} users</span>
                </div>
                <p className="text-sm text-content-secondary">Active Users</p>
              </div>

              <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="w-4 h-4 text-content-secondary" />
                  <span className="font-medium">{formatPrice(session.totalAmount)}</span>
                </div>
                <p className="text-sm text-content-secondary">Total Amount</p>
              </div>
            </div>

            {/* Attention Alerts */}
            {session.needsAttention && session.alertReasons && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <h3 className="font-medium text-warning">Session Needs Attention</h3>
                </div>
                <ul className="space-y-1">
                  {session.alertReasons.map((reason, index) => (
                    <li key={index} className="text-sm text-content-secondary">
                      • {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Active Users */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Active Users ({users.length})
              </h3>
              <div className="grid gap-3">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.userName}
                          {user.isHost && (
                            <Badge variant="info" size="sm">Host</Badge>
                          )}
                        </div>
                        <div className="text-xs text-content-secondary">
                          Joined {user.createdAt ? format(new Date(user.createdAt), 'h:mm a') : 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-content-secondary">
                      Last active {user.lastActivity ? format(new Date(user.lastActivity), 'h:mm a') : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders */}
            {orders.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Orders ({orders.length})
                </h3>
                <div className="space-y-3">
                  {orders.map(order => (
                    <div key={order.id} className="p-3 sm:p-3 bg-surface-secondary rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.orderNumber}</span>
                          <Badge variant={order.status === 'COMPLETED' ? 'success' : 'info'}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">{formatPrice(Number(order.total || 0))}</div>
                      </div>
                      <div className="text-sm text-content-secondary">
                        Placed by {users.find(u => u.guestSessionId === order.guestSessionId)?.userName || 'Unknown'}
                        {order.placedAt && ` at ${format(new Date(order.placedAt), 'h:mm a')}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Payment Status */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Payment Status
                {loadingPaymentSummary && (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
              </h3>

              {/* Quick Summary */}
              <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatPrice(paymentSummary?.totalOwed || session.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>Paid Amount:</span>
                  <span className="font-medium">{formatPrice(paymentSummary?.totalPaid || Number(session.paidAmount || 0))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Remaining:</span>
                  <span className={`font-medium ${
                    (paymentSummary?.isFullyPaid || session.paidAmount >= session.totalAmount) ? 'text-success' : 'text-warning'
                  }`}>
                    {formatPrice(paymentSummary?.remainingBalance || (session.totalAmount - session.paidAmount))}
                  </span>
                </div>

                {paymentSummary?.isFullyPaid && (
                  <div className="mt-3 flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Session is fully paid</span>
                  </div>
                )}
              </div>

              {/* Smart Recommendations */}
              {paymentSummary?.recommendations && paymentSummary.recommendations.length > 0 && (
                <div className="bg-info/10 border border-info/20 rounded-lg p-3 sm:p-4 mb-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-info" />
                    Staff Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {paymentSummary.recommendations.map((recommendation: string, index: number) => (
                      <li key={index} className="text-sm text-content-secondary">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Payment Breakdown */}
              {paymentSummary?.orders && paymentSummary.orders.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 text-sm text-content-secondary">Payment Breakdown by Order</h4>
                  <div className="space-y-2">
                    {paymentSummary.orders.map((order: any) => (
                      <div key={order.orderId} className="flex items-center justify-between p-2 bg-surface-tertiary rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{order.orderNumber}</span>
                          {order.isFullyPaid ? (
                            <CheckCircle className="w-3 h-3 text-success" />
                          ) : (
                            <XCircle className="w-3 h-3 text-warning" />
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatPrice(order.total)}</div>
                          <div className="text-xs text-content-secondary">
                            Paid: {formatPrice(order.paidAmount)}
                            {!order.isFullyPaid && (
                              <span className="text-warning ml-1">
                                ({formatPrice(order.remainingAmount)} due)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            {timeline.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Session Timeline
                </h3>
                <div className="space-y-3">
                  {timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="font-medium">{event.event}</div>
                        <div className="text-sm text-content-secondary">{event.description}</div>
                        <div className="text-xs text-content-tertiary mt-1">
                          {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-default flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {session.status !== 'CLOSED' && (
            <Button
              variant="destructive"
              onClick={handleCloseSession}
              disabled={isClosing}
              className="flex items-center gap-2"
            >
              {isClosing ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Closing...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Close Session
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}