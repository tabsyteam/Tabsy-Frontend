'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@tabsy/ui-components';
import {
  Settings,
  Activity,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  Monitor,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Wrench
} from 'lucide-react';
import { useSystemHealth } from '@/hooks/api';
import { UserRole } from '@tabsy/shared-types';

// System Status Badge
function SystemStatusBadge({ status }: { status: 'healthy' | 'warning' | 'critical' | 'unknown' }) {
  const config = {
    healthy: { color: 'bg-status-success-light text-status-success-dark', icon: CheckCircle, label: 'Healthy' },
    warning: { color: 'bg-status-warning-light text-status-warning-dark', icon: AlertCircle, label: 'Warning' },
    critical: { color: 'bg-status-error-light text-status-error-dark', icon: XCircle, label: 'Critical' },
    unknown: { color: 'bg-surface-secondary text-content-secondary', icon: Info, label: 'Unknown' }
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {label}
    </span>
  );
}

export default function SettingsPage() {
  const { data: systemHealth, refetch, isLoading } = useSystemHealth();

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-surface border-b border-border-tertiary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-content-primary flex items-center">
                  <Settings className="h-7 w-7 mr-3 text-primary" />
                  System Administration
                </h1>
                <p className="mt-1 text-sm text-content-secondary">
                  Monitor platform health and system status
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="hover-lift"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* System Health Card */}
            <div className="bg-surface rounded-lg shadow-card border border-border-tertiary overflow-hidden">
              <div className="p-6 border-b border-border-tertiary bg-gradient-to-r from-primary-light/10 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 text-primary mr-2" />
                      <span className="text-lg font-medium text-content-primary">System Status</span>
                    </div>
                    <SystemStatusBadge
                      status={(systemHealth?.status as 'healthy' | 'warning' | 'critical' | 'unknown') || 'unknown'}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-lift"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CPU Usage */}
                  <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                    <div className="flex items-center justify-between mb-2">
                      <Cpu className="h-5 w-5 text-status-info" />
                      <span className="text-xs text-content-tertiary">CPU</span>
                    </div>
                    <div className="text-2xl font-bold text-content-primary">
                      {systemHealth?.cpuUsage || 'N/A'}
                    </div>
                    <p className="text-xs text-content-secondary mt-1">Processor usage</p>
                  </div>

                  {/* Memory Usage */}
                  <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                    <div className="flex items-center justify-between mb-2">
                      <HardDrive className="h-5 w-5 text-status-success" />
                      <span className="text-xs text-content-tertiary">Memory</span>
                    </div>
                    <div className="text-2xl font-bold text-content-primary">
                      {systemHealth?.memoryUsage || 'N/A'}
                    </div>
                    <p className="text-xs text-content-secondary mt-1">RAM usage</p>
                  </div>

                  {/* Storage */}
                  <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                    <div className="flex items-center justify-between mb-2">
                      <Database className="h-5 w-5 text-accent" />
                      <span className="text-xs text-content-tertiary">Storage</span>
                    </div>
                    <div className="text-2xl font-bold text-content-primary">
                      {systemHealth?.diskUsage || 'N/A'}
                    </div>
                    <p className="text-xs text-content-secondary mt-1">Disk usage</p>
                  </div>

                  {/* Uptime */}
                  <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                    <div className="flex items-center justify-between mb-2">
                      <Wifi className="h-5 w-5 text-secondary" />
                      <span className="text-xs text-content-tertiary">Uptime</span>
                    </div>
                    <div className="text-2xl font-bold text-content-primary">
                      {systemHealth?.uptime || 'N/A'}
                    </div>
                    <p className="text-xs text-content-secondary mt-1">System uptime</p>
                  </div>
                </div>

                {/* Services Status */}
                {systemHealth?.services && (
                  <div className="mt-6 pt-6 border-t border-border-tertiary">
                    <h3 className="text-sm font-medium text-content-primary mb-4">Service Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                        <span className="text-sm text-content-secondary">Database</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          systemHealth.services.database === 'healthy'
                            ? 'bg-status-success-light text-status-success-dark'
                            : 'bg-status-error-light text-status-error-dark'
                        }`}>
                          {systemHealth.services.database}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                        <span className="text-sm text-content-secondary">Redis</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          systemHealth.services.redis === 'healthy'
                            ? 'bg-status-success-light text-status-success-dark'
                            : 'bg-status-error-light text-status-error-dark'
                        }`}>
                          {systemHealth.services.redis}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                        <span className="text-sm text-content-secondary">API</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          systemHealth.services.api === 'healthy'
                            ? 'bg-status-success-light text-status-success-dark'
                            : 'bg-status-error-light text-status-error-dark'
                        }`}>
                          {systemHealth.services.api}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Info */}
                <div className="mt-6 pt-6 border-t border-border-tertiary">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between p-3 bg-surface-secondary rounded-lg">
                      <span className="text-sm text-content-secondary">Version</span>
                      <span className="text-sm font-medium text-content-primary">
                        {systemHealth?.version || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-surface-secondary rounded-lg">
                      <span className="text-sm text-content-secondary">Last Check</span>
                      <span className="text-sm font-medium text-content-primary">
                        {systemHealth?.lastCheck
                          ? new Date(systemHealth.lastCheck).toLocaleTimeString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-surface rounded-lg shadow-card border border-border-tertiary p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-light mb-4">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-content-primary mb-2">
                  Additional Settings Coming Soon
                </h3>
                <p className="text-sm text-content-secondary max-w-2xl mx-auto">
                  Advanced system configuration, security settings, notification preferences, audit logs,
                  and backup management will be available in a future update. Currently, only system health
                  monitoring is available.
                </p>
                <div className="mt-6 p-4 bg-primary-light/10 rounded-lg border border-primary/20 max-w-2xl mx-auto">
                  <p className="text-sm text-content-secondary">
                    <strong className="text-content-primary">Backend Integration Required:</strong> These features
                    require corresponding API endpoints to be implemented in the Tabsy-Core backend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
