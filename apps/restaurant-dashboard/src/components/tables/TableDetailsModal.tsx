'use client'

import { useState, useEffect } from 'react'
import { Button, Badge } from '@tabsy/ui-components'
import {
  X,
  Edit,
  QrCode,
  Users,
  Clock,
  MapPin,
  DollarSign,
  Calendar,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Circle,
  Square,
  RectangleHorizontal,
  RefreshCw,
  Hash,
  FileText,
  History
} from 'lucide-react'
import { Table, TableStatus, TableShape } from '@tabsy/shared-types'
import { tabsyClient } from '@tabsy/api-client'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { SessionDetailsModal } from './SessionDetailsModal'
import { createTableHooks } from '@tabsy/react-query-hooks'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface TableDetailsModalProps {
  table: Table
  restaurantId: string
  onClose: () => void
  onEdit: (table: Table) => void
  onQRCode: (table: Table) => void
  onUpdate: () => void
}

export function TableDetailsModal({
  table: initialTable,
  restaurantId,
  onClose,
  onEdit,
  onQRCode,
  onUpdate
}: TableDetailsModalProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const queryClient = useQueryClient()
  const tableHooks = createTableHooks(useQuery)

  // Fetch fresh table data to ensure UI stays updated
  const {
    data: tableResponse,
    isLoading: tableLoading,
    refetch: refetchTable,
  } = tableHooks.useTable(restaurantId, initialTable.id)

  // Use fresh data if available, otherwise fall back to initial table
  const table = tableResponse?.data || initialTable

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string; status: TableStatus }) => {
      return await tabsyClient.table.updateStatus(data.restaurantId, data.tableId, data.status)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] })
      refetchTable()
      onUpdate()
    }
  })

  const resetTableMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string }) => {
      return await tabsyClient.table.reset(data.restaurantId, data.tableId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] })
      refetchTable()
      onUpdate()
    }
  })

  // Get table sessions using restaurant API
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  useEffect(() => {
    loadRecentSessions()
  }, [table.id])

  const loadRecentSessions = async () => {
    try {
      setSessionsLoading(true)

      // Get recent sessions for this table
      const response = await tabsyClient.restaurantTableSession.getAllSessions(
        { tableId: table.id },
        1,
        10 // Get last 10 sessions
      )

      if (response.success && response.data?.sessions) {
        setRecentSessions(response.data.sessions)
      }
    } catch (error) {
      console.error('Error loading recent sessions:', error)
      toast.error('Failed to load recent sessions')
    } finally {
      setSessionsLoading(false)
    }
  }

  const refetchSessions = () => {
    loadRecentSessions()
  }

  const getSessionStatusColor = (status: string) => {
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

  const getSessionStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />
      case 'ORDERING_LOCKED':
        return <Clock className="w-4 h-4" />
      case 'PAYMENT_PENDING':
        return <DollarSign className="w-4 h-4" />
      case 'CLOSED':
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
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

  const getShapeIcon = (shape: TableShape) => {
    switch (shape) {
      case TableShape.ROUND:
        return <Circle className="w-4 h-4" />
      case TableShape.SQUARE:
        return <Square className="w-4 h-4" />
      case TableShape.RECTANGULAR:
        return <RectangleHorizontal className="w-4 h-4" />
      default:
        return <Circle className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return <CheckCircle className="w-5 h-5" style={{ color: 'rgb(var(--status-success))' }} />
      case TableStatus.OCCUPIED:
        return <Users className="w-5 h-5" style={{ color: 'rgb(var(--primary))' }} />
      case TableStatus.RESERVED:
        return <Clock className="w-5 h-5" style={{ color: 'rgb(var(--status-info))' }} />
      case TableStatus.MAINTENANCE:
        return <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--status-warning))' }} />
      default:
        return <AlertTriangle className="w-5 h-5 text-content-secondary" />
    }
  }

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'status-success'
      case TableStatus.OCCUPIED:
        return 'bg-primary-light text-primary border-primary'
      case TableStatus.RESERVED:
        return 'status-info'
      case TableStatus.MAINTENANCE:
        return 'status-warning'
      default:
        return 'bg-surface-secondary text-content-secondary border-default'
    }
  }

  const getStatusDisplayName = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'Available'
      case TableStatus.OCCUPIED:
        return 'Occupied'
      case TableStatus.RESERVED:
        return 'Reserved'
      case TableStatus.MAINTENANCE:
        return 'Maintenance'
      default:
        return status
    }
  }

  const handleStatusChange = async (newStatus: TableStatus) => {
    if (newStatus === table.status) return

    setIsUpdatingStatus(true)
    try {
      await updateStatusMutation.mutateAsync({
        restaurantId: table.restaurantId,
        tableId: table.id,
        status: newStatus,
      } as any)
      toast.success(`Table ${table.tableNumber} status updated to ${getStatusDisplayName(newStatus)}`)
    } catch (error) {
      toast.error('Failed to update table status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleReset = async () => {
    try {
      await resetTableMutation.mutateAsync({
        restaurantId: table.restaurantId,
        tableId: table.id,
      } as any)
      toast.success(`Table ${table.tableNumber} has been reset`)
      refetchSessions()
    } catch (error) {
      toast.error('Failed to reset table')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusActions = () => {
    const actions = []

    switch (table.status) {
      case TableStatus.AVAILABLE:
        actions.push(
          <Button
            key="occupy"
            onClick={() => handleStatusChange(TableStatus.OCCUPIED)}
            disabled={isUpdatingStatus}
            size="default"
            className="flex-1"
          >
            Mark as Occupied
          </Button>
        )
        actions.push(
          <Button
            key="reserve"
            onClick={() => handleStatusChange(TableStatus.RESERVED)}
            disabled={isUpdatingStatus}
            variant="outline"
            size="default"
            className="flex-1"
          >
            Mark as Reserved
          </Button>
        )
        break

      case TableStatus.OCCUPIED:
        actions.push(
          <Button
            key="available"
            onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
            disabled={isUpdatingStatus}
            size="default"
            className="flex-1"
          >
            Mark as Available
          </Button>
        )
        actions.push(
          <Button
            key="maintenance"
            onClick={() => handleStatusChange(TableStatus.MAINTENANCE)}
            disabled={isUpdatingStatus}
            variant="outline"
            size="default"
            className="flex-1"
          >
            Mark for Maintenance
          </Button>
        )
        break

      case TableStatus.RESERVED:
        actions.push(
          <Button
            key="occupy"
            onClick={() => handleStatusChange(TableStatus.OCCUPIED)}
            disabled={isUpdatingStatus}
            size="default"
            className="flex-1"
          >
            Mark as Occupied
          </Button>
        )
        actions.push(
          <Button
            key="available"
            onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
            disabled={isUpdatingStatus}
            variant="outline"
            size="default"
            className="flex-1"
          >
            Cancel Reservation
          </Button>
        )
        break

      case TableStatus.MAINTENANCE:
        actions.push(
          <Button
            key="available"
            onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
            disabled={isUpdatingStatus}
            size="default"
            className="flex-1"
          >
            Mark as Available
          </Button>
        )
        break
    }

    return actions
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-background rounded-lg border border-default shadow-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-default flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg border ${getStatusColor(table.status)} ${isUpdatingStatus ? 'opacity-50' : ''}`}>
                {isUpdatingStatus ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-content-secondary" />
                ) : (
                  getStatusIcon(table.status)
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-content-primary">
                  Table {table.tableNumber}
                </h2>
                <p className="text-sm text-content-secondary">
                  {isUpdatingStatus ? 'Updating...' : getStatusDisplayName(table.status)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
            {/* Table Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-content-primary">Table Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg border border-default">
                  <div className="flex items-center space-x-2 mb-2">
                    <Hash className="w-4 h-4 text-content-secondary" />
                    <span className="text-sm text-content-secondary">Table Number</span>
                  </div>
                  <p className="text-lg font-medium text-content-primary">{table.tableNumber}</p>
                </div>

                <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg border border-default">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-content-secondary" />
                    <span className="text-sm text-content-secondary">Capacity</span>
                  </div>
                  <p className="text-lg font-medium text-content-primary">{table.capacity} seats</p>
                </div>

                <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg border border-default">
                  <div className="flex items-center space-x-2 mb-2">
                    {getShapeIcon(table.shape)}
                    <span className="text-sm text-content-secondary">Shape</span>
                  </div>
                  <p className="text-lg font-medium text-content-primary">
                    {table.shape.charAt(0) + table.shape.slice(1).toLowerCase()}
                  </p>
                </div>

                <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg border border-default">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-content-secondary" />
                    <span className="text-sm text-content-secondary">Created</span>
                  </div>
                  <p className="text-sm font-medium text-content-primary">
                    {formatDate(table.createdAt)}
                  </p>
                </div>
              </div>

              {table.notes && (
                <div className="bg-surface-secondary p-3 sm:p-4 rounded-lg border border-default">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-4 h-4 text-content-secondary" />
                    <span className="text-sm text-content-secondary">Notes</span>
                  </div>
                  <p className="text-sm text-content-primary">{table.notes}</p>
                </div>
              )}
            </div>

            {/* Status Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-content-primary">Status Actions</h3>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {getStatusActions()}
              </div>

              {table.status === TableStatus.OCCUPIED && (
                <Button
                  onClick={handleReset}
                  disabled={resetTableMutation.isPending}
                  variant="outline"
                  className="w-full border-status-error text-status-error hover:bg-status-error-light"
                >
                  {resetTableMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset Table
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* QR Code Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-content-primary">Quick Actions</h3>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  onClick={() => onQRCode(table)}
                  className="flex-1"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  View QR Code
                </Button>
                <Button
                  onClick={() => onEdit(table)}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Table
                </Button>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-content-primary">Recent Sessions</h3>
                <Button
                  onClick={refetchSessions}
                  disabled={sessionsLoading}
                  variant="outline"
                  size="default"
                >
                  <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {sessionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface-secondary p-4 rounded-lg animate-pulse">
                      <div className="h-4 bg-content-secondary/20 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-content-secondary/20 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentSessions.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentSessions.map(session => (
                    <div
                      key={session.id}
                      className="bg-surface-secondary p-4 rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer border border-default"
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSessionStatusColor(session.status) as any}>
                              {getSessionStatusIcon(session.status)}
                              {session.status.replace('_', ' ')}
                            </Badge>
                            {session.needsAttention && (
                              <Badge variant="destructive">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Attention
                              </Badge>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">Session {session.sessionCode}</div>
                            <div className="text-xs text-content-secondary flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(session.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                1 user{/* Could be enhanced with actual user count */}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">${session.totalAmount.toFixed(2)}</div>
                            <div className="text-xs text-content-secondary">
                              Paid: ${Number(session.paidAmount || 0).toFixed(2)}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-content-secondary" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-surface-secondary rounded-lg">
                  <Calendar className="w-12 h-12 text-content-secondary mx-auto mb-3" />
                  <h4 className="font-medium text-content-primary mb-1">No Recent Sessions</h4>
                  <p className="text-sm text-content-secondary">
                    This table hasn't had any sessions yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSessionId && (
        <SessionDetailsModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
          onSessionClosed={() => {
            setSelectedSessionId(null)
            loadRecentSessions() // Refresh sessions when one is closed
            refetchTable() // Also refresh table data
          }}
        />
      )}
    </>
  )
}