'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  DollarSign,
  Users,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Edit,
  Power,
  CreditCard,
  Hash,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Restaurant, Table, Order, OrderStatus, TableStatus } from '@tabsy/shared-types';
import { useRestaurantDetails, useRestaurantOrders, useRestaurantTables } from '@/hooks/api';
import { format } from 'date-fns';
import { useWebSocket, useWebSocketEvent } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';
import { useQueryClient } from '@tanstack/react-query';

interface RestaurantDetailsModalProps {
  restaurant: Restaurant;
  onClose: () => void;
  onEdit?: () => void;
}

export default function RestaurantDetailsModal({
  restaurant,
  onClose,
  onEdit
}: RestaurantDetailsModalProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'orders' | 'analytics'>('overview');
  const auth = useAuth();
  const queryClient = useQueryClient();

  const { data: details, isLoading: loadingDetails } = useRestaurantDetails(restaurant.id);
  const { data: orders } = useRestaurantOrders(restaurant.id);
  const { data: tables } = useRestaurantTables(restaurant.id);

  // WebSocket for real-time updates specific to this restaurant
  const ws = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5001',
    auth: {
      token: auth.session?.token,
      restaurantId: restaurant.id,
      namespace: 'restaurant' as const
    },
    onConnect: () => {
      console.log(`WebSocket connected for restaurant ${restaurant.id}`);
    },
    onError: (error: Error) => {
      console.error(`WebSocket error for restaurant ${restaurant.id}:`, error);
    }
  });

  // Set up real-time event listeners for this specific restaurant - COMPREHENSIVE RESTAURANT MONITORING

  // Order Events
  useWebSocketEvent(ws.client, 'order:created', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] }); // Refresh stats
  });

  useWebSocketEvent(ws.client, 'order:updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'orders'] });
  });

  useWebSocketEvent(ws.client, 'order:status_updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'orders'] });
  });

  // Table Events - Critical for Restaurant Management
  useWebSocketEvent(ws.client, 'table:status_updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'tables'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] }); // Refresh occupancy stats
  });

  useWebSocketEvent(ws.client, 'table:check_in', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'tables'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] }); // Refresh stats
  });

  useWebSocketEvent(ws.client, 'table:check_out', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'tables'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] }); // Refresh stats
  });

  // Session Events - Important for Table Management
  useWebSocketEvent(ws.client, 'session:updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'sessions'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'tables'] });
  });

  useWebSocketEvent(ws.client, 'session:expired', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'sessions'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'tables'] });
  });

  // Payment Events - Important for Restaurant Revenue Tracking
  useWebSocketEvent(ws.client, 'payment:completed', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'payments'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] }); // Refresh revenue stats
  });

  useWebSocketEvent(ws.client, 'payment:failed', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'payments'] });
  });

  useWebSocketEvent(ws.client, 'payment:refunded', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'payments'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] }); // Refresh revenue stats
  });

  // Kitchen Events - Restaurant Operations
  useWebSocketEvent(ws.client, 'kitchen:new-order', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'kitchen'] });
  });

  useWebSocketEvent(ws.client, 'kitchen:order-ready', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'kitchen'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'orders'] });
  });

  useWebSocketEvent(ws.client, 'kitchen:order-cancelled', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'kitchen'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'orders'] });
  });

  // Menu Events
  useWebSocketEvent(ws.client, 'menu:updated', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'menu'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] });
  });

  // Analytics Events - Restaurant Performance
  useWebSocketEvent(ws.client, 'analytics:update', (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id, 'analytics'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurant.id] }); // Refresh overview stats
  });

  // Calculate statistics
  const stats = {
    totalRevenue: orders?.reduce((sum: number, order: Order) => sum + Number(order.total || 0), 0) || 0,
    totalOrders: orders?.length || 0,
    activeOrders: orders?.filter((o: Order) => [OrderStatus.RECEIVED, OrderStatus.PREPARING].includes(o.status)).length || 0,
    completedOrders: orders?.filter((o: Order) => o.status === OrderStatus.DELIVERED).length || 0,
    totalTables: tables?.length || 0,
    occupiedTables: tables?.filter((t: Table) => t.status === TableStatus.OCCUPIED).length || 0,
    averageOrderValue: orders?.length ? (orders.reduce((sum: number, o: Order) => sum + Number(o.total || 0), 0) / orders.length) : 0
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Store },
    { id: 'tables', label: 'Tables', icon: Users },
    { id: 'orders', label: 'Recent Orders', icon: ShoppingBag },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-modal animate-fadeIn">
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-6xl max-h-[90vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-tertiary bg-gradient-to-r from-primary-light/10 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-light rounded-lg">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-content-primary">{restaurant.name}</h2>
              <div className="flex items-center mt-1 space-x-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  restaurant.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <Power className="h-3 w-3 mr-1" />
                  {restaurant.active ? 'Active' : 'Inactive'}
                </span>
                {restaurant.cuisine && (
                  <span className="text-sm text-content-secondary">{restaurant.cuisine}</span>
                )}
                <div className="flex items-center">
                  {ws.isConnected ? (
                    <><Wifi className="h-3 w-3 text-green-500 mr-1" /><span className="text-xs text-green-600">Online</span></>
                  ) : (
                    <><WifiOff className="h-3 w-3 text-red-500 mr-1" /><span className="text-xs text-red-600">Offline</span></>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="hover-lift"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-secondary rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-content-secondary" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-surface-secondary/50">
          <div className="bg-surface rounded-lg p-4 border border-border-tertiary">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-xs text-green-600">+12%</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              ${stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-content-secondary mt-1">Total Revenue</p>
          </div>

          <div className="bg-surface rounded-lg p-4 border border-border-tertiary">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="text-xs text-orange-600">{stats.activeOrders} active</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              {stats.totalOrders}
            </div>
            <p className="text-xs text-content-secondary mt-1">Total Orders</p>
          </div>

          <div className="bg-surface rounded-lg p-4 border border-border-tertiary">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs text-blue-600">{stats.occupiedTables}/{stats.totalTables}</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              {Math.round((stats.occupiedTables / (stats.totalTables || 1)) * 100)}%
            </div>
            <p className="text-xs text-content-secondary mt-1">Occupancy</p>
          </div>

          <div className="bg-surface rounded-lg p-4 border border-border-tertiary">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs text-purple-600">AOV</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              ${stats.averageOrderValue.toFixed(2)}
            </div>
            <p className="text-xs text-content-secondary mt-1">Avg Order Value</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border-tertiary">
          <nav className="flex space-x-8 px-6">
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

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-content-primary mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Email</p>
                      <p className="text-sm text-content-secondary">{restaurant.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Phone</p>
                      <p className="text-sm text-content-secondary">{restaurant.phoneNumber || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Globe className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Website</p>
                      <p className="text-sm text-content-secondary">
                        {restaurant.website ? (
                          <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {restaurant.website}
                          </a>
                        ) : 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Address</p>
                      <p className="text-sm text-content-secondary">{restaurant.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-medium text-content-primary mb-4">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Opening Hours</p>
                      <p className="text-sm text-content-secondary">
                        {typeof restaurant.openingHours === 'string'
                          ? restaurant.openingHours
                          : '9:00 AM - 9:00 PM'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CreditCard className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">POS System</p>
                      <p className="text-sm text-content-secondary">
                        {restaurant.posEnabled ? (
                          <span className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            Enabled
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <AlertCircle className="h-4 w-4 text-gray-400 mr-1" />
                            Not configured
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Created</p>
                      <p className="text-sm text-content-secondary">
                        {restaurant.createdAt ? format(new Date(restaurant.createdAt), 'PPP') : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Hash className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Restaurant ID</p>
                      <p className="text-sm text-content-secondary font-mono">{restaurant.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {restaurant.description && (
                <div>
                  <h3 className="text-lg font-medium text-content-primary mb-4">Description</h3>
                  <p className="text-sm text-content-secondary leading-relaxed">{restaurant.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tables' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables && tables.length > 0 ? (
                  tables.map((table: Table) => (
                    <div key={table.id} className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-content-primary">Table {table.id}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          table.status === TableStatus.OCCUPIED ? 'bg-red-100 text-red-800' :
                          table.status === TableStatus.RESERVED ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {table.status === TableStatus.OCCUPIED ? 'Occupied' : table.status === TableStatus.RESERVED ? 'Reserved' : 'Available'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-content-secondary">Status: {table.status === TableStatus.OCCUPIED ? 'Occupied' : table.status === TableStatus.RESERVED ? 'Reserved' : 'Available'}</p>
                        {table.qrCode && (
                          <p className="text-sm text-content-secondary font-mono">QR: {table.qrCode}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-content-secondary col-span-full text-center py-8">No tables configured</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders && orders.length > 0 ? (
                orders.slice(0, 10).map((order: Order) => (
                  <div key={order.id} className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <ShoppingBag className="h-5 w-5 text-content-tertiary" />
                        <div>
                          <p className="font-medium text-content-primary">Order #{order.id.slice(-8)}</p>
                          <p className="text-xs text-content-secondary">
                            {order.createdAt ? format(new Date(order.createdAt), 'PPp') : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-content-primary">${Number(order.total || 0).toFixed(2)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-800' :
                          order.status === OrderStatus.PREPARING ? 'bg-blue-100 text-blue-800' :
                          order.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-content-secondary text-center py-8">No orders yet</p>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-surface-secondary rounded-lg p-6 border border-border-tertiary">
                <h3 className="text-lg font-medium text-content-primary mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-content-secondary">Completion Rate</p>
                    <p className="text-2xl font-bold text-content-primary">
                      {stats.totalOrders ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Active Orders</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.activeOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Table Turnover</p>
                    <p className="text-2xl font-bold text-content-primary">2.3x</p>
                  </div>
                  <div>
                    <p className="text-sm text-content-secondary">Avg Wait Time</p>
                    <p className="text-2xl font-bold text-content-primary">18 min</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-secondary rounded-lg p-6 border border-border-tertiary">
                <h3 className="text-lg font-medium text-content-primary mb-4">Revenue Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-secondary">Food Sales</span>
                    <span className="font-medium text-content-primary">68%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-secondary">Beverage Sales</span>
                    <span className="font-medium text-content-primary">22%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content-secondary">Other</span>
                    <span className="font-medium text-content-primary">10%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}