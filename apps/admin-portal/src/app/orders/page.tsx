'use client';

import { useState, useMemo, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@tabsy/ui-components';
import {
  ShoppingBag,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Download,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Truck,
  ChefHat,
  Store,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  CreditCard,
  Receipt
} from 'lucide-react';
import { useOrders, useOrderMetrics } from '@/hooks/api';
import { formatDistanceToNow, format } from 'date-fns';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import { Order, OrderStatus } from '@tabsy/shared-types';
// WebSocket imports removed to eliminate duplicate order event handling
import { useAuth } from '@tabsy/ui-components';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Status Badge Component
function StatusBadge({ status }: { status: OrderStatus }) {
  const statusConfig = {
    RECEIVED: { color: 'badge-warning', icon: Clock, label: 'Received' },
    PREPARING: { color: 'badge-info', icon: ChefHat, label: 'Preparing' },
    READY: { color: 'badge-success', icon: Package, label: 'Ready' },
    DELIVERED: { color: 'badge-success', icon: Truck, label: 'Delivered' },
    COMPLETED: { color: 'badge-success', icon: CheckCircle, label: 'Completed' },
    CANCELLED: { color: 'badge-error', icon: XCircle, label: 'Cancelled' }
  };

  const config = statusConfig[status] || statusConfig.RECEIVED;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
}

export default function OrdersPage() {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('today');
  const [sortBy, setSortBy] = useState<'createdAt' | 'total' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const itemsPerPage = 10;

  const auth = useAuth();
  const queryClient = useQueryClient();

  // Fetch orders data with real-time updates
  const { data: ordersData, isLoading, refetch } = useOrders({
    search: searchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    restaurantId: restaurantFilter === 'all' ? undefined : restaurantFilter,
    dateRange: dateFilter,
    sortBy,
    sortOrder
  });

  const { data: metrics } = useOrderMetrics();

  // WebSocket connection removed - using standard API data fetching with manual/periodic refresh

  // WebSocket event handlers removed to eliminate duplicate order event handling
  // Admin orders page now relies on standard API data fetching with manual/periodic refresh


  // Calculate pagination
  const totalPages = Math.ceil((ordersData?.length || 0) / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    if (!ordersData) return [];
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return ordersData.slice(start, end);
  }, [ordersData, currentPage]);

  // Get unique restaurants for filter
  const restaurants = useMemo(() => {
    if (!ordersData) return [];
    const uniqueRestaurantIds = new Set<string>();
    ordersData.forEach(order => {
      if (order.restaurantId) {
        uniqueRestaurantIds.add(order.restaurantId);
      }
    });
    // Return minimal restaurant objects for filtering
    return Array.from(uniqueRestaurantIds).map(id => ({ id, name: `Restaurant ${id.slice(-8)}` }));
  }, [ordersData]);

  // Handlers
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setActiveDropdown(null);
  };

  const handleExportOrders = () => {
    // TODO: Implement export functionality
    toast.success('Exporting orders...');
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
                  <ShoppingBag className="h-7 w-7 mr-3 text-primary" />
                  Order Management
                </h1>
                <p className="mt-1 text-sm text-content-secondary">
                  Monitor and manage all restaurant orders in real-time
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
                  onClick={handleExportOrders}
                  className="hover-lift"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12%
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics?.totalOrders || 0}
              </div>
              <p className="text-xs text-content-secondary mt-1">Total Orders Today</p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="text-xs font-medium text-orange-600">
                  {metrics?.pendingOrders || 0}
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics?.activeOrders || 0}
              </div>
              <p className="text-xs text-content-secondary mt-1">Active Orders</p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-xs text-blue-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8%
                </span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.totalRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Revenue Today</p>
            </div>

            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-xs text-purple-600">AOV</span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.averageOrderValue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Avg Order Value</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-lg shadow-card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-tertiary" />
                  <input
                    type="text"
                    placeholder="Search by order ID, customer, or restaurant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-tertiary rounded-lg input-professional focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="px-4 py-2 border border-border-tertiary rounded-lg input-professional"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 border border-border-tertiary rounded-lg input-professional"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {restaurants.length > 0 && (
                  <select
                    value={restaurantFilter}
                    onChange={(e) => setRestaurantFilter(e.target.value)}
                    className="px-4 py-2 border border-border-tertiary rounded-lg input-professional"
                  >
                    <option value="all">All Restaurants</option>
                    {restaurants.map((restaurant: any) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-border-tertiary rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Active Filters */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-border-tertiary">
              <div className="flex items-center gap-2">
                <span className="text-sm text-content-secondary">Quick Filters:</span>
                <button className="px-3 py-1 text-xs rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200">
                  Pending ({ordersData?.filter(o => o.status === OrderStatus.RECEIVED).length || 0})
                </button>
                <button className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200">
                  Preparing ({ordersData?.filter(o => o.status === OrderStatus.PREPARING).length || 0})
                </button>
                <button className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 hover:bg-green-200">
                  Ready ({ordersData?.filter(o => o.status === OrderStatus.READY).length || 0})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
          <div className="bg-surface rounded-lg shadow-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-content-secondary">Loading orders...</p>
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-content-tertiary" />
                <p className="text-content-secondary">No orders found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full table-professional">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Restaurant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-tertiary">
                      {paginatedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-surface-secondary transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 text-content-tertiary mr-2" />
                              <span className="text-sm font-medium text-content-primary">
                                #{order.id.slice(-8)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-content-tertiary mr-2" />
                              <div>
                                <p className="text-sm text-content-primary">
                                  Customer {order.customerId?.slice(-8) || 'Unknown'}
                                </p>
                                <p className="text-xs text-content-secondary">
                                  Table {order.tableId || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Store className="h-4 w-4 text-content-tertiary mr-2" />
                              <span className="text-sm text-content-primary">
                                Restaurant {order.restaurantId?.slice(-8) || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-content-primary">
                              {order.items?.length || 0} items
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm font-bold text-content-primary">
                                ${Number(order.total || 0).toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-content-secondary">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {order.createdAt ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }) : 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="relative">
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === order.id ? null : order.id)}
                                className="p-2 hover:bg-surface-secondary rounded-full transition-colors"
                              >
                                <MoreVertical className="h-4 w-4 text-content-tertiary" />
                              </button>
                              {activeDropdown === order.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-border-tertiary z-10">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleViewDetails(order)}
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      View Payment
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      <Receipt className="h-4 w-4 mr-2" />
                                      Download Invoice
                                    </button>
                                  </div>
                                </div>
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
                  <div className="px-6 py-3 flex items-center justify-between border-t border-border-tertiary">
                    <div className="text-sm text-content-secondary">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, ordersData?.length || 0)} of{' '}
                      {ordersData?.length || 0} orders
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-border-tertiary rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page =>
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        )
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-content-tertiary">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded-lg ${
                                page === currentPage
                                  ? 'bg-primary text-white'
                                  : 'hover:bg-surface-secondary'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-border-tertiary rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {showDetailsModal && selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedOrder(null);
            }}
            onUpdate={() => refetch()}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}