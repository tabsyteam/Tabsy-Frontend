'use client'

import { useState, useEffect } from 'react'
import { Button, Card, Badge } from '@tabsy/ui-components'
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  Banknote,
  RefreshCw,
  Eye,
  Send,
  XCircle,
  TrendingUp,
  Filter
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { useRestaurantWebSocket } from '@/hooks/useRestaurantWebSocket'
import { Payment, PaymentStatus, PaymentMethod } from '@tabsy/shared-types'
import { formatCurrency } from '@tabsy/shared-utils'
import { toast } from 'sonner'

interface SplitPaymentGroup {
  groupId: string
  orderId: string
  tableId?: string
  tableName?: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  completedParticipants: number
  totalParticipants: number
  isComplete: boolean
  createdAt: string
  splitType: 'EQUAL' | 'BY_ITEMS' | 'BY_PERCENTAGE' | 'BY_AMOUNT'
  participants: Array<{
    participantId: string
    participantName: string
    amount: number
    tipAmount?: number
    hasPaid: boolean
    paymentId?: string
    paymentMethod?: PaymentMethod
  }>
}

interface SplitPaymentMonitoringProps {
  restaurantId: string
}

// Utility function for formatting time
const formatTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function SplitPaymentMonitoring({ restaurantId }: SplitPaymentMonitoringProps) {
  const [splitPayments, setSplitPayments] = useState<SplitPaymentGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<SplitPaymentGroup | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partial' | 'complete'>('pending')
  const [refreshing, setRefreshing] = useState(false)

  const { isConnected, lastMessage } = useRestaurantWebSocket({
    restaurantId,
    onPaymentUpdate: (data) => {
      // Handle payment update events for split payments
      if (data?.type?.startsWith('payment:split_')) {
        // Trigger reload when split payment events occur
        loadSplitPayments()
      }
    }
  })

  // Load split payments
  const loadSplitPayments = async () => {
    try {
      setRefreshing(true)
      // This would need to be implemented in the API client
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        // splitPaymentsOnly: true, // This would need to be implemented in the API
      })

      if (response.success && response.data) {
        // Transform the data to match our interface
        // This is a simplified example - actual implementation would depend on backend structure
        const groupedPayments = groupBySplitPayment(response.data)
        setSplitPayments(groupedPayments)
      }
    } catch (error) {
      console.error('Failed to load split payments:', error)
      toast.error('Failed to load split payments')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Group payments by split payment group
  const groupBySplitPayment = (payments: Payment[]): SplitPaymentGroup[] => {
    // This is a mock implementation - actual grouping logic would depend on backend structure
    return []
  }

  // Handle WebSocket events
  useEffect(() => {
    if (lastMessage?.type.startsWith('payment:split_')) {
      loadSplitPayments()

      // Show real-time notifications
      switch (lastMessage.type) {
        case 'payment:split_progress':
          toast.info(`Split payment progress updated: ${lastMessage.data.progressPercentage}% complete`)
          break
        case 'payment:split_completed':
          toast.success('Split payment completed successfully!')
          break
        case 'payment:split_cancelled':
          toast.warning('Split payment was cancelled')
          break
      }
    }
  }, [lastMessage])

  // Initial load
  useEffect(() => {
    loadSplitPayments()
  }, [restaurantId, filterStatus])

  const getStatusBadge = (group: SplitPaymentGroup) => {
    if (group.isComplete) {
      return <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Complete
      </Badge>
    } else if (group.completedParticipants > 0) {
      return <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Partial ({group.completedParticipants}/{group.totalParticipants})
      </Badge>
    } else {
      return <Badge variant="default" className="flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Pending
      </Badge>
    }
  }

  const getProgressPercentage = (group: SplitPaymentGroup) => {
    return Math.round((group.paidAmount / group.totalAmount) * 100)
  }

  const handleConfirmCashPayment = async (groupId: string, participantId: string) => {
    try {
      const response = await tabsyClient.payment.updateSplitParticipant(groupId, participantId, {
        hasPaid: true
      })

      if (response.success) {
        toast.success('Cash payment confirmed')
        loadSplitPayments()
      } else {
        toast.error('Failed to confirm cash payment')
      }
    } catch (error) {
      toast.error('Failed to confirm cash payment')
    }
  }

  const handleSendReminder = async (groupId: string, participantId: string) => {
    try {
      const response = await tabsyClient.payment.sendSplitPaymentReminder(
        groupId,
        participantId,
        'Please complete your portion of the split payment'
      )

      if (response.success) {
        toast.success('Reminder sent successfully')
      } else {
        toast.error('Failed to send reminder')
      }
    } catch (error) {
      toast.error('Failed to send reminder')
    }
  }

  const handleCancelSplitPayment = async (groupId: string) => {
    try {
      const response = await tabsyClient.payment.cancelSplitPayment(groupId, 'Cancelled by restaurant staff')

      if (response.success) {
        toast.success('Split payment cancelled successfully')
        loadSplitPayments()
      } else {
        toast.error('Failed to cancel split payment')
      }
    } catch (error) {
      toast.error('Failed to cancel split payment')
    }
  }

  const filteredPayments = splitPayments.filter(group => {
    switch (filterStatus) {
      case 'pending':
        return !group.isComplete && group.completedParticipants === 0
      case 'partial':
        return !group.isComplete && group.completedParticipants > 0
      case 'complete':
        return group.isComplete
      default:
        return true
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading split payments...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Split Payment Monitoring</h2>
            <p className="text-content-secondary">Monitor and manage ongoing split payments</p>
          </div>
          {!isConnected && (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>
        <Button
          onClick={loadSplitPayments}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Active Split Payments</p>
              <p className="text-xl font-semibold">{splitPayments.filter(g => !g.isComplete).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Pending Participants</p>
              <p className="text-xl font-semibold">
                {splitPayments.reduce((sum, g) => sum + (g.totalParticipants - g.completedParticipants), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Pending Amount</p>
              <p className="text-xl font-semibold">
                {formatCurrency(splitPayments.reduce((sum, g) => sum + g.remainingAmount, 0))}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-content-secondary">Completion Rate</p>
              <p className="text-xl font-semibold">
                {splitPayments.length > 0
                  ? Math.round((splitPayments.filter(g => g.isComplete).length / splitPayments.length) * 100)
                  : 0
                }%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-content-secondary" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'partial', 'complete'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Split Payments List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-content-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Split Payments Found</h3>
            <p className="text-content-secondary">
              {filterStatus === 'all'
                ? "There are no active split payments at the moment."
                : `No ${filterStatus} split payments found.`
              }
            </p>
          </Card>
        ) : (
          filteredPayments.map((group) => (
            <Card key={group.groupId} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {group.tableName ? `Table ${group.tableName}` : 'Split Payment'}
                    </h3>
                    {getStatusBadge(group)}
                  </div>
                  <span className="text-sm text-content-secondary">
                    Created {formatTimeAgo(new Date(group.createdAt))}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGroup(selectedGroup?.groupId === group.groupId ? null : group)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {selectedGroup?.groupId === group.groupId ? 'Hide' : 'Details'}
                  </Button>

                  {!group.isComplete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelSplitPayment(group.groupId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Payment Progress</span>
                  <span className="font-medium">{getProgressPercentage(group)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(group)}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-content-secondary">Total Amount</p>
                  <p className="font-semibold">{formatCurrency(group.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-content-secondary">Paid Amount</p>
                  <p className="font-semibold text-green-600">{formatCurrency(group.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-content-secondary">Remaining</p>
                  <p className="font-semibold text-orange-600">{formatCurrency(group.remainingAmount)}</p>
                </div>
                <div>
                  <p className="text-content-secondary">Participants</p>
                  <p className="font-semibold">{group.completedParticipants}/{group.totalParticipants}</p>
                </div>
              </div>

              {/* Detailed Participant View */}
              {selectedGroup?.groupId === group.groupId && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-4">Participants</h4>
                  <div className="space-y-3">
                    {group.participants.map((participant) => (
                      <div
                        key={participant.participantId}
                        className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            participant.hasPaid ? 'bg-green-500' : 'bg-orange-500'
                          }`} />
                          <div>
                            <p className="font-medium">{participant.participantName}</p>
                            <p className="text-sm text-content-secondary">
                              {formatCurrency(participant.amount)}
                              {participant.tipAmount && ` + ${formatCurrency(participant.tipAmount)} tip`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {participant.hasPaid ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Paid
                              {participant.paymentMethod && (
                                <span className="ml-1">
                                  {participant.paymentMethod === 'CASH' ? (
                                    <Banknote className="w-3 h-3" />
                                  ) : (
                                    <CreditCard className="w-3 h-3" />
                                  )}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(group.groupId, participant.participantId)}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Remind
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleConfirmCashPayment(group.groupId, participant.participantId)}
                              >
                                <Banknote className="w-3 h-3 mr-1" />
                                Confirm Cash
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}