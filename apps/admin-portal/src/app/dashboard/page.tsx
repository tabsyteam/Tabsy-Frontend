"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button, useAuth } from "@tabsy/ui-components";
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Users,
  Store,
  BarChart3,
  Settings,
  Shield,
  AlertTriangle,
  Activity,
  Banknote,
  TrendingUp,
  Globe,
  LogOut,
  User,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  Zap
} from "lucide-react";
import { User as UserType } from '@tabsy/shared-types';
import {
  DynamicUserGrowthChart,
  DynamicUserStatusChart
} from "../../components/charts";
import { useAdminDashboard, useUserGrowthData, useRestaurants, useUsers, useLiveOrders, useLivePayments } from '@/hooks/api';
import { useAnalyticsUpdates } from '@tabsy/api-client';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatPrice, type CurrencyCode, getOrderCurrency, getPaymentCurrency } from '@tabsy/shared-utils';
import ErrorBoundary from '@/components/ErrorBoundary';

// Metric Card Component
function MetricCard({
  icon: Icon,
  title,
  value,
  change,
  changeType = 'neutral',
  subtitle,
  loading = false
}: {
  icon: any;
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  loading?: boolean;
}) {
  const changeColors = {
    positive: 'text-status-success-dark',
    negative: 'text-status-error-dark',
    neutral: 'text-status-info-dark'
  };

  return (
    <div className="bg-surface rounded-lg shadow-card p-6 hover:shadow-lg transition-all duration-normal animate-fadeIn">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="p-3 rounded-lg bg-surface-tertiary">
            <Icon className="h-6 w-6 text-content-brand" />
          </div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-content-secondary">{title}</p>
          {loading ? (
            <div className="mt-1 skeleton h-8 w-24 rounded"></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-content-primary">{value}</p>
              {(change || subtitle) && (
                <p className={`text-sm ${change ? changeColors[changeType] : 'text-content-tertiary'}`}>
                  {change && <span className="font-medium">{change}</span>}
                  {subtitle && <span className="ml-1">{subtitle}</span>}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: any }) {
  const iconColors = {
    restaurant: 'bg-status-success',
    user: 'bg-primary',
    order: 'bg-accent',
    payment: 'bg-status-success',
    system: 'bg-secondary'
  };

  const icons = {
    restaurant: Store,
    user: Users,
    order: ShoppingBag,
    payment: CreditCard,
    system: Settings
  };

  const statusColors = {
    success: 'text-status-success-dark',
    warning: 'text-status-warning-dark',
    error: 'text-status-error-dark',
    info: 'text-status-info-dark'
  };

  const Icon = icons[activity.type as keyof typeof icons] || Activity;

  return (
    <li>
      <div className="relative pb-8">
        <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-border-tertiary" />
        <div className="relative flex space-x-3">
          <div>
            <span className={`h-10 w-10 rounded-full ${iconColors[activity.type as keyof typeof iconColors] || 'bg-surface-tertiary'} flex items-center justify-center ring-8 ring-surface`}>
              <Icon className="h-5 w-5 text-content-inverse" />
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-2 flex justify-between space-x-4">
            <div>
              <p className="text-sm text-content-primary">
                <span className="font-medium">{activity.title}</span>
              </p>
              <p className="text-sm text-content-secondary">{activity.description}</p>
              {activity.status && (
                <span className={`text-xs ${statusColors[activity.status as keyof typeof statusColors]}`}>
                  • {activity.status}
                </span>
              )}
            </div>
            <div className="text-right text-sm whitespace-nowrap text-content-tertiary">
              <time>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</time>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function AdminDashboard(): JSX.Element {
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user as UserType | null;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  // API Hooks for real data
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useAdminDashboard();
  const { data: userGrowthData } = useUserGrowthData();
  const { data: liveOrders } = useLiveOrders();
  const { data: livePayments } = useLivePayments();

  // Determine default currency from live orders or payments
  const defaultCurrency: CurrencyCode = (() => {
    if (liveOrders && liveOrders.length > 0) {
      return getOrderCurrency(liveOrders[0]);
    }
    if (livePayments && livePayments.length > 0) {
      return getPaymentCurrency(livePayments[0]);
    }
    return 'USD';
  })();

  // Removed WebSocket - Admin portal uses periodic refresh instead of real-time updates

  // Auto-refresh dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDashboard();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refetchDashboard]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await auth.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleManualRefresh = () => {
    refetchDashboard();
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  // WebSocket events removed - Admin portal uses periodic refresh instead of real-time WebSocket updates
  // This eliminates duplicate order event handling and provides more stable data refresh for administrative interfaces

  // Calculate system health based on metrics
  const getSystemHealth = () => {
    if (!dashboardData) return { status: 'Unknown', color: 'info' };

    const load = dashboardData.metrics.systemLoad;
    if (load < 70) return { status: 'Healthy', color: 'primary' }; // Indigo for healthy
    if (load < 85) return { status: 'Elevated', color: 'warning' };
    return { status: 'Critical', color: 'error' };
  };

  const systemHealth = getSystemHealth();

  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <DashboardLayout breadcrumbs={[{ label: 'Dashboard' }]}>
          <div>
          {/* Quick Actions Bar */}
          <div className="bg-surface border-b border-border-default px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  systemHealth.color === 'primary' ? 'bg-primary/10 text-primary border border-primary/20' :
                  systemHealth.color === 'warning' ? 'badge-warning' :
                  systemHealth.color === 'error' ? 'badge-error' :
                  'badge-info'
                } animate-fadeIn`}>
                  <Zap className="h-3 w-3 mr-1" />
                  System {systemHealth.status}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  className="hover-lift"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="hover-lift"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Alerts
                    {liveOrders && liveOrders.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-status-error rounded-full animate-pulse"></span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={Banknote}
              title="Total Revenue"
              value={formatPrice(dashboardData?.metrics.totalRevenue || 0, defaultCurrency)}
              change={`${(dashboardData?.metrics.revenueGrowth || 0) > 0 ? '+' : ''}${(dashboardData?.metrics.revenueGrowth || 0).toFixed(1)}%`}
              changeType={(dashboardData?.metrics.revenueGrowth || 0) > 0 ? 'positive' : 'negative'}
              subtitle="from yesterday"
              loading={dashboardLoading}
            />

            <MetricCard
              icon={Store}
              title="Restaurants"
              value={dashboardData?.metrics.totalRestaurants || 0}
              subtitle={`${dashboardData?.restaurantStatus.active || 0} active`}
              changeType="neutral"
              loading={dashboardLoading}
            />

            <MetricCard
              icon={Users}
              title="Total Users"
              value={(dashboardData?.metrics.totalUsers || 0).toLocaleString()}
              change={`+${dashboardData?.metrics.usersGrowth?.toFixed(1)}%`}
              changeType="positive"
              subtitle="this month"
              loading={dashboardLoading}
            />

            <MetricCard
              icon={ShoppingBag}
              title="Orders Today"
              value={dashboardData?.metrics.ordersToday || 0}
              change={`${(dashboardData?.metrics.ordersGrowth || 0) > 0 ? '+' : ''}${(dashboardData?.metrics.ordersGrowth || 0).toFixed(1)}%`}
              changeType={(dashboardData?.metrics.ordersGrowth || 0) > 0 ? 'positive' : 'negative'}
              subtitle={`${dashboardData?.metrics.activeOrders || 0} active`}
              loading={dashboardLoading}
            />
          </div>

          {/* Live Orders & Payments Row */}
          {(liveOrders && liveOrders.length > 0) || (livePayments && livePayments.length > 0) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Live Orders */}
              {liveOrders && liveOrders.length > 0 && (
                <div className="bg-surface rounded-lg shadow-card p-6 animate-fadeIn">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-content-primary">Live Orders</h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium badge-info animate-pulse">
                      {liveOrders.length} active
                    </span>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
                    {liveOrders.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-content-primary">Order #{order.orderNumber}</p>
                          <p className="text-xs text-content-secondary">Table {order.tableNumber} • {formatPrice(order.totalAmount, getOrderCurrency(order))}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'PENDING' ? 'badge-warning' :
                          order.status === 'PREPARING' ? 'badge-info' :
                          order.status === 'READY' ? 'badge-success' :
                          'badge-secondary'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Payments */}
              {livePayments && livePayments.length > 0 && (
                <div className="bg-surface rounded-lg shadow-card p-6 animate-fadeIn">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-content-primary">Processing Payments</h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium badge-warning animate-pulse">
                      {livePayments.length} pending
                    </span>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
                    {livePayments.slice(0, 5).map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-content-primary">{formatPrice(payment.amount, getPaymentCurrency(payment))}</p>
                          <p className="text-xs text-content-secondary">{payment.paymentMethod} • {payment.restaurantName}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full badge-warning">
                          {payment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Charts and Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Platform Growth Chart */}
            <div className="lg:col-span-2 bg-surface rounded-lg shadow-card p-6 animate-fadeInUp">
              <h3 className="text-lg font-medium text-content-primary mb-4">Platform Growth</h3>
              <DynamicUserGrowthChart data={userGrowthData || dashboardData?.chartData?.users} />
            </div>

            {/* Restaurant Status */}
            <div className="bg-surface rounded-lg shadow-card p-6 animate-fadeInUp">
              <h3 className="text-lg font-medium text-content-primary mb-4">Restaurant Status</h3>
              <DynamicUserStatusChart
                data={dashboardData?.restaurantStatus ? [
                  { name: 'Active', value: dashboardData.restaurantStatus.active, color: '#4F46E5' }, // Indigo-600
                  { name: 'Pending', value: dashboardData.restaurantStatus.pending, color: '#F97316' }, // Orange-500
                  { name: 'Suspended', value: dashboardData.restaurantStatus.suspended, color: '#EF4444' } // Red-500
                ].filter(item => item.value > 0) : []}
              />
              {dashboardData?.restaurantStatus && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-primary" />
                      <span className="text-sm text-content-secondary">Active</span>
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {dashboardData.restaurantStatus.active}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-content-tertiary" />
                      <span className="text-sm text-content-secondary">Inactive</span>
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {dashboardData.restaurantStatus.inactive}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-status-warning" />
                      <span className="text-sm text-content-secondary">Pending</span>
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {dashboardData.restaurantStatus.pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-status-error" />
                      <span className="text-sm text-content-secondary">Suspended</span>
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {dashboardData.restaurantStatus.suspended}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Management Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="bg-surface rounded-lg shadow-card p-6 animate-fadeInLeft">
              <h3 className="text-lg font-medium text-content-primary mb-4">User Management</h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/users')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/users/permissions')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  User Permissions
                </Button>
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/users/activity')}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  User Activity
                </Button>
              </div>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-6 animate-fadeIn">
              <h3 className="text-lg font-medium text-content-primary mb-4">Restaurant Management</h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/restaurants')}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Manage Restaurants
                </Button>
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/analytics')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance Analytics
                </Button>
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/restaurants/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Restaurant Settings
                </Button>
              </div>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-6 animate-fadeInRight">
              <h3 className="text-lg font-medium text-content-primary mb-4">System Administration</h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/settings')}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Platform Settings
                </Button>
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/analytics/system')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  System Analytics
                </Button>
                <Button
                  className="w-full justify-start btn-professional hover-lift"
                  variant="outline"
                  onClick={() => router.push('/system/health')}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  System Health
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface rounded-lg shadow-card animate-fadeInUp">
            <div className="px-6 py-4 border-b border-border-tertiary flex items-center justify-between">
              <h3 className="text-lg font-medium text-content-primary">Recent Activity</h3>
              {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
                <span className="text-xs text-content-tertiary">
                  {dashboardData.recentActivity.length} events
                </span>
              )}
            </div>
            <div className="p-6">
              {dashboardLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton h-16 rounded-lg"></div>
                  ))}
                </div>
              ) : dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {dashboardData.recentActivity.map((activity, idx) => (
                      <ActivityItem key={activity.id || idx} activity={activity} />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-content-tertiary text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        </main>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}