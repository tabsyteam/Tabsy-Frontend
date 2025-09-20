'use client';

import { useState } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Activity,
  Building,
  ShoppingBag,
  DollarSign,
  Edit,
  Key,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hash,
  Clock,
  MapPin,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { User as UserType, UserRole, Order, Restaurant } from '@tabsy/shared-types';
import { useUserOrders, useUserRestaurants, useUserMetrics, useUserActivity } from '@/hooks/api';
import { format, formatDistanceToNow } from 'date-fns';

interface UserDetailsModalProps {
  user: UserType;
  onClose: () => void;
  onEdit?: () => void;
}

export default function UserDetailsModal({
  user,
  onClose,
  onEdit
}: UserDetailsModalProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'orders' | 'security'>('overview');

  const { data: orders } = useUserOrders(user.id);
  const { data: restaurants } = useUserRestaurants(user.id);
  const { data: metrics } = useUserMetrics(user.id);
  const { data: activity } = useUserActivity(user.id);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  const getRoleBadge = (role: UserRole) => {
    const roleStyles = {
      [UserRole.ADMIN]: 'badge-error',
      [UserRole.RESTAURANT_OWNER]: 'badge-warning',
      [UserRole.RESTAURANT_STAFF]: 'badge-info',
      [UserRole.CUSTOMER]: 'badge-success'
    };

    const roleIcons = {
      [UserRole.ADMIN]: Shield,
      [UserRole.RESTAURANT_OWNER]: Building,
      [UserRole.RESTAURANT_STAFF]: User,
      [UserRole.CUSTOMER]: User
    };

    const Icon = roleIcons[role];

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleStyles[role]}`}>
        <Icon className="w-4 h-4 mr-1.5" />
        {role.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-modal animate-fadeIn">
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-5xl max-h-[90vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-tertiary bg-gradient-to-r from-primary-light/10 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-primary-light flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-content-primary">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center mt-1 space-x-3">
                {getRoleBadge(user.role)}
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
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="text-xs text-green-600">All Time</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              {metrics?.totalOrders || 0}
            </div>
            <p className="text-xs text-content-secondary mt-1">Total Orders</p>
          </div>

          <div className="bg-surface rounded-lg p-4 border border-border-tertiary">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-xs text-blue-600">Lifetime</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              ${metrics?.totalSpent?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-content-secondary mt-1">Total Spent</p>
          </div>

          <div className="bg-surface rounded-lg p-4 border border-border-tertiary">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs text-purple-600">Average</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              ${Number(metrics?.avgOrderValue || 0).toFixed(2)}
            </div>
            <p className="text-xs text-content-secondary mt-1">Avg Order Value</p>
          </div>

          <div className="bg-surface rounded-lg p-4 border border-border-tertiary">
            <div className="flex items-center justify-between mb-2">
              <Building className="h-5 w-5 text-primary" />
              <span className="text-xs text-orange-600">Managed</span>
            </div>
            <div className="text-2xl font-bold text-content-primary">
              {restaurants?.length || 0}
            </div>
            <p className="text-xs text-content-secondary mt-1">Restaurants</p>
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
                      <p className="text-sm text-content-secondary">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Phone</p>
                      <p className="text-sm text-content-secondary">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">Member Since</p>
                      <p className="text-sm text-content-secondary">
                        {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Hash className="h-5 w-5 text-content-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-content-primary">User ID</p>
                      <p className="text-sm text-content-secondary font-mono">{user.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Associated Restaurants */}
              {restaurants && restaurants.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-content-primary mb-4">Associated Restaurants</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {restaurants.map((restaurant: any) => (
                      <div key={restaurant.id} className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-content-primary">{restaurant.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            restaurant.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {restaurant.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-content-secondary">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {restaurant.city}, {restaurant.state}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {restaurant.phone}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="bg-surface-secondary rounded-lg p-4 border border-border-tertiary">
                <h3 className="text-sm font-medium text-content-primary mb-3">Login History</h3>
                {user.lastLoginAt ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-content-secondary">Last Login</span>
                      <span className="text-sm font-medium text-content-primary">
                        {formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-content-secondary">Login Count</span>
                      <span className="text-sm font-medium text-content-primary">0</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-content-secondary">No login activity recorded</p>
                )}
              </div>

              <div className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 text-content-tertiary" />
                <p className="text-sm text-content-secondary">No recent activity</p>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders && orders.length > 0 ? (
                orders.slice(0, 10).map((order: any) => (
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
                        <p className="font-bold text-content-primary">${order.total?.toFixed(2)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    {order.items && (
                      <div className="mt-2 pt-2 border-t border-border-tertiary">
                        <p className="text-xs text-content-secondary">
                          {order.items.length} items
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-content-tertiary" />
                  <p className="text-sm text-content-secondary">No orders found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-content-primary mb-4">Account Security</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-tertiary">
                    <div className="flex items-center space-x-3">
                      <Lock className="h-5 w-5 text-content-tertiary" />
                      <div>
                        <p className="text-sm font-medium text-content-primary">Password</p>
                        <p className="text-xs text-content-secondary">Last changed: Never</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Key className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-tertiary">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-content-tertiary" />
                      <div>
                        <p className="text-sm font-medium text-content-primary">Two-Factor Authentication</p>
                        <p className="text-xs text-content-secondary">Not enabled</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled>
                      Enable
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-tertiary">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-content-tertiary" />
                      <div>
                        <p className="text-sm font-medium text-content-primary">Active Sessions</p>
                        <p className="text-xs text-content-secondary">1 active session</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-content-primary mb-4">Permissions</h3>
                <div className="p-4 bg-surface-secondary rounded-lg border border-border-tertiary">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-content-primary">Current Role</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <p className="text-xs text-content-secondary">
                    This role determines what the user can access and modify within the system.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}