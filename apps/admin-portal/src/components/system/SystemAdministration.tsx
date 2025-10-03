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
import { useSystemHealth } from '@/hooks/api/useSystem'

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
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'logs'>('status')
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)

  // Fetch real system health data from API
  const { data: healthData, isLoading: healthLoading, error: healthError } = useSystemHealth()

  // Initialize settings with default values
  useEffect(() => {
    setSystemSettings({
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
    })
  }, [])

  // Transform health data to system status
  const systemStatus: SystemStatus | null = healthData ? {
    overall: healthData.status === 'healthy' ? 'healthy' : 'critical',
    services: [
      {
        name: 'API Server',
        status: healthData.services.api === 'healthy' ? 'running' : 'error',
        uptime: healthData.uptime || 'N/A',
        lastCheck: healthData.lastCheck
      },
      {
        name: 'Database',
        status: healthData.services.database === 'healthy' ? 'running' : 'error',
        uptime: healthData.uptime || 'N/A',
        lastCheck: healthData.lastCheck
      },
      {
        name: 'Redis Cache',
        status: healthData.services.redis === 'healthy' ? 'running' : healthData.services.redis === 'unhealthy' ? 'error' : 'stopped',
        uptime: healthData.uptime || 'N/A',
        lastCheck: healthData.lastCheck
      }
    ],
    performance: {
      cpu: parseFloat(healthData.cpuUsage) || 0,
      memory: parseFloat(healthData.memoryUsage) || 0,
      disk: parseFloat(healthData.diskUsage) || 0,
      network: 0 // Not provided by backend
    },
    database: {
      status: healthData.services.database === 'healthy' ? 'connected' : 'disconnected',
      connections: 0, // Not provided by backend
      maxConnections: 100,
      queryTime: 0 // Not provided by backend
    },
    logs: [] // Logs would need a separate endpoint
  } : null

  const loading = healthLoading

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-status-success" />
      case 'warning':
      case 'slow':
        return <AlertCircle className="w-5 h-5 text-status-warning" />
      case 'error':
      case 'stopped':
      case 'disconnected':
      case 'critical':
        return <XCircle className="w-5 h-5 text-status-error" />
      default:
        return <Info className="w-5 h-5 text-content-secondary" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'healthy':
        return 'text-status-success'
      case 'warning':
      case 'slow':
        return 'text-status-warning'
      case 'error':
      case 'stopped':
      case 'disconnected':
      case 'critical':
        return 'text-status-error'
      default:
        return 'text-content-secondary'
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
      case 'critical':
        return <XCircle className="w-4 h-4 text-status-error" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-status-warning" />
      case 'info':
        return <Info className="w-4 h-4 text-status-info" />
      default:
        return <Info className="w-4 h-4 text-content-secondary" />
    }
  }

  const getPerformanceColor = (value: number) => {
    if (value < 50) return 'bg-status-success'
    if (value < 80) return 'bg-status-warning'
    return 'bg-status-error'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-secondary rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface p-6 rounded-lg border">
                <div className="h-4 bg-surface-secondary rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-surface-secondary rounded w-3/4"></div>
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
          <h1 className="text-2xl font-bold text-content-primary">System Administration</h1>
          <p className="text-content-secondary">Monitor and manage system health and configuration</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 border border-border-secondary rounded-md hover:bg-surface-secondary transition-colors"
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
        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">System Status</p>
              <p className={`text-lg font-semibold capitalize ${getStatusColor(systemStatus.overall)}`}>
                {systemStatus.overall}
              </p>
            </div>
            {getStatusIcon(systemStatus.overall)}
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">Active Services</p>
              <p className="text-lg font-semibold text-content-primary">
                {systemStatus.services.filter(s => s.status === 'running').length}/{systemStatus.services.length}
              </p>
            </div>
            <Server className="w-6 h-6 text-status-info" />
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">Database</p>
              <p className={`text-lg font-semibold capitalize ${getStatusColor(systemStatus.database.status)}`}>
                {systemStatus.database.status}
              </p>
            </div>
            <Database className="w-6 h-6 text-status-success" />
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content-secondary">CPU Usage</p>
              <p className="text-lg font-semibold text-content-primary">{systemStatus.performance.cpu}%</p>
            </div>
            <Cpu className="w-6 h-6 text-status-warning" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-surface rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-content-primary mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(systemStatus.performance).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-content-secondary capitalize">{key}</span>
                <span className="text-sm font-medium text-content-primary">{value}%</span>
              </div>
              <div className="w-full bg-surface-secondary rounded-full h-2">
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
      <div className="border-b border-border-tertiary">
        <nav className="flex space-x-8">
          {['status', 'settings', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'status' | 'settings' | 'logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-content-secondary hover:text-content-primary hover:border-border-secondary'
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
          <div className="bg-surface rounded-lg border">
            <div className="p-6 border-b border-border-tertiary">
              <h3 className="text-lg font-semibold text-content-primary">Services Status</h3>
            </div>
            <div className="divide-y divide-border-tertiary">
              {systemStatus.services.map((service) => (
                <div key={service.name} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <h4 className="font-medium text-content-primary">{service.name}</h4>
                      <p className="text-sm text-content-secondary">
                        Uptime: {service.uptime} | Last check: {format(new Date(service.lastCheck), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {service.status === 'error' && (
                      <button
                        onClick={() => onRestart?.(service.name)}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary-dark transition-colors"
                      >
                        Restart
                      </button>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      service.status === 'running' 
                        ? 'bg-status-success-light text-status-success-dark'
                        : service.status === 'error'
                        ? 'bg-status-error-light text-status-error-dark'
                        : 'bg-surface-secondary text-content-secondary'
                    }`}>
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-surface rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Database Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-content-secondary">Connection Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemStatus.database.status)}
                  <span className={`font-medium ${getStatusColor(systemStatus.database.status)}`}>
                    {systemStatus.database.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-content-secondary">Active Connections</p>
                <p className="text-lg font-semibold text-content-primary mt-1">
                  {systemStatus.database.connections}/{systemStatus.database.maxConnections}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-content-secondary">Avg Query Time</p>
                <p className="text-lg font-semibold text-content-primary mt-1">
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
          <div className="bg-surface rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Maintenance Mode</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-content-primary">Enable Maintenance Mode</p>
                  <p className="text-sm text-content-secondary">Temporarily disable access for system maintenance</p>
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
                  <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-content-inverse after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
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
                  className="w-full p-3 border border-border-secondary rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              )}
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-surface rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Backup Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
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
                    className="w-full border border-border-secondary rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
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
                    className="w-full border border-border-secondary rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-sm text-content-secondary">
                Last backup: {format(new Date(systemSettings.backups.lastBackup), 'PPpp')}
              </p>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-surface rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
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
                    className="w-full border border-border-secondary rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
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
                    className="w-full border border-border-secondary rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-surface rounded-lg border">
          <div className="p-6 border-b border-border-tertiary">
            <h3 className="text-lg font-semibold text-content-primary">System Logs</h3>
          </div>
          <div className="divide-y divide-border-tertiary max-h-96 overflow-y-auto">
            {systemStatus.logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3">
                {getLogIcon(log.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded uppercase ${
                      log.level === 'error' || log.level === 'critical'
                        ? 'bg-status-error-light text-status-error-dark'
                        : log.level === 'warning'
                        ? 'bg-status-warning-light text-status-warning-dark'
                        : 'bg-status-info-light text-status-info-dark'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-content-secondary">{log.source}</span>
                    <span className="text-xs text-content-secondary">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-sm text-content-primary">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}