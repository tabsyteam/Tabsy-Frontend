"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button, useAuth } from "@tabsy/ui-components";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  User
} from "lucide-react";
import { User as UserType } from '@tabsy/shared-types';
import {
  DynamicUserGrowthChart,
  DynamicUserStatusChart
} from "../../components/charts";

const platformMetrics = [
  { month: "Jan", revenue: 45000, users: 1200, restaurants: 85 },
  { month: "Feb", revenue: 52000, users: 1450, restaurants: 95 },
  { month: "Mar", revenue: 48000, users: 1380, restaurants: 92 },
  { month: "Apr", revenue: 61000, users: 1650, restaurants: 108 },
  { month: "May", revenue: 58000, users: 1580, restaurants: 105 },
  { month: "Jun", revenue: 67000, users: 1820, restaurants: 118 },
];

const restaurantDistribution = [
  { name: "Active", value: 118, color: "#10b981" },
  { name: "Pending", value: 23, color: "#f59e0b" },
  { name: "Suspended", value: 8, color: "#ef4444" },
];

export default function AdminDashboard(): JSX.Element {
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user as UserType | null;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-theme-gradient">
        {/* Header */}
        <header className="bg-theme-surface border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-theme-text-primary">Admin Portal</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-theme-success">
                  System Healthy
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Alerts
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                
                {/* User Info and Logout */}
                <div className="flex items-center space-x-3 pl-4 border-l border-theme-border">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-theme-primary rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-theme-surface" />
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-theme-text-primary">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-theme-text-secondary">{user?.role}</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-theme-surface rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 icon-theme-success" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-secondary">Total Revenue</p>
                  <p className="text-2xl font-bold text-theme-text-primary">$331K</p>
                  <p className="text-sm text-theme-primary">+12.5% from last month</p>
                </div>
              </div>
            </div>

            <div className="bg-theme-surface rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Store className="h-8 w-8 icon-theme-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-secondary">Restaurants</p>
                  <p className="text-2xl font-bold text-theme-text-primary">149</p>
                  <p className="text-sm text-theme-primary">118 active</p>
                </div>
              </div>
            </div>

            <div className="bg-theme-surface rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 icon-theme-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-secondary">Total Users</p>
                  <p className="text-2xl font-bold text-theme-text-primary">9.2K</p>
                  <p className="text-sm text-theme-secondary">1,820 this month</p>
                </div>
              </div>
            </div>

            <div className="bg-theme-surface rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-8 w-8 icon-theme-warning" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-secondary">System Load</p>
                  <p className="text-2xl font-bold text-theme-text-primary">73%</p>
                  <p className="text-sm text-theme-warning">Normal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Platform Growth Chart */}
            <div className="lg:col-span-2 bg-theme-surface rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-theme-text-primary mb-4">Platform Growth</h3>
              <DynamicUserGrowthChart />
            </div>

            {/* Restaurant Status */}
            <div className="bg-theme-surface rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-theme-text-primary mb-4">Restaurant Status</h3>
              <DynamicUserStatusChart />
              <div className="mt-4 space-y-2">
                {restaurantDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-theme-text-secondary">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-theme-text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Management Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="bg-theme-surface rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-theme-text-primary mb-4">User Management</h3>
              <div className="space-y-4">
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  User Permissions
                </Button>
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  User Activity
                </Button>
              </div>
            </div>

            <div className="bg-theme-surface rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-theme-text-primary mb-4">Restaurant Management</h3>
              <div className="space-y-4">
                <Button 
                  className="w-full justify-start btn-theme-outline" 
                  variant="outline"
                  onClick={() => router.push('/restaurants')}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Manage Restaurants
                </Button>
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance Analytics
                </Button>
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Restaurant Settings
                </Button>
              </div>
            </div>

            <div className="bg-theme-surface rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-theme-text-primary mb-4">System Administration</h3>
              <div className="space-y-4">
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <Globe className="h-4 w-4 mr-2" />
                  Platform Settings
                </Button>
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  System Analytics
                </Button>
                <Button className="w-full justify-start btn-theme-outline" variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  System Health
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-theme-surface rounded-lg shadow">
            <div className="px-6 py-4 border-b border-theme-border">
              <h3 className="text-lg font-medium text-theme-text-primary">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-theme-border" />
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-theme-success flex items-center justify-center ring-8 ring-white">
                            <Store className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-theme-text-secondary">
                              New restaurant <span className="font-medium text-theme-text-primary">Bella Vista</span> registered
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-theme-text-muted">
                            <time>2 hours ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-theme-border" />
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-theme-primary flex items-center justify-center ring-8 ring-white">
                            <Users className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-theme-text-secondary">
                              System processed <span className="font-medium text-theme-text-primary">1,247 orders</span> today
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-theme-text-muted">
                            <time>4 hours ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="relative">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-theme-warning flex items-center justify-center ring-8 ring-white">
                            <AlertTriangle className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-theme-text-secondary">
                              System maintenance completed successfully
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-theme-text-muted">
                            <time>6 hours ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}