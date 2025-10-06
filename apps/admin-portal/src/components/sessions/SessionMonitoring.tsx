'use client'

import { useState, useEffect } from 'react'
import { tabsyClient } from '@tabsy/api-client'
import type {
  RestaurantTableSessionOverview,
  RestaurantSessionMetrics,
  RestaurantSessionFilters
} from '@tabsy/api-client'

// Type aliases for backward compatibility
type AdminTableSessionOverview = RestaurantTableSessionOverview
type SessionMetrics = RestaurantSessionMetrics
type SessionFilters = RestaurantSessionFilters
import {
  Users,
  Clock,
  Banknote,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  XCircle,
  CheckCircle,
  TrendingUp,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@tabsy/ui-components'
import { formatPrice, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

export function SessionMonitoring() {
  const api = tabsyClient
  const [sessions, setSessions] = useState<AdminTableSessionOverview[]>([])
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<SessionFilters>({})
  const [selectedSession, setSelectedSession] = useState<AdminTableSessionOverview | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])

  // Load session data
  const loadSessions = async (page = 1) => {
    try {
      setIsLoading(true)
      const response = await api.restaurantTableSession.getAllSessions(filters, page, 20)

      if (response.success) {
        setSessions(response.data.sessions)
        setTotalPages(response.data.pagination.totalPages)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('[SessionMonitoring] Error loading sessions:', error)
      toast.error('Failed to load sessions')
    } finally {
      setIsLoading(false)
    }
  }

  // Load metrics
  const loadMetrics = async () => {
    try {
      const response = await api.restaurantTableSession.getSessionMetrics()
      if (response.success) {
        setMetrics(response.data)
      }
    } catch (error) {
      console.error('[SessionMonitoring] Error loading metrics:', error)
    }
  }

  // Load alerts
  const loadAlerts = async () => {
    try {
      const response = await api.restaurantTableSession.getSessionAlerts()
      if (response.success) {
        setAlerts(response.data.alerts)
      }
    } catch (error) {
      console.error('[SessionMonitoring] Error loading alerts:', error)
    }
  }

  // Initial load
  useEffect(() => {
    loadSessions()
    loadMetrics()
    loadAlerts()
  }, [filters])

  // Handle session close
  const handleCloseSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to force close this session?')) return

    try {
      await api.restaurantTableSession.forceCloseSession(sessionId, 'Manually closed by admin')
      toast.success('Session closed successfully')
      loadSessions(currentPage)
      loadMetrics()
    } catch (error) {
      console.error('[SessionMonitoring] Error closing session:', error)
      toast.error('Failed to close session')
    }
  }

  // Handle export
  const handleExport = async () => {
    try {
      // Note: Export functionality would be handled through restaurant endpoints or separate admin endpoints
      console.log('Export not implemented with current architecture')
      toast.info('Export functionality needs to be reimplemented')
    } catch (error) {
      console.error('[SessionMonitoring] Error exporting data:', error)
      toast.error('Failed to export data')
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-status-success-light text-status-success-dark'
      case 'ORDERING_LOCKED':
        return 'bg-status-warning-light text-status-warning-dark'
      case 'PAYMENT_PENDING':
        return 'bg-status-info-light text-status-info-dark'
      case 'CLOSED':
        return 'bg-surface-secondary text-content-secondary'
      default:
        return 'bg-surface-secondary text-content-secondary'
    }
  }

  // Get alert severity color
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-status-error-light text-status-error-dark'
      case 'MEDIUM':
        return 'bg-status-warning-light text-status-warning-dark'
      case 'LOW':
        return 'bg-status-info-light text-status-info-dark'
      default:
        return 'bg-surface-secondary text-content-secondary'
    }
  }

  if (isLoading && !sessions.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading session data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Table Session Monitoring</h1>
          <p className="text-content-secondary">Monitor and manage all active table sessions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {
              loadSessions(currentPage)
              loadMetrics()
              loadAlerts()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-default rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-surface rounded-lg border border-default p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-content-secondary">Active Sessions</p>
                <p className="text-2xl font-bold">{metrics.activeSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-default p-6">
            <div className="flex items-center">
              <div className="p-2 bg-success/10 rounded-lg">
                <Banknote className="w-6 h-6 text-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-content-secondary">Total Revenue</p>
                <p className="text-2xl font-bold">{formatPrice(metrics.totalRevenue, 'USD')}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-default p-6">
            <div className="flex items-center">
              <div className="p-2 bg-info/10 rounded-lg">
                <Users className="w-6 h-6 text-info" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-content-secondary">Avg Party Size</p>
                <p className="text-2xl font-bold">{metrics.averagePartySize.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-default p-6">
            <div className="flex items-center">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-content-secondary">Avg Duration</p>
                <p className="text-2xl font-bold">{metrics.averageSessionDuration}m</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold">Active Alerts ({alerts.length})</h3>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.sessionId} className="flex justify-between items-center">
                <span className="text-sm">{alert.message}</span>
                <Badge className={getAlertColor(alert.severity)}>
                  {alert.severity}
                </Badge>
              </div>
            ))}
            {alerts.length > 3 && (
              <p className="text-xs text-content-secondary">
                +{alerts.length - 3} more alerts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-surface rounded-lg border border-default p-4">
          <h3 className="font-semibold mb-4">Filter Sessions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status?.[0] || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  status: e.target.value ? [e.target.value] : undefined
                }))}
                className="w-full p-2 border border-default rounded"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ORDERING_LOCKED">Ordering Locked</option>
                <option value="PAYMENT_PENDING">Payment Pending</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateFrom: e.target.value || undefined
                }))}
                className="w-full p-2 border border-default rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateTo: e.target.value || undefined
                }))}
                className="w-full p-2 border border-default rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Needs Attention</label>
              <select
                value={filters.needsAttention === true ? 'true' : filters.needsAttention === false ? 'false' : ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  needsAttention: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined
                }))}
                className="w-full p-2 border border-default rounded"
              >
                <option value="">All Sessions</option>
                <option value="true">Needs Attention</option>
                <option value="false">No Issues</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => setFilters({})}
              className="px-4 py-2 text-content-secondary hover:bg-surface-secondary rounded"
            >
              Clear Filters
            </button>
            <button
              onClick={() => loadSessions(1)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-surface rounded-lg border border-default">
        <div className="p-4 border-b border-default">
          <h3 className="font-semibold">Active Sessions</h3>
          <div className="mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-content-secondary w-4 h-4" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-default rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-default">
                <th className="text-left p-4 font-medium">Session</th>
                <th className="text-left p-4 font-medium">Restaurant/Table</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Users</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Duration</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions
                .filter(session =>
                  searchTerm === '' ||
                  session.sessionCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  session.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  session.tableName.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(session => (
                  <tr key={session.id} className="border-b border-default hover:bg-surface-secondary">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{session.sessionCode}</div>
                        <div className="text-sm text-content-secondary">
                          {session.orderCount} orders
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{session.restaurantName}</div>
                        <div className="text-sm text-content-secondary">{session.tableName}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.replace('_', ' ')}
                      </Badge>
                      {session.needsAttention && (
                        <Badge className="ml-2 bg-status-error-light text-status-error-dark">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Attention
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {session.userCount}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{formatPrice(session.totalAmount, 'USD')}</div>
                        <div className="text-sm text-content-secondary">
                          Paid: {formatPrice(session.paidAmount, 'USD')}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {session.sessionDuration}m
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="p-1 hover:bg-surface-secondary rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {session.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleCloseSession(session.id)}
                            className="p-1 hover:bg-surface-secondary rounded text-destructive"
                            title="Force Close"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-default">
            <div className="text-sm text-content-secondary">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadSessions(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => loadSessions(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {sessions.length === 0 && (
        <div className="bg-surface rounded-lg border border-default p-8 text-center">
          <Activity className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">No Sessions Found</h3>
          <p className="text-content-secondary">
            {Object.keys(filters).length > 0
              ? 'No sessions match your current filters'
              : 'No active table sessions at the moment'
            }
          </p>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg border border-default max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center p-6 border-b border-default">
              <h3 className="font-semibold text-lg">Session Details</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 hover:bg-surface-secondary rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Session Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Code:</strong> {selectedSession.sessionCode}</div>
                    <div><strong>Status:</strong> {selectedSession.status}</div>
                    <div><strong>Duration:</strong> {selectedSession.sessionDuration} minutes</div>
                    <div><strong>Created:</strong> {new Date(selectedSession.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Location</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Restaurant:</strong> {selectedSession.restaurantName}</div>
                    <div><strong>Table:</strong> {selectedSession.tableName}</div>
                    <div><strong>Users:</strong> {selectedSession.userCount}</div>
                    <div><strong>Orders:</strong> {selectedSession.orderCount}</div>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h4 className="font-medium mb-2">Financial Information</h4>
                <div className="bg-surface-secondary rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Total Amount:</strong> {formatPrice(selectedSession.totalAmount, 'USD')}</div>
                    <div><strong>Paid Amount:</strong> {formatPrice(selectedSession.paidAmount, 'USD')}</div>
                    <div><strong>Remaining:</strong> {formatPrice(selectedSession.totalAmount - selectedSession.paidAmount, 'USD')}</div>
                    <div><strong>Payment Status:</strong> {selectedSession.paidAmount >= selectedSession.totalAmount ? 'Fully Paid' : 'Pending'}</div>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {selectedSession.needsAttention && (
                <div>
                  <h4 className="font-medium mb-2">Alerts</h4>
                  <div className="space-y-2">
                    {selectedSession.alertReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-warning">
                        <AlertTriangle className="w-4 h-4" />
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}