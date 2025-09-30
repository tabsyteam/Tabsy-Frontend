'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button, useAuth } from '@tabsy/ui-components'
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
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
  HelpCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react'
import { User as UserType, Restaurant, UpdateRestaurantRequest, OrderStatus, Notification } from '@tabsy/shared-types'
import { cn } from '@/lib/utils'
import { ProfileSettingsModal } from '@/components/profile/ProfileSettingsModal'
import { RestaurantSettingsModal } from '@/components/settings/RestaurantSettingsModal'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { tabsyClient } from '@tabsy/api-client'
import { createOrderHooks, createNotificationHooks } from '@tabsy/react-query-hooks'
import { formatNotificationContent, formatRelativeTime, getNotificationPriorityColor, generateFallbackNotifications } from '@/lib/notificationUtils'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { playAssistanceSound, playOrderSound, notificationSoundService } from '@/lib/notificationSound'
import { useNotificationMute } from '@/contexts/NotificationMuteContext'
import { debounce } from '@/lib/debounce'
import { logger } from '@/lib/logger'
import { QUERY_STALE_TIME, QUERY_REFETCH_INTERVAL, WEBSOCKET_DEBOUNCE, NOTIFICATION_LIMITS } from '@/lib/constants'

interface HeaderProps {
  user: UserType | null
  restaurant?: Restaurant | null
  restaurantName?: string
  currentView: 'overview' | 'orders' | 'menu' | 'tables' | 'payments'
  onViewChange: (view: 'overview' | 'orders' | 'menu' | 'tables' | 'payments') => void
  onLogout: () => void
  isLoggingOut?: boolean
}

interface NavItem {
  id: 'overview' | 'orders' | 'menu' | 'tables' | 'payments'
  label: string
  icon: React.ReactNode
  badge?: number
}

export function Header({
  user,
  restaurant,
  restaurantName,
  currentView,
  onViewChange,
  onLogout,
  isLoggingOut = false
}: HeaderProps) {
  const auth = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationMenuRef = useRef<HTMLDivElement>(null)

  // Real-time state for notifications and orders
  const [realtimeOrderCount, setRealtimeOrderCount] = useState(0)

  // Use notification mute context
  const {
    notificationsMuted,
    audioMuted,
    muteEndTime,
    toggleNotificationsMute,
    toggleAudioMute
  } = useNotificationMute()

  // API hooks
  const queryClient = useQueryClient()
  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await tabsyClient.restaurant.update(id, data)
    },
    onSuccess: (response) => {
      const restaurant = response.data as any
      queryClient.invalidateQueries({ queryKey: ['restaurants'] })
      if (restaurant && restaurant.id) {
        queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.id] })
      }
    }
  })

  // Order hooks for real-time badge count
  const orderHooks = createOrderHooks(useQuery)
  const {
    data: ordersData,
    isLoading: ordersLoading
  } = orderHooks.useOrdersByRestaurant(
    restaurant?.id || '',
    { status: OrderStatus.RECEIVED }, // Only fetch RECEIVED orders for badge
    {
      enabled: !!restaurant?.id,
      staleTime: QUERY_STALE_TIME.MEDIUM,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      // Disable polling when WebSocket is connected - rely on WebSocket events for real-time badge updates
      refetchInterval: wsConnected ? false : QUERY_REFETCH_INTERVAL.NORMAL
    }
  )

  // Notification hooks for real-time notifications
  const notificationHooks = createNotificationHooks(useQuery)
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError
  } = notificationHooks.useUserNotifications({
    limit: NOTIFICATION_LIMITS.HEADER,
    unreadOnly: false
  }, {
    enabled: !!user?.id,
    // Disable polling when WebSocket is connected - rely on real-time updates
    refetchInterval: wsConnected ? false : QUERY_REFETCH_INTERVAL.FAST,
    staleTime: QUERY_STALE_TIME.SHORT
  })

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await tabsyClient.notification.markAsRead(notificationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Calculate badge count from real API data with real-time updates
  const baseReceivedOrdersCount = ordersData?.data?.orders?.length || 0
  const receivedOrdersCount = Math.max(baseReceivedOrdersCount, realtimeOrderCount)

  // Get notifications from API only (no fallback)
  const notifications = notificationsData?.notifications || []
  const unreadNotificationsCount = notifications.filter((n: Notification) => !n.isRead).length

  // Use unified WebSocket provider
  const { isConnected: wsConnected } = useWebSocket()

  // Debounced query invalidation to prevent request storms
  const debouncedInvalidateOrders = useMemo(
    () => debounce(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }, WEBSOCKET_DEBOUNCE.ORDERS),
    [queryClient]
  )

  // WebSocket event listeners for real-time updates
  // OPTIMIZATION: Memoize WebSocket event handlers with debounced invalidation
  const handleOrderCreated = useCallback((payload: any) => {
    logger.order('New order created', payload)

    // Play order sound for new orders (audio will be muted if notifications OR audio is muted)
    const shouldPlaySound = !notificationsMuted && !audioMuted
    logger.debug('Sound check', { notificationsMuted, audioMuted, shouldPlay: shouldPlaySound })
    if (shouldPlaySound) {
      playOrderSound('normal')
    }

    // Increment the real-time order count immediately (optimistic update)
    setRealtimeOrderCount(prev => prev + 1)
    // Debounced refetch to prevent request storms
    debouncedInvalidateOrders()
  }, [debouncedInvalidateOrders, notificationsMuted, audioMuted])

  useWebSocketEvent('order:created', handleOrderCreated, [handleOrderCreated])

  const handleOrderStatusUpdated = useCallback((payload: any) => {
    logger.order('Order status updated', payload)
    // Debounced refetch to prevent request storms
    debouncedInvalidateOrders()
  }, [debouncedInvalidateOrders])

  useWebSocketEvent('order:status_updated', handleOrderStatusUpdated, [handleOrderStatusUpdated])

  const debouncedInvalidateNotifications = useMemo(
    () => debounce(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }, WEBSOCKET_DEBOUNCE.NOTIFICATIONS),
    [queryClient]
  )

  const handleAssistanceRequested = useCallback((payload: any) => {
    logger.assistance('Assistance requested', payload)

    // Play assistance sound based on urgency (audio will be muted if notifications OR audio is muted)
    const shouldPlaySound = !notificationsMuted && !audioMuted
    logger.debug('Assistance sound check', { notificationsMuted, audioMuted, shouldPlay: shouldPlaySound })
    if (shouldPlaySound) {
      const urgency = payload.urgency || 'normal'
      playAssistanceSound(urgency)
    }

    // Debounced refetch to sync with backend (no manual counter increment)
    debouncedInvalidateNotifications()
  }, [debouncedInvalidateNotifications, notificationsMuted, audioMuted])

  useWebSocketEvent('assistance:requested', handleAssistanceRequested, [handleAssistanceRequested])

  // Note: notification:created handler removed to prevent duplicate refetches
  // since assistance:requested already triggers notification refetch

  // Sync real-time counts with actual data when queries update
  useEffect(() => {
    if (ordersData?.data?.orders) {
      setRealtimeOrderCount(ordersData.data.orders.length)
    }
  }, [ordersData])



  // Handlers
  const handleProfileSettings = () => {
    setIsProfileModalOpen(true)
    setIsUserMenuOpen(false)
  }

  const handleSettings = () => {
    setIsSettingsModalOpen(true)
    setIsUserMenuOpen(false)
  }

  const handleRestaurantSettingsSave = async (data: any) => {
    if (!restaurant) return
    try {
      await updateRestaurantMutation.mutateAsync({ id: restaurant.id, data })
    } catch (error) {
      console.error('Failed to update restaurant settings:', error)
      throw error
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markAsReadMutation.mutateAsync(notification.id)
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
  }

  const handleClearAllNotifications = async () => {
    if (!notifications.length) return

    try {
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.isRead)
      for (const notification of unreadNotifications) {
        await markAsReadMutation.mutateAsync(notification.id)
      }
      // Refresh the notifications list
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      console.error('Failed to clear all notifications:', error)
    }
  }

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

    return undefined
  }, [isUserMenuOpen, isNotificationOpen])

  // OPTIMIZATION: Memoize navigation items to prevent recreation on every render
  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home className="w-4 h-4" />
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingCart className="w-4 h-4" />,
      badge: receivedOrdersCount > 0 ? receivedOrdersCount : undefined // Real API data for RECEIVED orders
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: <Utensils className="w-4 h-4" />
    },
    {
      id: 'tables',
      label: 'Tables',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: <CreditCard className="w-4 h-4" />
    }
  ], [receivedOrdersCount])

  // OPTIMIZATION: Memoize quick actions to prevent recreation
  const quickActions = useMemo(() => [
    { icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics', action: () => {} },
    { icon: <Users className="w-4 h-4" />, label: 'Staff', action: () => {} },
    { icon: <Calendar className="w-4 h-4" />, label: 'Schedule', action: () => {} },
    { icon: <HelpCircle className="w-4 h-4" />, label: 'Help', action: () => {} }
  ], [])

  // OPTIMIZATION: Memoize user initials calculation
  const getUserInitials = useCallback(() => {
    if (!user) return 'U'
    const firstInitial = user.firstName?.[0] || ''
    const lastInitial = user.lastName?.[0] || ''
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'U'
  }, [user?.firstName, user?.lastName])

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
                      currentView === item.id
                        ? "bg-primary text-white shadow-sm hover:bg-primary-hover"
                        : "text-content-secondary hover:bg-surface-tertiary hover:text-content-primary"
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
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                          {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {isNotificationOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-surface rounded-lg shadow-lg border border-border py-2 z-50">
                        <div className="px-4 py-2 border-b border-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-content-primary">Notifications</h3>
                              {unreadNotificationsCount > 0 && (
                                <p className="text-xs text-content-secondary mt-1">
                                  {unreadNotificationsCount} unread notification{unreadNotificationsCount === 1 ? '' : 's'}
                                </p>
                              )}
                              {notificationsMuted && muteEndTime && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Muted until {muteEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Mute Toggle */}
                              <button
                                onClick={toggleNotificationsMute}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors",
                                  notificationsMuted
                                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                    : "hover:bg-surface-secondary text-content-secondary"
                                )}
                                title={notificationsMuted ? "Unmute notifications" : "Mute notifications for 30 minutes"}
                              >
                                {notificationsMuted ? (
                                  <BellOff className="w-4 h-4" />
                                ) : (
                                  <Bell className="w-4 h-4" />
                                )}
                              </button>

                              {/* Audio Mute Toggle */}
                              <button
                                onClick={toggleAudioMute}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors",
                                  audioMuted
                                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                                    : "hover:bg-surface-secondary text-content-secondary"
                                )}
                                title={audioMuted ? "Unmute notification sounds" : "Mute notification sounds"}
                              >
                                {audioMuted ? (
                                  <VolumeX className="w-4 h-4" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Clear All Button */}
                        {notifications.length > 0 && (
                          <div className="px-4 py-2 border-b border-default">
                            <button
                              onClick={handleClearAllNotifications}
                              className="text-xs text-content-secondary hover:text-content-primary transition-colors"
                            >
                              Clear all notifications
                            </button>
                          </div>
                        )}

                        <div className="max-h-80 overflow-y-auto">
                          {notificationsLoading ? (
                            <div className="px-4 py-8 text-center">
                              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm text-content-secondary">Loading notifications...</p>
                            </div>
                          ) : notificationsError ? (
                            <div className="px-4 py-8 text-center">
                              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                              <p className="text-sm text-content-secondary">Failed to load notifications</p>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <Bell className="w-8 h-8 text-content-tertiary mx-auto mb-2" />
                              <p className="text-sm text-content-secondary">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.slice(0, 5).map((notification: Notification) => {
                              const { title, message, icon: IconComponent, iconColor } = formatNotificationContent(notification)
                              return (
                                <div
                                  key={notification.id}
                                  onClick={() => handleNotificationClick(notification)}
                                  className={cn(
                                    "px-4 py-3 hover:bg-surface-secondary transition-colors cursor-pointer border-l-2",
                                    notification.isRead ? "border-l-transparent" : "border-l-primary bg-primary/5"
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={cn("flex-shrink-0 p-1.5 rounded-lg", notification.isRead ? "bg-surface-tertiary" : "bg-primary/10")}>
                                      <IconComponent className={cn("w-4 h-4", iconColor)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className={cn("text-sm font-medium", notification.isRead ? "text-content-secondary" : "text-content-primary")}>
                                          {title}
                                        </p>
                                        {!notification.isRead && (
                                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                        )}
                                      </div>
                                      <p className={cn("text-sm", notification.isRead ? "text-content-tertiary" : "text-content-secondary")}>
                                        {message}
                                      </p>
                                      <p className="text-xs text-content-tertiary mt-1">
                                        {formatRelativeTime(notification.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                          {notifications.length > 5 && (
                            <div className="px-4 py-2 border-t border-border">
                              <button className="w-full text-sm text-primary hover:text-primary-hover transition-colors">
                                View all notifications
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  <button
                    onClick={handleSettings}
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
                        <button
                          onClick={handleProfileSettings}
                          className="w-full px-4 py-2 text-left text-sm text-content-primary hover:bg-surface-secondary transition-colors flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Profile Settings
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-content-primary hover:bg-surface-secondary transition-colors flex items-center gap-2 xl:hidden">
                          <Bell className="w-4 h-4" />
                          Notifications
                        </button>
                        <button
                          onClick={handleSettings}
                          className="w-full px-4 py-2 text-left text-sm text-content-primary hover:bg-surface-secondary transition-colors flex items-center gap-2 xl:hidden"
                        >
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
                        ? "bg-primary text-white shadow-sm hover:bg-primary-hover"
                        : "text-content-secondary hover:bg-surface-tertiary hover:text-content-primary"
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

      {/* Modals */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
      />

      <RestaurantSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        restaurant={restaurant || null}
        onSave={handleRestaurantSettingsSave}
        isLoading={updateRestaurantMutation.isPending}
      />
    </>
  )
}