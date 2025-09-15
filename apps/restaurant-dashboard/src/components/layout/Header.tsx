'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@tabsy/ui-components'
import {
  Bell,
  Settings,
  LogOut,
  User,
  Menu as MenuIcon,
  X,
  Home,
  ShoppingCart,
  Utensils,
  ChevronDown,
  BarChart3,
  Users,
  Calendar,
  HelpCircle
} from 'lucide-react'
import { User as UserType } from '@tabsy/shared-types'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user: UserType | null
  restaurantName?: string
  currentView: 'overview' | 'orders' | 'menu'
  onViewChange: (view: 'overview' | 'orders' | 'menu') => void
  onLogout: () => void
  isLoggingOut?: boolean
}

interface NavItem {
  id: 'overview' | 'orders' | 'menu'
  label: string
  icon: React.ReactNode
  badge?: number
}

export function Header({
  user,
  restaurantName,
  currentView,
  onViewChange,
  onLogout,
  isLoggingOut = false
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationMenuRef = useRef<HTMLDivElement>(null)

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Close user menu if clicked outside
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }

      // Close notification menu if clicked outside
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }

    // Only add event listener if a menu is open
    if (isUserMenuOpen || isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isUserMenuOpen, isNotificationOpen])

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home className="w-4 h-4" />
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingCart className="w-4 h-4" />,
      badge: 3 // This could be dynamic based on pending orders
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: <Utensils className="w-4 h-4" />
    }
  ]

  const quickActions = [
    { icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics', action: () => {} },
    { icon: <Users className="w-4 h-4" />, label: 'Staff', action: () => {} },
    { icon: <Calendar className="w-4 h-4" />, label: 'Schedule', action: () => {} },
    { icon: <HelpCircle className="w-4 h-4" />, label: 'Help', action: () => {} }
  ]

  const getUserInitials = () => {
    if (!user) return 'U'
    const firstInitial = user.firstName?.[0] || ''
    const lastInitial = user.lastName?.[0] || ''
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'U'
  }

  const getUserRole = () => {
    if (!user?.role) return 'Staff'
    const roleMap: Record<string, string> = {
      'RESTAURANT_OWNER': 'Owner',
      'RESTAURANT_MANAGER': 'Manager',
      'RESTAURANT_STAFF': 'Staff',
      'ADMIN': 'Admin'
    }
    return roleMap[user.role] || user.role
  }

  return (
    <>
      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-screen-2xl mx-auto">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Section: Logo/Restaurant Name */}
              <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-surface-secondary transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5 text-content-primary" />
                  ) : (
                    <MenuIcon className="w-5 h-5 text-content-primary" />
                  )}
                </button>

                {/* Restaurant Branding */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-hover items-center justify-center shadow-md">
                    <Utensils className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-content-primary leading-tight">
                      {restaurantName || 'Restaurant'}
                    </h1>
                    <p className="hidden sm:block text-xs text-content-secondary">
                      Management Dashboard
                    </p>
                  </div>
                </div>
              </div>

              {/* Center Section: Main Navigation - Desktop Only */}
              <nav className="hidden lg:flex items-center gap-1 bg-surface-secondary rounded-lg p-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200",
                      "hover:bg-surface-tertiary",
                      currentView === item.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-content-secondary hover:text-content-primary"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                        currentView === item.id
                          ? "bg-white text-primary"
                          : "bg-accent text-white"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Right Section: Actions & User */}
              <div className="flex items-center gap-2">
                {/* Quick Actions - Desktop Only */}
                <div className="hidden xl:flex items-center gap-2">
                  {/* Notifications */}
                  <div className="relative" ref={notificationMenuRef}>
                    <button
                      onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                      className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors"
                      aria-label="Notifications"
                    >
                      <Bell className="w-5 h-5 text-content-secondary" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
                    </button>

                    {/* Notification Dropdown */}
                    {isNotificationOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-surface rounded-lg shadow-lg border border-border py-2 z-50">
                        <div className="px-4 py-2 border-b border-border">
                          <h3 className="font-semibold text-content-primary">Notifications</h3>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          <div className="px-4 py-3 hover:bg-surface-secondary transition-colors cursor-pointer">
                            <p className="text-sm text-content-primary">New order #1234 received</p>
                            <p className="text-xs text-content-tertiary mt-1">2 minutes ago</p>
                          </div>
                          <div className="px-4 py-3 hover:bg-surface-secondary transition-colors cursor-pointer">
                            <p className="text-sm text-content-primary">Table 5 is requesting service</p>
                            <p className="text-xs text-content-tertiary mt-1">5 minutes ago</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  <button
                    className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
                    aria-label="Settings"
                  >
                    <Settings className="w-5 h-5 text-content-secondary" />
                  </button>
                </div>

                {/* User Profile Section */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 sm:pr-3 rounded-lg hover:bg-surface-secondary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm shadow-md">
                      {getUserInitials()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-content-primary leading-tight">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-content-secondary">
                        {getUserRole()}
                      </p>
                    </div>
                    <ChevronDown className={cn(
                      "hidden sm:block w-4 h-4 text-content-tertiary transition-transform",
                      isUserMenuOpen && "rotate-180"
                    )} />
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-lg border border-border py-2 z-50">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-medium text-content-primary">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-content-secondary">{user?.email}</p>
                      </div>

                      <div className="py-1">
                        <button className="w-full px-4 py-2 text-left text-sm text-content-primary hover:bg-surface-secondary transition-colors flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Profile Settings
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-content-primary hover:bg-surface-secondary transition-colors flex items-center gap-2 xl:hidden">
                          <Bell className="w-4 h-4" />
                          Notifications
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-content-primary hover:bg-surface-secondary transition-colors flex items-center gap-2 xl:hidden">
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                      </div>

                      <div className="border-t border-border pt-1">
                        <button
                          onClick={onLogout}
                          disabled={isLoggingOut}
                          className="w-full px-4 py-2 text-left text-sm text-accent hover:bg-surface-secondary transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          {isLoggingOut ? 'Signing out...' : 'Sign out'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Navigation - Visible on small screens */}
            <div className="lg:hidden border-t border-border -mx-4 px-4 py-2">
              <nav className="flex items-center gap-1 overflow-x-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-sm whitespace-nowrap transition-all",
                      currentView === item.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-content-secondary"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                        currentView === item.id
                          ? "bg-white text-primary"
                          : "bg-accent text-white"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="absolute left-0 top-16 w-72 h-full bg-surface border-r border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <h3 className="text-sm font-semibold text-content-secondary mb-3">Quick Actions</h3>
              <div className="space-y-1">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.action()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-content-primary hover:bg-surface-secondary rounded-lg transition-colors flex items-center gap-3"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}