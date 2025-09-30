'use client'

import { useState } from 'react'
import {
  LayoutDashboard, Users, Building, BarChart3,
  Settings, Bell, Search, Menu, X, LogOut,
  User, Shield, Activity
} from 'lucide-react'
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard'
import { RestaurantManagement } from '../restaurants/RestaurantManagement'
import { UserManagement } from '../users/UserManagement'
import { SystemAdministration } from '../system/SystemAdministration'
import { SessionMonitoring } from '../sessions/SessionMonitoring'

type AdminSection = 'dashboard' | 'restaurants' | 'users' | 'analytics' | 'sessions' | 'system'

interface AdminLayoutProps {
  initialSection?: AdminSection
}

export function AdminLayout({ initialSection = 'dashboard' }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>(initialSection)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, href: '#' },
    { id: 'restaurants', name: 'Restaurants', icon: Building, href: '#' },
    { id: 'users', name: 'Users', icon: Users, href: '#' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, href: '#' },
    { id: 'sessions', name: 'Table Sessions', icon: Activity, href: '#' },
    { id: 'system', name: 'System', icon: Settings, href: '#' },
  ]

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />
      case 'restaurants':
        return (
          <RestaurantManagement 
            restaurants={[]} 
            loading={false} 
            onCreateNew={() => {}}
          />
        )
      case 'users':
        return (
          <UserManagement 
            users={[]} 
            loading={false} 
            onCreateNew={() => {}}
          />
        )
      case 'analytics':
        return <AnalyticsDashboard />
      case 'sessions':
        return <SessionMonitoring />
      case 'system':
        return <SystemAdministration />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-default">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-primary" />
            <span className="ml-2 text-xl font-bold text-content-primary">Tabsy Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6 text-content-tertiary" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = activeSection === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleSectionChange(item.id as AdminSection)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-content-primary hover:bg-interactive-hover'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-default">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-surface-tertiary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-content-secondary" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-content-primary">Admin User</p>
              <p className="text-xs text-content-tertiary">admin@tabsy.com</p>
            </div>
            <button className="text-content-tertiary hover:text-content-secondary">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-surface shadow-sm border-b border-default">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-4"
              >
                <Menu className="w-6 h-6 text-content-tertiary" />
              </button>

              <h1 className="text-xl font-semibold text-content-primary capitalize">
                {activeSection === 'dashboard' ? 'Dashboard' : activeSection}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-content-tertiary" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="block w-full pl-10 pr-3 py-2 border border-secondary rounded-md leading-5 bg-surface text-content-primary placeholder:text-content-disabled focus:outline-none focus:placeholder:text-content-tertiary focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-content-tertiary hover:text-content-secondary">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-status-error ring-2 ring-surface"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background-inverse bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

// Dashboard Home Component
function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">Welcome to Tabsy Admin</h1>
        <p className="text-content-secondary">Monitor and manage your restaurant ecosystem</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface p-6 rounded-lg border border-tertiary">
          <div className="flex items-center">
            <div className="p-2 bg-primary-light rounded-lg">
              <Building className="w-6 h-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-content-secondary">Total Restaurants</p>
              <p className="text-2xl font-bold text-content-primary">42</p>
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border border-tertiary">
          <div className="flex items-center">
            <div className="p-2 bg-status-success-light rounded-lg">
              <Users className="w-6 h-6 text-status-success-dark" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-content-secondary">Active Users</p>
              <p className="text-2xl font-bold text-content-primary">12,340</p>
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border border-tertiary">
          <div className="flex items-center">
            <div className="p-2 bg-accent-light rounded-lg">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-content-secondary">Monthly Revenue</p>
              <p className="text-2xl font-bold text-content-primary">$125K</p>
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg border border-tertiary">
          <div className="flex items-center">
            <div className="p-2 bg-secondary-light rounded-lg">
              <Settings className="w-6 h-6 text-secondary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-content-secondary">System Health</p>
              <p className="text-2xl font-bold text-status-success-dark">Healthy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface rounded-lg border border-tertiary">
        <div className="p-6 border-b border-default">
          <h3 className="text-lg font-semibold text-content-primary">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { action: 'New restaurant registered', details: 'Bella Italia - Downtown', time: '2 hours ago' },
              { action: 'Payment service updated', details: 'Version 2.1.3 deployed', time: '4 hours ago' },
              { action: 'User account suspended', details: 'john.doe@example.com - Terms violation', time: '6 hours ago' },
              { action: 'System backup completed', details: 'Daily backup successful', time: '1 day ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-content-primary">{activity.action}</p>
                  <p className="text-sm text-content-secondary">{activity.details}</p>
                </div>
                <span className="text-sm text-content-tertiary">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}