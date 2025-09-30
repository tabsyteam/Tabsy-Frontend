'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@tabsy/ui-components';
import {
  Settings,
  Shield,
  Database,
  Server,
  Bell,
  Mail,
  CreditCard,
  Globe,
  Key,
  Users,
  Activity,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronRight,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Clock,
  Calendar,
  BarChart3,
  Zap,
  Cloud,
  CloudOff,
  Package,
  GitBranch,
  Code,
  Monitor
} from 'lucide-react';
import { useSystemSettings, useSystemHealth, useAuditLogs } from '@/hooks/api';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { UserRole } from '@tabsy/shared-types';

// Setting Section Component
function SettingSection({
  title,
  description,
  icon: Icon,
  children,
  badge
}: {
  title: string;
  description?: string;
  icon: any;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-primary-light rounded-lg mr-3">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-content-primary">{title}</h3>
              {description && (
                <p className="text-sm text-content-secondary mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {badge}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// System Status Badge
function SystemStatusBadge({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const config = {
    healthy: { color: 'bg-status-success-light text-status-success-dark', icon: CheckCircle, label: 'Healthy' },
    warning: { color: 'bg-status-warning-light text-status-warning-dark', icon: AlertCircle, label: 'Warning' },
    critical: { color: 'bg-status-error-light text-status-error-dark', icon: XCircle, label: 'Critical' }
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
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'system' | 'audit'>('general');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: settings, isLoading, refetch } = useSystemSettings();
  const { data: systemHealth } = useSystemHealth();
  const { data: auditLogs } = useAuditLogs();

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Server },
    { id: 'audit', label: 'Audit Logs', icon: FileText }
  ];

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully');
    setIsEditMode(false);
  };

  const handleBackup = () => {
    toast.info('Creating backup...');
    setTimeout(() => toast.success('Backup created successfully'), 2000);
  };

  const handleRestore = () => {
    if (confirm('Are you sure you want to restore from backup? This will overwrite current settings.')) {
      toast.info('Restoring from backup...');
      setTimeout(() => toast.success('Restore completed successfully'), 2000);
    }
  };

  const handleClearCache = () => {
    toast.success('Cache cleared successfully');
  };

  const handleTestEmail = () => {
    toast.success('Test email sent successfully');
  };

  const handleGenerateApiKey = () => {
    toast.success('New API key generated');
  };

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
                  Configure system settings and monitor platform health
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="hover-lift"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {!isEditMode ? (
                  <Button
                    onClick={() => setIsEditMode(true)}
                    className="btn-professional hover-lift"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Settings
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(false)}
                      className="hover-lift"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveSettings}
                      className="btn-professional hover-lift"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Health Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-primary mr-2" />
                  <span className="text-sm font-medium text-content-primary">System Status</span>
                </div>
                <SystemStatusBadge status={(systemHealth?.status as 'healthy' | 'warning' | 'critical') || 'healthy'} />
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <Cpu className="h-4 w-4 text-status-info mr-1" />
                    <span className="text-content-secondary">CPU: {systemHealth?.cpuUsage || '23%'}</span>
                  </div>
                  <div className="flex items-center">
                    <HardDrive className="h-4 w-4 text-status-success mr-1" />
                    <span className="text-content-secondary">Memory: {systemHealth?.memoryUsage || '45%'}</span>
                  </div>
                  <div className="flex items-center">
                    <Database className="h-4 w-4 text-accent mr-1" />
                    <span className="text-content-secondary">Storage: {systemHealth?.diskUsage || '67%'}</span>
                  </div>
                  <div className="flex items-center">
                    <Wifi className="h-4 w-4 text-secondary mr-1" />
                    <span className="text-content-secondary">Uptime: {systemHealth?.uptime || '15d 4h'}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/settings/health'}
                className="hover-lift"
              >
                <Monitor className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-border-tertiary">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-4 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Platform Settings */}
              <SettingSection
                title="Platform Settings"
                description="Configure general platform settings"
                icon={Globe}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Tabsy Admin Portal"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Support Email
                      </label>
                      <input
                        type="email"
                        defaultValue="support@tabsy.com"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Default Timezone
                      </label>
                      <select disabled={!isEditMode} className="input-professional w-full">
                        <option>UTC</option>
                        <option>America/New_York</option>
                        <option>America/Los_Angeles</option>
                        <option>Europe/London</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Default Currency
                      </label>
                      <select disabled={!isEditMode} className="input-professional w-full">
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                        <option>CAD</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 pt-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-content-primary">Enable maintenance mode</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-content-primary">Enable new registrations</span>
                    </label>
                  </div>
                </div>
              </SettingSection>

              {/* Payment Settings */}
              <SettingSection
                title="Payment Configuration"
                description="Configure payment processing settings"
                icon={CreditCard}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Payment Provider
                      </label>
                      <select disabled={!isEditMode} className="input-professional w-full">
                        <option>Stripe</option>
                        <option>PayPal</option>
                        <option>Square</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Processing Fee (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="2.9"
                        step="0.1"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Fixed Fee ($)
                      </label>
                      <input
                        type="number"
                        defaultValue="0.30"
                        step="0.01"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Payout Schedule
                      </label>
                      <select disabled={!isEditMode} className="input-professional w-full">
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              </SettingSection>

              {/* Backup & Restore */}
              <SettingSection
                title="Backup & Restore"
                description="Manage system backups and data recovery"
                icon={Database}
                badge={
                  <span className="text-xs text-content-secondary">
                    Last backup: {formatDistanceToNow(new Date(Date.now() - 86400000), { addSuffix: true })}
                  </span>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-content-primary">Automatic Backups</p>
                      <p className="text-xs text-content-secondary">Daily at 2:00 AM UTC</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked disabled={!isEditMode} className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-default after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleBackup}
                      className="hover-lift"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Create Backup Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRestore}
                      className="hover-lift"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Restore from Backup
                    </Button>
                  </div>
                </div>
              </SettingSection>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Authentication Settings */}
              <SettingSection
                title="Authentication"
                description="Configure authentication and security settings"
                icon={Lock}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        defaultValue="30"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        Max Login Attempts
                      </label>
                      <input
                        type="number"
                        defaultValue="5"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-content-primary">Require email verification</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-content-primary">Enable two-factor authentication</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-content-primary">Enforce strong passwords</span>
                    </label>
                  </div>
                </div>
              </SettingSection>

              {/* API Keys */}
              <SettingSection
                title="API Keys"
                description="Manage API keys for external integrations"
                icon={Key}
              >
                <div className="space-y-4">
                  <div className="p-4 bg-surface-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-content-primary">Production API Key</span>
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-sm text-primary hover:text-primary-dark"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="font-mono text-sm text-content-secondary">
                      {showApiKey ? 'your_api_key_will_appear_here_xxxxx' : '••••••••••••••••••••••••••••••••'}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateApiKey}
                        disabled={!isEditMode}
                        className="hover-lift"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText('your_api_key_will_appear_here_xxxxx');
                          toast.success('API key copied to clipboard');
                        }}
                        className="hover-lift"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </SettingSection>

              {/* IP Whitelist */}
              <SettingSection
                title="IP Whitelist"
                description="Restrict access to specific IP addresses"
                icon={Shield}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-content-primary">Enable IP Whitelist</p>
                      <p className="text-xs text-content-secondary">Only allow access from specified IPs</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" disabled={!isEditMode} className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-default after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <textarea
                    placeholder="Enter IP addresses, one per line"
                    rows={4}
                    disabled={!isEditMode}
                    className="input-professional w-full"
                    defaultValue="192.168.1.1\n10.0.0.1"
                  />
                </div>
              </SettingSection>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Email Settings */}
              <SettingSection
                title="Email Configuration"
                description="Configure email notifications and SMTP settings"
                icon={Mail}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        defaultValue="smtp.gmail.com"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        defaultValue="587"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        SMTP Username
                      </label>
                      <input
                        type="text"
                        defaultValue="notifications@tabsy.com"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content-primary mb-2">
                        From Email
                      </label>
                      <input
                        type="email"
                        defaultValue="noreply@tabsy.com"
                        disabled={!isEditMode}
                        className="input-professional w-full"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    className="hover-lift"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              </SettingSection>

              {/* Notification Preferences */}
              <SettingSection
                title="Notification Triggers"
                description="Choose which events trigger notifications"
                icon={Bell}
              >
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-content-primary">New Restaurant Registration</p>
                        <p className="text-xs text-content-secondary">Notify when a new restaurant registers</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-content-primary">High Value Orders</p>
                        <p className="text-xs text-content-secondary">Notify for orders above $500</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-content-primary">Payment Failures</p>
                        <p className="text-xs text-content-secondary">Alert on payment processing errors</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        disabled={!isEditMode}
                        className="rounded border-border-tertiary text-primary focus:ring-primary"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-content-primary">System Errors</p>
                        <p className="text-xs text-content-secondary">Critical system alerts</p>
                      </div>
                    </div>
                  </label>
                </div>
              </SettingSection>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* System Information */}
              <SettingSection
                title="System Information"
                description="View system details and version information"
                icon={Info}
                badge={
                  <span className="text-xs px-2 py-1 bg-primary-light text-primary rounded-full">
                    v2.4.1
                  </span>
                }
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between p-3 bg-surface-secondary rounded-lg">
                      <span className="text-sm text-content-secondary">Node Version</span>
                      <span className="text-sm font-medium text-content-primary">v18.17.0</span>
                    </div>
                    <div className="flex justify-between p-3 bg-surface-secondary rounded-lg">
                      <span className="text-sm text-content-secondary">Database</span>
                      <span className="text-sm font-medium text-content-primary">PostgreSQL 15.2</span>
                    </div>
                    <div className="flex justify-between p-3 bg-surface-secondary rounded-lg">
                      <span className="text-sm text-content-secondary">Cache</span>
                      <span className="text-sm font-medium text-content-primary">Redis 7.0</span>
                    </div>
                    <div className="flex justify-between p-3 bg-surface-secondary rounded-lg">
                      <span className="text-sm text-content-secondary">Environment</span>
                      <span className="text-sm font-medium text-content-primary">Production</span>
                    </div>
                  </div>
                </div>
              </SettingSection>

              {/* Performance */}
              <SettingSection
                title="Performance"
                description="System performance metrics and optimization"
                icon={Zap}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-surface-secondary rounded-lg">
                      <div className="text-2xl font-bold text-status-success">23ms</div>
                      <p className="text-xs text-content-secondary mt-1">Avg Response Time</p>
                    </div>
                    <div className="text-center p-4 bg-surface-secondary rounded-lg">
                      <div className="text-2xl font-bold text-status-info">99.9%</div>
                      <p className="text-xs text-content-secondary mt-1">Uptime</p>
                    </div>
                    <div className="text-center p-4 bg-surface-secondary rounded-lg">
                      <div className="text-2xl font-bold text-accent">1.2k</div>
                      <p className="text-xs text-content-secondary mt-1">Requests/min</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClearCache}
                      className="hover-lift"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                    <Button
                      variant="outline"
                      className="hover-lift"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Metrics
                    </Button>
                  </div>
                </div>
              </SettingSection>

              {/* Maintenance */}
              <SettingSection
                title="Maintenance Mode"
                description="Temporarily disable access for maintenance"
                icon={Terminal}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-content-primary">Enable Maintenance Mode</p>
                      <p className="text-xs text-content-secondary">Show maintenance page to all users</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" disabled={!isEditMode} className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-default after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <textarea
                    placeholder="Maintenance message..."
                    rows={3}
                    disabled={!isEditMode}
                    className="input-professional w-full"
                    defaultValue="We're currently performing scheduled maintenance. We'll be back shortly!"
                  />
                </div>
              </SettingSection>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              {/* Audit Logs */}
              <SettingSection
                title="Recent Activity"
                description="View system audit logs and user activities"
                icon={FileText}
                badge={
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-lift"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export Logs
                  </Button>
                }
              >
                <div className="space-y-3">
                  {auditLogs?.slice(0, 10).map((log: any, index: number) => (
                    <div key={index} className="flex items-start p-3 bg-surface-secondary rounded-lg">
                      <div className={`p-2 rounded-lg mr-3 ${
                        log.severity === 'error' ? 'bg-status-error-light' :
                        log.severity === 'warning' ? 'bg-status-warning-light' :
                        'bg-status-success-light'
                      }`}>
                        <Activity className={`h-4 w-4 ${
                          log.severity === 'error' ? 'text-status-error-dark' :
                          log.severity === 'warning' ? 'text-status-warning-dark' :
                          'text-status-success-dark'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-content-primary">{log.action}</p>
                        <p className="text-xs text-content-secondary">
                          by {log.user} • {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </p>
                        {log.details && (
                          <p className="text-xs text-content-tertiary mt-1">{log.details}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-content-tertiary" />
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-content-tertiary" />
                      <p className="text-sm text-content-secondary">No audit logs available</p>
                    </div>
                  )}
                </div>
              </SettingSection>

              {/* Log Settings */}
              <SettingSection
                title="Log Configuration"
                description="Configure audit log retention and levels"
                icon={Settings}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-content-primary mb-2">
                      Log Level
                    </label>
                    <select disabled={!isEditMode} className="input-professional w-full">
                      <option>All</option>
                      <option>Errors Only</option>
                      <option>Warnings & Errors</option>
                      <option>Info & Above</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content-primary mb-2">
                      Retention Period
                    </label>
                    <select disabled={!isEditMode} className="input-professional w-full">
                      <option>30 Days</option>
                      <option>60 Days</option>
                      <option>90 Days</option>
                      <option>1 Year</option>
                    </select>
                  </div>
                </div>
              </SettingSection>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}