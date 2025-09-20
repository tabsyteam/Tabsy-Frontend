"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button, useAuth } from "@tabsy/ui-components";
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
  DollarSign,
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
import { useAdminDashboard, useRestaurants, useUsers, useLiveOrders, useLivePayments } from '@/hooks/api';
import { useWebSocket, useWebSocketEvent, useAnalyticsUpdates } from '@tabsy/api-client';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-blue-600'
  };

  return (
    <div className="bg-surface rounded-lg shadow-card p-6 hover:shadow-lg transition-all duration-normal animate-fadeIn">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary-light to-secondary-light">
            <Icon className="h-6 w-6 text-primary" />
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
    restaurant: 'bg-green-500',
    user: 'bg-blue-500',
    order: 'bg-purple-500',
    payment: 'bg-emerald-500',
    system: 'bg-orange-500'
  };

  const icons = {
    restaurant: Store,
    user: Users,
    order: ShoppingBag,
    payment: CreditCard,
    system: Settings
  };

  const statusColors = {
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600',
    info: 'text-blue-600'
  };

  const Icon = icons[activity.type as keyof typeof icons] || Activity;

  return (
    <li>
      <div className="relative pb-8">
        <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-border-tertiary" />
        <div className="relative flex space-x-3">
          <div>
            <span className={`h-10 w-10 rounded-full ${iconColors[activity.type as keyof typeof iconColors] || 'bg-gray-500'} flex items-center justify-center ring-8 ring-surface`}>
              <Icon className="h-5 w-5 text-white" />
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
  const { data: liveOrders } = useLiveOrders();
  const { data: livePayments } = useLivePayments();

  // WebSocket for real-time updates
  const ws = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5001',
    auth: {
      token: auth.session?.token,
      namespace: 'restaurant' as const
    },
    onConnect: () => {
      console.log('Admin WebSocket connected');
      toast.success('Connected to real-time updates');
    },
    onError: (error: Error) => {
      console.error('Admin WebSocket error:', error);
      toast.error('Failed to connect to real-time updates');
    }
  });

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

  // Set up real-time event listeners for comprehensive admin monitoring

  // CRITICAL: Staff Notifications & Alerts
  useWebSocketEvent(ws.client, 'notification:staff', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    const priority = data.priority === 'critical' ? 'error' : data.priority === 'high' ? 'warning' : 'info';
    toast[priority](`Staff Notification: ${data.title}`, {
      description: data.message,
      duration: data.priority === 'critical' ? Infinity : 10000
    });
  });

  useWebSocketEvent(ws.client, 'alert:urgent', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    toast.error(`🚨 URGENT ALERT: ${data.title}`, {
      description: data.message,
      duration: Infinity,
      action: {
        label: 'Acknowledge',
        onClick: () => console.log('Alert acknowledged:', data.alertId)
      }
    });
  });

  useWebSocketEvent(ws.client, 'notification:created', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    toast.info(`New notification: ${data.title}`);
  });

  // Order Events
  useWebSocketEvent(ws.client, 'order:created', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    toast.success(`New order #${data.orderId?.slice(-8)} received!`);
  });

  useWebSocketEvent(ws.client, 'order:updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    toast.info(`Order #${data.orderId?.slice(-8)} updated`);
  });

  useWebSocketEvent(ws.client, 'order:status_updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    toast.info(`Order #${data.orderId?.slice(-8)} status: ${data.newStatus}`);
  });

  // Payment Events - Complete Lifecycle
  useWebSocketEvent(ws.client, 'payment:created', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    toast.info(`Payment initiated: $${data.amount} for order #${data.orderId?.slice(-8)}`);
  });

  useWebSocketEvent(ws.client, 'payment:completed', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    toast.success(`Payment completed: $${data.amount} via ${data.method}`);
  });

  useWebSocketEvent(ws.client, 'payment:failed', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    toast.error(`Payment failed: $${data.amount} - ${data.errorMessage}`);
  });

  useWebSocketEvent(ws.client, 'payment:cancelled', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    toast.warning(`Payment cancelled: $${data.amount} - ${data.reason}`);
  });

  useWebSocketEvent(ws.client, 'payment:refunded', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    toast.info(`Refund processed: $${data.amount} - ${data.reason}`);
  });

  useWebSocketEvent(ws.client, 'payment:status_updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    toast.info(`Payment status updated: ${data.status}`);
  });

  // Analytics Events
  useWebSocketEvent(ws.client, 'analytics:update', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    // Only show toast for significant changes to avoid spam
    if (data.metric === 'revenue' && data.value > 1000) {
      toast.success(`Revenue milestone: $${data.value.toLocaleString()}`);
    }
  });

  // Kitchen Events
  useWebSocketEvent(ws.client, 'kitchen:new-order', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'kitchen'] });
    if (data.priority === 'urgent') {
      toast.warning(`🍳 URGENT Kitchen Order: ${data.orderId?.slice(-8)} - ${data.priority}`);
    }
  });

  useWebSocketEvent(ws.client, 'kitchen:order-ready', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'kitchen'] });
    toast.success(`🍽️ Order ready: #${data.orderId?.slice(-8)} (${data.totalPrepTime}min)`);
  });

  useWebSocketEvent(ws.client, 'kitchen:order-cancelled', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'kitchen'] });
    toast.error(`🚫 Kitchen cancelled order #${data.orderId?.slice(-8)} - ${data.reason}`);
  });

  // Table Events
  useWebSocketEvent(ws.client, 'table:status_updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
    // Only show toast for important status changes
    if (data.status === 'occupied' || data.status === 'available') {
      toast.info(`Table ${data.tableId}: ${data.status}`);
    }
  });

  useWebSocketEvent(ws.client, 'table:check_in', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
    toast.success(`👥 Table check-in: ${data.tableId} (${data.customersCount || 1} guests)`);
  });

  useWebSocketEvent(ws.client, 'table:check_out', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
    toast.info(`👋 Table check-out: ${data.tableId}`);
  });

  // Session Events
  useWebSocketEvent(ws.client, 'session:updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
    // Only show significant session updates
    if (data.status === 'expired' || data.totalSpent > 100) {
      toast.info(`QR Session ${data.sessionId?.slice(-8)}: ${data.status} - $${data.totalSpent}`);
    }
  });

  useWebSocketEvent(ws.client, 'session:expired', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
    toast.warning(`⏰ Session expired: ${data.sessionId?.slice(-8)} - ${data.reason} ($${data.finalTotal})`);
  });

  // Menu Events
  useWebSocketEvent(ws.client, 'menu:updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    toast.info(`Menu updated: Item ${data.itemId?.slice(-8)} by ${data.updatedBy}`);
  });

  // Order Modification Events
  useWebSocketEvent(ws.client, 'order:item_added', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    toast.info(`Item added to order #${data.orderId?.slice(-8)}`);
  });

  useWebSocketEvent(ws.client, 'order:item_updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    toast.info(`Item updated in order #${data.orderId?.slice(-8)}`);
  });

  useWebSocketEvent(ws.client, 'order:item_removed', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    toast.warning(`Item removed from order #${data.orderId?.slice(-8)}`);
  });

  // Calculate system health based on metrics
  const getSystemHealth = () => {
    if (!dashboardData) return { status: 'Unknown', color: 'gray' };

    const load = dashboardData.metrics.systemLoad;
    if (load < 70) return { status: 'Healthy', color: 'green' };
    if (load < 85) return { status: 'Elevated', color: 'orange' };
    return { status: 'Critical', color: 'red' };
  };

  const systemHealth = getSystemHealth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-professional">
        {/* Header */}
        <header className="bg-surface border-b border-border-tertiary shadow-sm sticky top-0 z-sticky backdrop-blur-professional">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gradient-professional">Admin Portal</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  systemHealth.color === 'green' ? 'badge-success' :
                  systemHealth.color === 'orange' ? 'badge-warning' :
                  systemHealth.color === 'red' ? 'badge-error' :
                  'badge-info'
                } animate-fadeIn`}>
                  <Zap className="h-3 w-3 mr-1" />
                  System {systemHealth.status}
                </span>
                {ws.isConnected && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium badge-success animate-pulse">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </span>
                )}
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
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/settings')}
                  className="hover-lift"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>

                {/* User Info and Logout */}
                <div className="flex items-center space-x-3 pl-4 border-l border-border-tertiary">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center shadow-md">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-content-primary">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-content-secondary">{user?.role}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="hover-lift"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {isLoggingOut ? 'Signing out...' : 'Logout'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={DollarSign}
              title="Total Revenue"
              value={`$${(dashboardData?.metrics.totalRevenue || 0).toLocaleString()}`}
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
                          <p className="text-xs text-content-secondary">Table {order.tableNumber} • ${order.totalAmount}</p>
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
                          <p className="text-sm font-medium text-content-primary">${payment.amount}</p>
                          <p className="text-xs text-content-secondary">{payment.method} • {payment.restaurantName}</p>
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
              <DynamicUserGrowthChart />
            </div>

            {/* Restaurant Status */}
            <div className="bg-surface rounded-lg shadow-card p-6 animate-fadeInUp">
              <h3 className="text-lg font-medium text-content-primary mb-4">Restaurant Status</h3>
              <DynamicUserStatusChart />
              {dashboardData?.restaurantStatus && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-green-500" />
                      <span className="text-sm text-content-secondary">Active</span>
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {dashboardData.restaurantStatus.active}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-gray-400" />
                      <span className="text-sm text-content-secondary">Inactive</span>
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {dashboardData.restaurantStatus.inactive}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-orange-500" />
                      <span className="text-sm text-content-secondary">Pending</span>
                    </div>
                    <span className="text-sm font-semibold text-content-primary">
                      {dashboardData.restaurantStatus.pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-red-500" />
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
    </ProtectedRoute>
  );
}