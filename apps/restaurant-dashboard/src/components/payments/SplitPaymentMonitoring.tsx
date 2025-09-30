'use client'

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  Filter,
  Lock,
  Unlock,
  Shield,
  Zap
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import {
  Payment,
  PaymentStatus,
  PaymentMethod
} from '@tabsy/shared-types'
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
  // New split calculation locking fields
  isLocked?: boolean
  lockedAt?: string
  lockedBy?: string
  lockReason?: string
  paymentIntentIds?: string[]
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
  isVisible?: boolean
}

export interface SplitPaymentMonitoringRef {
  refetch: () => void
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

export const SplitPaymentMonitoring = forwardRef<SplitPaymentMonitoringRef, SplitPaymentMonitoringProps>(
  ({ restaurantId, isVisible = true }, ref) => {
  const [selectedGroup, setSelectedGroup] = useState<SplitPaymentGroup | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partial' | 'complete'>('pending')
  const queryClient = useQueryClient()

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket()

  // Use React Query for data fetching - prevents duplicate API calls
  const { data: splitPayments = [], isLoading, refetch } = useQuery({
    queryKey: ['restaurant', 'split-payments', restaurantId],
    queryFn: async () => {
      console.log('[SplitPaymentMonitoring] Loading split payments for restaurant:', restaurantId)
      // This would need to be implemented in the API client
      const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
        // splitPaymentsOnly: true, // This would need to be implemented in the API
      })

      if (response.success && response.data) {
        // Transform the data to match our interface
        // This is a simplified example - actual implementation would depend on backend structure
        const groupedPayments = groupBySplitPayment(response.data)
        return groupedPayments
      }
      throw new Error('Failed to load split payments')
    },
    enabled: !!restaurantId,
  })

  // Expose refetch method to parent
  useImperativeHandle(ref, () => ({
    refetch
  }), [refetch])

  // Group payments by split payment group
  const groupBySplitPayment = (payments: Payment[]): SplitPaymentGroup[] => {
    // This is a mock implementation - actual grouping logic would depend on backend structure
    return []
  }

  // Split payment event handlers using correct frontend WebSocket event types
  const handleSplitPaymentCreated = useCallback((data: any) => {
    console.log('Split payment created:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.info(`New split payment created with ${data.totalParticipants} participants`)
  }, [queryClient, restaurantId])

  const handleSplitPaymentParticipantUpdated = useCallback((data: any) => {
    console.log('Split payment participant updated:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })

    if (data.hasPaid) {
      toast.success(`${data.participantName} completed their payment of ${formatCurrency(data.amount)}`)
    } else {
      toast.info(`${data.participantName} updated their payment details`)
    }
  }, [queryClient, restaurantId])

  const handleSplitPaymentProgress = useCallback((data: any) => {
    console.log('Split payment progress updated:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })

    const progressMessage = `Split payment ${data.progressPercentage}% complete (${data.completedParticipants}/${data.totalParticipants} paid)`
    toast.info(progressMessage)
  }, [queryClient, restaurantId])

  const handleSplitPaymentCompleted = useCallback((data: any) => {
    console.log('Split payment completed:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.success(`Split payment completed! ${data.participants.length} participants paid ${formatCurrency(data.totalAmount)}`)
  }, [queryClient, restaurantId])

  const handleSplitPaymentCancelled = useCallback((data: any) => {
    console.log('Split payment cancelled:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.warning(`Split payment cancelled by ${data.cancelledBy?.participantName || 'system'} - ${data.refundsProcessed} refunds processed`)
  }, [queryClient, restaurantId])

  // Register WebSocket event listeners with proper dependencies
  // New split calculation synchronization event handlers
  const handleSplitCalculationUpdated = useCallback((data: any) => {
    console.log('Split calculation updated:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.info(`Split calculation updated on ${data.tableName || 'table'} - ${data.splitType} split`)
  }, [queryClient, restaurantId])

  const handleSplitCalculationLocked = useCallback((data: any) => {
    console.log('Split calculation locked:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.warning(`🔒 Split payment locked on ${data.tableName || 'table'} - ${data.lockReason || 'Payment being processed'}`)
  }, [queryClient, restaurantId])

  const handleSplitCalculationUnlocked = useCallback((data: any) => {
    console.log('Split calculation unlocked:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.success(`🔓 Split payment unlocked on ${data.tableName || 'table'} - Customers can modify split again`)
  }, [queryClient, restaurantId])

  const handleSplitUserJoined = useCallback((data: any) => {
    console.log('Split user joined:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.info(`👥 ${data.userName} joined split payment on ${data.tableName || 'table'}`)
  }, [queryClient, restaurantId])

  const handleSplitUserLeft = useCallback((data: any) => {
    console.log('Split user left:', data)
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
    toast.info(`👋 ${data.userName} left split payment on ${data.tableName || 'table'}`)
  }, [queryClient, restaurantId])

  // Register WebSocket event listeners for split payment events
  // These events are defined in the frontend WebSocketEventMap
  useWebSocketEvent('payment:split_created', handleSplitPaymentCreated, [handleSplitPaymentCreated])
  useWebSocketEvent('payment:split_participant_updated', handleSplitPaymentParticipantUpdated, [handleSplitPaymentParticipantUpdated])
  useWebSocketEvent('payment:split_progress', handleSplitPaymentProgress, [handleSplitPaymentProgress])
  useWebSocketEvent('payment:split_completed', handleSplitPaymentCompleted, [handleSplitPaymentCompleted])
  useWebSocketEvent('payment:split_cancelled', handleSplitPaymentCancelled, [handleSplitPaymentCancelled])

  // New split calculation synchronization events
  useWebSocketEvent('split:calculation_updated', handleSplitCalculationUpdated, [handleSplitCalculationUpdated])
  useWebSocketEvent('split:conflict_detected', handleSplitCalculationLocked, [handleSplitCalculationLocked])



  const getStatusBadge = (group: SplitPaymentGroup) => {
    // Priority: Lock status takes precedence, then completion status
    if (group.isLocked) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Locked - {group.lockReason || 'Payment Processing'}
          </Badge>
          {group.paymentIntentIds && group.paymentIntentIds.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {group.paymentIntentIds.length} Payment{group.paymentIntentIds.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )
    }

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
        queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
      } else {
        toast.error('Failed to confirm cash payment')
      }
    } catch (error) {
      console.error('Failed to confirm cash payment for participant:', groupId, participantId)
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
      console.error('Failed to send payment reminder to participant:', groupId, participantId)
      toast.error('Failed to send reminder')
    }
  }

  const handleCancelSplitPayment = async (groupId: string) => {
    try {
      const response = await tabsyClient.payment.cancelSplitPayment(groupId, 'Cancelled by restaurant staff')

      if (response.success) {
        toast.success('Split payment cancelled successfully')
        queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
      } else {
        toast.error('Failed to cancel split payment')
      }
    } catch (error) {
      console.error('Failed to cancel split payment group:', groupId)
      toast.error('Failed to cancel split payment')
    }
  }

  // New lock management handlers for staff
  const handleForceUnlockSplit = async (tableSessionId: string, tableName?: string) => {
    try {
      const response = await tabsyClient.tableSession.forceUnlockSplitCalculation(tableSessionId)

      if (response.success) {
        toast.success(`🔓 Force unlocked split payment on ${tableName || 'table'}`)
        queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
      } else {
        toast.error('Failed to force unlock split payment')
      }
    } catch (error) {
      console.error('Failed to force unlock split calculation:', tableSessionId)
      toast.error('Failed to force unlock split payment')
    }
  }

  const handleCleanupStaleLocks = async () => {
    try {
      const response = await tabsyClient.tableSession.cleanupStaleSplitLocks()

      if (response.success && response.data) {
        const { cleanedCount, affectedTableSessions } = response.data
        toast.success(`🧹 Cleaned up ${cleanedCount} stale locks across ${affectedTableSessions.length} table sessions`)
        queryClient.invalidateQueries({ queryKey: ['restaurant', 'split-payments', restaurantId] })
      } else {
        toast.info('No stale locks found to cleanup')
      }
    } catch (error) {
      console.error('Failed to cleanup stale split locks')
      toast.error('Failed to cleanup stale locks')
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

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-card rounded-lg border p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Split Payment Monitoring</h2>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-content-secondary">Loading split payments...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-card rounded-lg border p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Split Payment Monitoring</h2>
            {!isConnected && (
              <Badge variant="destructive" className="ml-2">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>

          {/* Administrative Tools */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupStaleLocks}
              className="flex items-center gap-1"
            >
              <Zap className="w-4 h-4" />
              Cleanup Stale Locks
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-interactive-hover rounded">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-content-secondary">Active</p>
                <p className="text-lg font-semibold">{splitPayments.filter(g => !g.isComplete).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-status-warning-light rounded">
                <Clock className="w-4 h-4 text-status-warning" />
              </div>
              <div>
                <p className="text-xs text-content-secondary">Pending</p>
                <p className="text-lg font-semibold">
                  {splitPayments.reduce((sum, g) => sum + (g.totalParticipants - g.completedParticipants), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-status-success-light rounded">
                <DollarSign className="w-4 h-4 text-status-success" />
              </div>
              <div>
                <p className="text-xs text-content-secondary">Amount</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(splitPayments.reduce((sum, g) => sum + g.remainingAmount, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-secondary/10 rounded">
                <TrendingUp className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-content-secondary">Rate</p>
                <p className="text-lg font-semibold">
                  {splitPayments.length > 0
                    ? Math.round((splitPayments.filter(g => g.isComplete).length / splitPayments.length) * 100)
                    : 0
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-4 mb-6">
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
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <Users className="w-12 h-12 text-content-secondary/50" />
              <h3 className="text-lg font-medium text-content-primary">
                {filterStatus === 'all' ? 'No Split Payments' : `No ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Split Payments`}
              </h3>
              <p className="text-sm text-content-secondary">
                {filterStatus === 'all'
                  ? "There are no active split payments at the moment"
                  : `No ${filterStatus} split payments found`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((group) => (
              <div key={group.groupId} className="border rounded-lg p-4 bg-surface-secondary/30 hover:bg-surface-secondary/50 transition-colors">
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

                  {/* Force unlock button for locked splits */}
                  {group.isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleForceUnlockSplit(group.groupId, group.tableName)}
                      className="text-accent hover:text-accent-hover"
                    >
                      <Unlock className="w-4 h-4 mr-1" />
                      Force Unlock
                    </Button>
                  )}

                  {!group.isComplete && !group.isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelSplitPayment(group.groupId)}
                      className="text-status-error hover:text-status-error-dark"
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
                <div className="w-full bg-background-tertiary rounded-full h-2">
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
                  <p className="font-semibold text-status-success">{formatCurrency(group.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-content-secondary">Remaining</p>
                  <p className="font-semibold text-accent">{formatCurrency(group.remainingAmount)}</p>
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
                            participant.hasPaid ? 'bg-status-success' : 'bg-accent'
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

SplitPaymentMonitoring.displayName = 'SplitPaymentMonitoring'