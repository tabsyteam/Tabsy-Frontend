'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tabsy/ui-components';
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
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'total' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; shouldFlipUp: boolean } | null>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const itemsPerPage = 10;

  const auth = useAuth();
  const queryClient = useQueryClient();

  // Fetch orders data with real-time updates
  const { data: ordersData, isLoading, refetch, error } = useOrders({
    search: searchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    restaurantId: restaurantFilter === 'all' ? undefined : restaurantFilter,
    dateRange: dateFilter,
    sortBy,
    sortOrder
  });

  const { data: metrics } = useOrderMetrics(dateFilter);

  // Debug logging
  console.log('Orders Page Debug:', {
    ordersData,
    ordersDataLength: ordersData?.length,
    isLoading,
    error,
    dateFilter,
    statusFilter
  });

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

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (!dropdownButtonRef.current) return null;

    const buttonRect = dropdownButtonRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const dropdownHeight = 140; // Approximate height of 3 items

    // Check if there's enough space below
    const spaceBelow = windowHeight - buttonRect.bottom;
    const shouldFlipUp = spaceBelow < dropdownHeight && buttonRect.top > dropdownHeight;

    return {
      top: shouldFlipUp ? buttonRect.top - 8 : buttonRect.bottom + 8,
      right: window.innerWidth - buttonRect.right,
      shouldFlipUp
    };
  }, []);

  // Update dropdown position on scroll
  const updateDropdownPosition = useCallback(() => {
    if (activeDropdown && dropdownButtonRef.current) {
      const newPosition = calculateDropdownPosition();
      if (newPosition) {
        setDropdownPosition(newPosition);
      }
    }
  }, [activeDropdown, calculateDropdownPosition]);

  // Handle dropdown toggle
  const handleToggleDropdown = useCallback((orderId: string, buttonElement: HTMLButtonElement) => {
    if (activeDropdown === orderId) {
      setActiveDropdown(null);
      setDropdownPosition(null);
      dropdownButtonRef.current = null;
    } else {
      dropdownButtonRef.current = buttonElement;
      setActiveDropdown(orderId);

      const position = calculateDropdownPosition();
      if (position) {
        setDropdownPosition(position);
      }
    }
  }, [activeDropdown, calculateDropdownPosition]);

  // Listen for scroll to update position
  useEffect(() => {
    if (activeDropdown) {
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);

      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [activeDropdown, updateDropdownPosition]);

  // Handlers
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setActiveDropdown(null);
    setDropdownPosition(null);
  };

  const handleExportOrders = () => {
    if (!ordersData || ordersData.length === 0) {
      toast.error('No orders to export');
      return;
    }

    try {
      // Prepare CSV data
      const headers = [
        'Order ID',
        'Order Number',
        'Customer',
        'Email',
        'Phone',
        'Restaurant',
        'Table',
        'Items',
        'Subtotal',
        'Tax',
        'Tip',
        'Total',
        'Status',
        'Created At',
        'Special Instructions'
      ];

      const csvRows = [
        headers.join(','),
        ...ordersData.map(order => {
          const itemsCount = order.items?.length || 0;
          const itemsList = order.items?.map(item => `${item.quantity}x ${item.menuItem?.name}`).join('; ') || '';

          return [
            `"${order.id}"`,
            `"${order.orderNumber || ''}"`,
            `"${order.customerName || 'Guest'}"`,
            `"${order.customerEmail || ''}"`,
            `"${order.customerPhone || ''}"`,
            `"${order.restaurant?.name || order.restaurantId}"`,
            `"${order.table?.tableNumber || order.tableId || ''}"`,
            `"${itemsCount} items: ${itemsList}"`,
            `"$${Number(order.subtotal || 0).toFixed(2)}"`,
            `"$${Number(order.tax || 0).toFixed(2)}"`,
            `"$${Number(order.tip || 0).toFixed(2)}"`,
            `"$${Number(order.total || 0).toFixed(2)}"`,
            `"${order.status}"`,
            `"${order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss') : ''}"`,
            `"${order.specialInstructions || ''}"`
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `orders-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${ordersData.length} orders successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Orders' }
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout breadcrumbs={breadcrumbs}>
        {/* Header Actions */}
        <div className="px-6 py-4 bg-surface border-b border-border-default">
          <div className="flex items-center justify-between">
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

        {/* Metrics Cards */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface rounded-lg shadow-card p-4 border border-border-tertiary">
              <div className="flex items-center justify-between mb-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="text-xs text-status-success flex items-center">
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
                <Clock className="h-5 w-5 text-status-warning" />
                <span className="text-xs font-medium text-status-warning">
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
                <DollarSign className="h-5 w-5 text-status-success" />
                <span className="text-xs text-status-info flex items-center">
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
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-xs text-primary">AOV</span>
              </div>
              <div className="text-2xl font-bold text-content-primary">
                ${metrics?.averageOrderValue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-content-secondary mt-1">Avg Order Value</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-6">
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
                <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="PREPARING">Preparing</SelectItem>
                    <SelectItem value="READY">Ready</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {restaurants.length > 0 && (
                  <Select value={restaurantFilter} onValueChange={(value) => setRestaurantFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Restaurants</SelectItem>
                      {restaurants.map((restaurant: any) => (
                        <SelectItem key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <button
                  onClick={() => setStatusFilter(OrderStatus.RECEIVED)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    statusFilter === OrderStatus.RECEIVED
                      ? 'bg-status-warning text-status-warning-foreground'
                      : 'bg-status-warning-light text-status-warning-dark hover:bg-status-warning hover:text-white'
                  }`}
                >
                  Pending ({ordersData?.filter(o => o.status === OrderStatus.RECEIVED).length || 0})
                </button>
                <button
                  onClick={() => setStatusFilter(OrderStatus.PREPARING)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    statusFilter === OrderStatus.PREPARING
                      ? 'bg-status-info text-status-info-foreground'
                      : 'bg-status-info-light text-status-info-dark hover:bg-status-info hover:text-white'
                  }`}
                >
                  Preparing ({ordersData?.filter(o => o.status === OrderStatus.PREPARING).length || 0})
                </button>
                <button
                  onClick={() => setStatusFilter(OrderStatus.READY)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    statusFilter === OrderStatus.READY
                      ? 'bg-status-success text-status-success-foreground'
                      : 'bg-status-success-light text-status-success-dark hover:bg-status-success hover:text-white'
                  }`}
                >
                  Ready ({ordersData?.filter(o => o.status === OrderStatus.READY).length || 0})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="px-6 py-6 pb-8">
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
                      {paginatedOrders.map((order, index) => (
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
                                  {order.customerName || order.customerEmail || `Guest ${order.guestSessionId?.slice(-8)}` || 'Unknown'}
                                </p>
                                <p className="text-xs text-content-secondary">
                                  Table {order.table?.tableNumber || order.tableId || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Store className="h-4 w-4 text-content-tertiary mr-2" />
                              <span className="text-sm text-content-primary">
                                {order.restaurant?.name || `Restaurant ${order.restaurantId?.slice(-8)}` || 'Unknown'}
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
                              <DollarSign className="h-4 w-4 text-status-success mr-1" />
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
                            <button
                              onClick={(e) => handleToggleDropdown(order.id, e.currentTarget)}
                              className="p-2 hover:bg-surface-secondary rounded-full transition-colors"
                            >
                              <MoreVertical className="h-4 w-4 text-content-tertiary" />
                            </button>
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

        {/* Dropdown Menu - Fixed positioning outside table */}
        {activeDropdown && dropdownPosition && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setActiveDropdown(null);
                setDropdownPosition(null);
              }}
            />
            {/* Dropdown */}
            <div
              className={`fixed w-48 bg-surface rounded-lg shadow-dropdown border border-border-tertiary z-50 animate-fadeIn ${
                dropdownPosition.shouldFlipUp ? 'origin-bottom' : 'origin-top'
              }`}
              style={{
                top: dropdownPosition.shouldFlipUp ? 'auto' : `${dropdownPosition.top}px`,
                bottom: dropdownPosition.shouldFlipUp ? `${window.innerHeight - dropdownPosition.top}px` : 'auto',
                right: `${dropdownPosition.right}px`
              }}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    const order = paginatedOrders.find(o => o.id === activeDropdown);
                    if (order) handleViewDetails(order);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    setDropdownPosition(null);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left transition-colors"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Payment
                </button>
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    setDropdownPosition(null);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left transition-colors"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Download Invoice
                </button>
              </div>
            </div>
          </>
        )}

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
      </DashboardLayout>
    </ProtectedRoute>
  );
}