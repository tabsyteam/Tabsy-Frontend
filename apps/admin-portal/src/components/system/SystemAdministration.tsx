'use client'

import { useState, useEffect } from 'react'
import { 
  Server, Database, AlertTriangle, 
  Cpu,
  RefreshCw, Download,
  CheckCircle,
  XCircle, AlertCircle, Info
} from 'lucide-react'
import { format } from 'date-fns'

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical'
  services: Array<{
    name: string
    status: 'running' | 'stopped' | 'error'
    uptime: string
    lastCheck: string
  }>
  performance: {
    cpu: number
    memory: number
    disk: number
    network: number
  }
  database: {
    status: 'connected' | 'disconnected' | 'slow'
    connections: number
    maxConnections: number
    queryTime: number
  }
  logs: Array<{
    id: string
    level: 'info' | 'warning' | 'error' | 'critical'
    message: string
    timestamp: string
    source: string
  }>
}

interface SystemSettings {
  maintenance: {
    enabled: boolean
    message: string
    scheduledAt?: string
  }
  backups: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    retention: number
    lastBackup: string
  }
  notifications: {
    emailAlerts: boolean
    smsAlerts: boolean
    webhookUrl?: string
  }
  security: {
    passwordPolicy: {
      minLength: number
      requireSpecialChars: boolean
      requireNumbers: boolean
      expiryDays: number
    }
    sessionTimeout: number
    maxFailedAttempts: number
  }
}

interface SystemAdministrationProps {
  onRestart?: (service: string) => void
  onBackup?: () => void
  onUpdateSettings?: (settings: Partial<SystemSettings>) => void
}

export function SystemAdministration({ 
  onRestart, 
  onBackup, 
  onUpdateSettings 
}: SystemAdministrationProps) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'logs'>('status')
  const [loading, setLoading] = useState(true)

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchSystemData = async () => {
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockStatus: SystemStatus = {
        overall: 'healthy',
        services: [
          { name: 'API Server', status: 'running', uptime: '15d 3h 42m', lastCheck: new Date().toISOString() },
          { name: 'WebSocket Server', status: 'running', uptime: '15d 3h 42m', lastCheck: new Date().toISOString() },
          { name: 'Database', status: 'running', uptime: '30d 12h 15m', lastCheck: new Date().toISOString() },
          { name: 'Redis Cache', status: 'running', uptime: '7d 8h 30m', lastCheck: new Date().toISOString() },
          { name: 'Payment Service', status: 'error', uptime: '0m', lastCheck: new Date().toISOString() }
        ],
        performance: {
          cpu: 45,
          memory: 68,
          disk: 32,
          network: 15
        },
        database: {
          status: 'connected',
          connections: 25,
          maxConnections: 100,
          queryTime: 1.2
        },
        logs: [
          { 
            id: '1', 
            level: 'error', 
            message: 'Payment service connection timeout', 
            timestamp: new Date().toISOString(), 
            source: 'payment-service' 
          },
          { 
            id: '2', 
            level: 'warning', 
            message: 'High memory usage detected on API server', 
            timestamp: new Date(Date.now() - 300000).toISOString(), 
            source: 'api-server' 
          },
          { 
            id: '3', 
            level: 'info', 
            message: 'Database backup completed successfully', 
            timestamp: new Date(Date.now() - 600000).toISOString(), 
            source: 'backup-service' 
          },
          { 
            id: '4', 
            level: 'info', 
            message: 'New restaurant registered: Bella Italia', 
            timestamp: new Date(Date.now() - 900000).toISOString(), 
            source: 'api-server' 
          }
        ]
      }

      const mockSettings: SystemSettings = {
        maintenance: {
          enabled: false,
          message: 'System maintenance in progress. We\'ll be back shortly.',
          scheduledAt: undefined
        },
        backups: {
          enabled: true,
          frequency: 'daily',
          retention: 30,
          lastBackup: new Date(Date.now() - 86400000).toISOString()
        },
        notifications: {
          emailAlerts: true,
          smsAlerts: false,
          webhookUrl: 'https://api.slack.com/incoming/webhooks/...'
        },
        security: {
          passwordPolicy: {
            minLength: 8,
            requireSpecialChars: true,
            requireNumbers: true,
            expiryDays: 90
          },
          sessionTimeout: 3600,
          maxFailedAttempts: 5
        }
      }
      
      setSystemStatus(mockStatus)
      setSystemSettings(mockSettings)
      setLoading(false)
    }

    fetchSystemData()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning':
      case 'slow':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'error':
      case 'stopped':
      case 'disconnected':
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'healthy':
        return 'text-green-600'
      case 'warning':
      case 'slow':
        return 'text-yellow-600'
      case 'error':
      case 'stopped':
      case 'disconnected':
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />
      default:
        return <Info className="w-4 h-4 text-gray-600" />
    }
  }

  const getPerformanceColor = (value: number) => {
    if (value < 50) return 'bg-green-500'
    if (value < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!systemStatus || !systemSettings) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
          <p className="text-gray-600">Monitor and manage system health and configuration</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={onBackup}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            <Download className="w-4 h-4" />
            Backup Now
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className={`text-lg font-semibold capitalize ${getStatusColor(systemStatus.overall)}`}>
                {systemStatus.overall}
              </p>
            </div>
            {getStatusIcon(systemStatus.overall)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Services</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemStatus.services.filter(s => s.status === 'running').length}/{systemStatus.services.length}
              </p>
            </div>
            <Server className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Database</p>
              <p className={`text-lg font-semibold capitalize ${getStatusColor(systemStatus.database.status)}`}>
                {systemStatus.database.status}
              </p>
            </div>
            <Database className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CPU Usage</p>
              <p className="text-lg font-semibold text-gray-900">{systemStatus.performance.cpu}%</p>
            </div>
            <Cpu className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(systemStatus.performance).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 capitalize">{key}</span>
                <span className="text-sm font-medium text-gray-900">{value}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getPerformanceColor(value)}`}
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['status', 'settings', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'status' | 'settings' | 'logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Services Status */}
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Services Status</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {systemStatus.services.map((service) => (
                <div key={service.name} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">{service.name}</h4>
                      <p className="text-sm text-gray-600">
                        Uptime: {service.uptime} | Last check: {format(new Date(service.lastCheck), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {service.status === 'error' && (
                      <button
                        onClick={() => onRestart?.(service.name)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Restart
                      </button>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      service.status === 'running' 
                        ? 'bg-green-100 text-green-800'
                        : service.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Connection Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemStatus.database.status)}
                  <span className={`font-medium ${getStatusColor(systemStatus.database.status)}`}>
                    {systemStatus.database.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {systemStatus.database.connections}/{systemStatus.database.maxConnections}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Query Time</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {systemStatus.database.queryTime}ms
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Mode</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Enable Maintenance Mode</p>
                  <p className="text-sm text-gray-600">Temporarily disable access for system maintenance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.maintenance.enabled}
                    onChange={(e) => {
                      const newSettings = {
                        ...systemSettings,
                        maintenance: { ...systemSettings.maintenance, enabled: e.target.checked }
                      }
                      setSystemSettings(newSettings)
                      onUpdateSettings?.(newSettings)
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {systemSettings.maintenance.enabled && (
                <textarea
                  value={systemSettings.maintenance.message}
                  onChange={(e) => {
                    const newSettings = {
                      ...systemSettings,
                      maintenance: { ...systemSettings.maintenance, message: e.target.value }
                    }
                    setSystemSettings(newSettings)
                  }}
                  placeholder="Maintenance message for users..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              )}
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup Frequency
                  </label>
                  <select
                    value={systemSettings.backups.frequency}
                    onChange={(e) => {
                      const newSettings = {
                        ...systemSettings,
                        backups: { ...systemSettings.backups, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }
                      }
                      setSystemSettings(newSettings)
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retention Period (days)
                  </label>
                  <input
                    type="number"
                    value={systemSettings.backups.retention}
                    onChange={(e) => {
                      const newSettings = {
                        ...systemSettings,
                        backups: { ...systemSettings.backups, retention: parseInt(e.target.value) }
                      }
                      setSystemSettings(newSettings)
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Last backup: {format(new Date(systemSettings.backups.lastBackup), 'PPpp')}
              </p>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    value={systemSettings.security.passwordPolicy.minLength}
                    onChange={(e) => {
                      const newSettings = {
                        ...systemSettings,
                        security: {
                          ...systemSettings.security,
                          passwordPolicy: {
                            ...systemSettings.security.passwordPolicy,
                            minLength: parseInt(e.target.value)
                          }
                        }
                      }
                      setSystemSettings(newSettings)
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={systemSettings.security.sessionTimeout}
                    onChange={(e) => {
                      const newSettings = {
                        ...systemSettings,
                        security: { ...systemSettings.security, sessionTimeout: parseInt(e.target.value) }
                      }
                      setSystemSettings(newSettings)
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">System Logs</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {systemStatus.logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3">
                {getLogIcon(log.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded uppercase ${
                      log.level === 'error' || log.level === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : log.level === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-gray-500">{log.source}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}