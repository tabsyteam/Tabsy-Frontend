'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@tabsy/ui-components';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Store,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Package,
  CreditCard,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  Target,
  Award,
  Zap,
  Eye
} from 'lucide-react';
import { useAnalytics, useOrderMetrics, usePaymentMetrics, useAnalyticsRestaurantMetrics } from '@/hooks/api';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
  subtitle
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}) {
  const trendColor = trend === 'up' ? 'text-status-success' : trend === 'down' ? 'text-status-error' : 'text-content-secondary';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  return (
    <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary-light rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {change !== undefined && TrendIcon && (
          <div className={`flex items-center ${trendColor}`}>
            <TrendIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-content-primary">{value}</p>
        <p className="text-sm text-content-secondary mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-content-tertiary mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Chart Component (placeholder - would integrate Chart.js or Recharts)
function ChartContainer({ title, type, children }: { title: string; type: 'bar' | 'line' | 'pie' | 'area'; children?: React.ReactNode }) {
  const ChartIcon = type === 'bar' ? BarChart3 : type === 'pie' ? PieChart : Activity;

  return (
    <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-content-primary flex items-center">
          <ChartIcon className="h-5 w-5 mr-2 text-primary" />
          {title}
        </h3>
        <button className="text-sm text-primary hover:text-primary-dark">
          View Details
        </button>
      </div>
      <div className="h-64 flex items-center justify-center bg-surface-secondary rounded-lg">
        {children || (
          <div className="text-center">
            <ChartIcon className="h-12 w-12 mx-auto mb-3 text-content-tertiary" />
            <p className="text-sm text-content-secondary">Chart visualization would go here</p>
            <p className="text-xs text-content-tertiary mt-1">Integrate Chart.js or Recharts</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders' | 'customers' | 'restaurants'>('revenue');

  // Fetch analytics data
  const { data: analytics, isLoading, refetch } = useAnalytics(dateRange);
  const { data: orderMetrics } = useOrderMetrics();
  const { data: paymentMetrics } = usePaymentMetrics();

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!analytics) return null;

    return {
      revenue: {
        total: analytics.revenue?.total || 0,
        change: analytics.revenue?.changePercent || 0,
        trend: (analytics.revenue?.changePercent || 0) >= 0 ? 'up' : 'down' as const
      },
      orders: {
        total: analytics.orders?.total || 0,
        change: analytics.orders?.changePercent || 0,
        trend: (analytics.orders?.changePercent || 0) >= 0 ? 'up' : 'down' as const,
        averageValue: analytics.orders?.averageValue || 0
      },
      customers: {
        total: analytics.customers?.total || 0,
        new: analytics.customers?.new || 0,
        returning: analytics.customers?.returning || 0,
        change: analytics.customers?.changePercent || 0
      },
      restaurants: {
        total: analytics.restaurants?.total || 0,
        active: analytics.restaurants?.active || 0,
        newThisMonth: analytics.restaurants?.new || 0
      }
    };
  }, [analytics]);

  const handleExportReport = () => {
    toast.success('Generating analytics report...');
    // TODO: Implement CSV/PDF export
  };

  const handleScheduleReport = () => {
    toast.info('Report scheduling feature coming soon');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-surface border-b border-border-tertiary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-content-primary flex items-center">
                  <TrendingUp className="h-7 w-7 mr-3 text-primary" />
                  Analytics & Reports
                </h1>
                <p className="mt-1 text-sm text-content-secondary">
                  Comprehensive insights and performance metrics
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScheduleReport}
                  className="hover-lift"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
                <Button
                  onClick={handleExportReport}
                  className="btn-professional hover-lift"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-surface rounded-lg shadow-card p-4 flex items-center justify-between">
            <div className="flex gap-2">
              {(['today', 'week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-primary text-white'
                      : 'bg-surface-secondary text-content-secondary hover:bg-surface-tertiary'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center text-sm text-content-secondary">
              <Calendar className="h-4 w-4 mr-2" />
              {dateRange === 'today' && format(new Date(), 'PPP')}
              {dateRange === 'week' && `${format(startOfWeek(new Date()), 'PP')} - ${format(endOfWeek(new Date()), 'PP')}`}
              {dateRange === 'month' && format(new Date(), 'MMMM yyyy')}
              {dateRange === 'year' && format(new Date(), 'yyyy')}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`$${metrics?.revenue.total.toLocaleString() || '0'}`}
              change={metrics?.revenue.change}
              trend={metrics?.revenue.trend as 'up' | 'down' | 'neutral'}
              icon={DollarSign}
              subtitle={`${dateRange === 'today' ? 'Today' : `This ${dateRange}`}`}
            />
            <MetricCard
              title="Total Orders"
              value={metrics?.orders.total.toLocaleString() || '0'}
              change={metrics?.orders.change}
              trend={metrics?.orders.trend as 'up' | 'down' | 'neutral'}
              icon={ShoppingBag}
              subtitle={`Avg: $${metrics?.orders.averageValue.toFixed(2) || '0'}`}
            />
            <MetricCard
              title="Active Customers"
              value={metrics?.customers.total.toLocaleString() || '0'}
              change={metrics?.customers.change}
              trend="up"
              icon={Users}
              subtitle={`${metrics?.customers.new || 0} new this ${dateRange}`}
            />
            <MetricCard
              title="Active Restaurants"
              value={metrics?.restaurants.active || '0'}
              icon={Store}
              subtitle={`${metrics?.restaurants.total || 0} total`}
            />
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
            <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-primary" />
              Key Performance Indicators
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-status-success">
                  {orderMetrics?.completionRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-content-secondary mt-1">Order Completion</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-status-info">
                  {paymentMetrics?.successRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-content-secondary mt-1">Payment Success</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analytics?.customerRetention?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-content-secondary mt-1">Retention Rate</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-status-warning">
                  {analytics?.averageRating?.toFixed(1) || 0}
                </div>
                <p className="text-xs text-content-secondary mt-1">Avg Rating</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analytics?.peakHour || 0}:00
                </div>
                <p className="text-xs text-content-secondary mt-1">Peak Hour</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analytics?.avgWaitTime || 0}m
                </div>
                <p className="text-xs text-content-secondary mt-1">Avg Wait Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <ChartContainer title="Revenue Trend" type="area">
              <div className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-primary" />
                <p className="text-sm text-content-primary font-medium">Revenue is trending up</p>
                <p className="text-xs text-content-secondary mt-1">+15% compared to last {dateRange}</p>
              </div>
            </ChartContainer>

            {/* Order Distribution */}
            <ChartContainer title="Order Distribution" type="pie">
              <div className="p-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-status-success rounded-full mr-2"></div>
                      <span className="text-sm text-content-secondary">Completed</span>
                    </div>
                    <span className="text-sm font-medium text-content-primary">
                      {orderMetrics?.completedOrders || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-status-warning rounded-full mr-2"></div>
                      <span className="text-sm text-content-secondary">Pending</span>
                    </div>
                    <span className="text-sm font-medium text-content-primary">
                      {orderMetrics?.pendingOrders || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-status-error rounded-full mr-2"></div>
                      <span className="text-sm text-content-secondary">Cancelled</span>
                    </div>
                    <span className="text-sm font-medium text-content-primary">
                      {orderMetrics?.cancelledOrders || 0}
                    </span>
                  </div>
                </div>
              </div>
            </ChartContainer>

            {/* Top Restaurants */}
            <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
              <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2 text-primary" />
                Top Performing Restaurants
              </h3>
              <div className="space-y-3">
                {analytics?.topRestaurants?.slice(0, 5).map((restaurant: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-content-primary">{restaurant.name}</p>
                        <p className="text-xs text-content-secondary">{restaurant.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">${restaurant.revenue}</p>
                      <p className="text-xs text-status-success">+{restaurant.growth}%</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4">
                    <Store className="h-8 w-8 mx-auto mb-2 text-content-tertiary" />
                    <p className="text-sm text-content-secondary">No data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Popular Items */}
            <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
              <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-primary" />
                Popular Menu Items
              </h3>
              <div className="space-y-3">
                {orderMetrics?.popularItems?.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="w-8 h-8 rounded bg-status-warning-light flex items-center justify-center mr-3">
                        <Package className="h-4 w-4 text-status-warning" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-content-primary">{item.name}</p>
                        <div className="flex items-center mt-1">
                          <div className="flex-1 bg-surface-secondary rounded-full h-2 mr-2">
                            <div
                              className="bg-status-warning h-2 rounded-full"
                              style={{ width: `${(item.count / (orderMetrics?.popularItems?.[0]?.count || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-content-primary ml-3">
                      {item.count}
                    </span>
                  </div>
                )) || (
                  <div className="text-center py-4">
                    <Package className="h-8 w-8 mx-auto mb-2 text-content-tertiary" />
                    <p className="text-sm text-content-secondary">No data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Payment Methods */}
            <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
              <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-primary" />
                Payment Methods
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 text-status-info mr-2" />
                    <span className="text-sm text-content-secondary">Card</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-content-primary mr-2">
                      {paymentMetrics?.methodBreakdown?.card || 0}%
                    </span>
                    <div className="w-24 bg-surface-secondary rounded-full h-2">
                      <div
                        className="bg-status-info h-2 rounded-full"
                        style={{ width: `${paymentMetrics?.methodBreakdown?.card || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-status-success mr-2" />
                    <span className="text-sm text-content-secondary">Cash</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-content-primary mr-2">
                      {paymentMetrics?.methodBreakdown?.cash || 0}%
                    </span>
                    <div className="w-24 bg-surface-secondary rounded-full h-2">
                      <div
                        className="bg-status-success h-2 rounded-full"
                        style={{ width: `${paymentMetrics?.methodBreakdown?.cash || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Segments */}
            <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
              <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                Customer Segments
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-content-secondary">New Customers</span>
                  <span className="text-sm font-medium text-content-primary">
                    {metrics?.customers.new || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-content-secondary">Returning</span>
                  <span className="text-sm font-medium text-content-primary">
                    {metrics?.customers.returning || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-content-secondary">VIP Members</span>
                  <span className="text-sm font-medium text-content-primary">
                    {analytics?.vipCustomers || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-surface rounded-lg shadow-card p-6 border border-border-tertiary">
              <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Quick Reports
              </h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors flex items-center justify-between group">
                  <span className="text-sm text-content-primary">Daily Sales Report</span>
                  <Download className="h-4 w-4 text-content-tertiary group-hover:text-primary" />
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors flex items-center justify-between group">
                  <span className="text-sm text-content-primary">Monthly Revenue</span>
                  <Download className="h-4 w-4 text-content-tertiary group-hover:text-primary" />
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors flex items-center justify-between group">
                  <span className="text-sm text-content-primary">Customer Report</span>
                  <Download className="h-4 w-4 text-content-tertiary group-hover:text-primary" />
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors flex items-center justify-between group">
                  <span className="text-sm text-content-primary">Tax Report</span>
                  <Download className="h-4 w-4 text-content-tertiary group-hover:text-primary" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}