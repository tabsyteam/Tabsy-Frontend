'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Star,
  Settings,
  HelpCircle,
  LogOut,
  Edit3,
  Bell,
  Shield,
  CreditCard,
  Gift,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react'
import { useApi } from '@/components/providers/api-provider'
import { User as ApiUser } from '@tabsy/shared-types'

// Extend API User with display-specific fields
type UserProfile = ApiUser & {
  displayName: string
  favoriteRestaurants?: number
  totalOrders?: number
  totalSpent?: number
}

interface ProfileSetting {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<any>
  action: () => void
  showChevron?: boolean
  badge?: string
  danger?: boolean
}

export function ProfileView() {
  const router = useRouter()
  const { api } = useApi()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)

  // Load user profile
  useEffect(() => {
    loadProfile()

    // Check for dark mode preference
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)

      // Use real API call to get current user
      const response = await api.user.getCurrentUser()

      if (response.success && response.data) {
        // Map API user to profile with display-specific fields
        const userProfile: UserProfile = {
          ...response.data,
          displayName: `${response.data.firstName} ${response.data.lastName}`,
          favoriteRestaurants: 0, // TODO: Calculate from favorites API
          totalOrders: 0, // TODO: Calculate from orders API
          totalSpent: 0 // TODO: Calculate from orders API
        }

        setProfile(userProfile)
      } else {
        console.error('Failed to load profile:', response.message)
        // Set a guest user fallback
        const guestProfile: UserProfile = {
          id: 'guest',
          email: 'guest@tabsy.local',
          firstName: 'Guest',
          lastName: 'User',
          phone: '',
          role: 'CUSTOMER' as any,
          status: 'ACTIVE' as any,
          displayName: 'Guest User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          favoriteRestaurants: 0,
          totalOrders: 0,
          totalSpent: 0
        }
        setProfile(guestProfile)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      // Set a guest user fallback for offline/error scenarios
      const guestProfile: UserProfile = {
        id: 'guest',
        email: 'guest@tabsy.local',
        firstName: 'Guest',
        lastName: 'User',
        phone: '',
        role: 'CUSTOMER' as any,
        status: 'ACTIVE' as any,
        displayName: 'Guest User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        favoriteRestaurants: 0,
        totalOrders: 0,
        totalSpent: 0
      }
      setProfile(guestProfile)
    } finally {
      setLoading(false)
    }
  }

  const handleEditProfile = () => {
    // TODO: Implement profile editing
    console.log('Edit profile')
  }

  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)

    // Update theme
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleToggleNotifications = () => {
    setNotifications(!notifications)
    // TODO: Update notification preferences
  }

  const handleSignOut = () => {
    // TODO: Implement sign out
    console.log('Sign out')
  }

  // Profile settings sections
  const accountSettings: ProfileSetting[] = [
    {
      id: 'edit-profile',
      label: 'Edit Profile',
      description: 'Update your personal information',
      icon: Edit3,
      action: handleEditProfile,
      showChevron: true
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: notifications ? 'Enabled' : 'Disabled',
      icon: Bell,
      action: handleToggleNotifications,
      showChevron: true
    },
    {
      id: 'dark-mode',
      label: 'Dark Mode',
      description: darkMode ? 'Enabled' : 'Disabled',
      icon: darkMode ? Moon : Sun,
      action: handleToggleDarkMode,
      showChevron: true
    }
  ]

  const appSettings: ProfileSetting[] = [
    {
      id: 'payment-methods',
      label: 'Payment Methods',
      description: 'Manage your payment options',
      icon: CreditCard,
      action: () => router.push('/profile/payment'),
      showChevron: true
    },
    {
      id: 'favorites',
      label: 'Favorite Restaurants',
      description: `${profile?.favoriteRestaurants || 0} favorites`,
      icon: Heart,
      action: () => router.push('/profile/favorites'),
      showChevron: true
    },
    {
      id: 'rewards',
      label: 'Rewards & Offers',
      description: 'View your rewards and special offers',
      icon: Gift,
      action: () => router.push('/profile/rewards'),
      showChevron: true,
      badge: 'New'
    }
  ]

  const supportSettings: ProfileSetting[] = [
    {
      id: 'help',
      label: 'Help & Support',
      description: 'Get help and contact support',
      icon: HelpCircle,
      action: () => router.push('/help'),
      showChevron: true
    },
    {
      id: 'privacy',
      label: 'Privacy & Security',
      description: 'Manage your privacy settings',
      icon: Shield,
      action: () => router.push('/privacy'),
      showChevron: true
    },
    {
      id: 'sign-out',
      label: 'Sign Out',
      icon: LogOut,
      action: handleSignOut,
      danger: true
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-surface shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="h-8 w-32 bg-surface-tertiary rounded animate-pulse mb-2" />
            <div className="h-5 w-48 bg-surface-tertiary rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-surface rounded-xl border p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-surface-tertiary rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-6 w-32 bg-surface-tertiary rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-surface-tertiary rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-content-primary">Profile</h1>
          <p className="text-content-secondary">Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl border p-6 mb-6"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              {profile?.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={profile.displayName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-content-primary">
                {profile?.displayName || 'Guest User'}
              </h2>
              <div className="text-content-secondary">
                Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                }) : 'Recently'}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleEditProfile}>
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            {profile?.email && (
              <div className="flex items-center space-x-3 text-content-secondary">
                <Mail className="w-4 h-4" />
                <span>{profile.email}</span>
              </div>
            )}
            {profile?.phone && (
              <div className="flex items-center space-x-3 text-content-secondary">
                <Phone className="w-4 h-4" />
                <span>{profile.phone}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-content-primary">
                {profile?.totalOrders || 0}
              </div>
              <div className="text-sm text-content-secondary">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-content-primary">
                {profile?.favoriteRestaurants || 0}
              </div>
              <div className="text-sm text-content-secondary">Favorites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-content-primary">
                ${profile?.totalSpent?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-content-secondary">Total Spent</div>
            </div>
          </div>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Account Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface rounded-xl border overflow-hidden"
          >
            <div className="p-4 border-b bg-background-secondary/50">
              <h3 className="font-semibold text-content-primary">Account Settings</h3>
            </div>
            <div className="divide-y">
              {accountSettings.map((setting) => {
                const IconComponent = setting.icon
                return (
                  <button
                    key={setting.id}
                    onClick={setting.action}
                    className="w-full p-4 flex items-center space-x-3 hover:bg-interactive-hover transition-colors duration-200 text-left"
                  >
                    <div className="w-8 h-8 bg-background-secondary rounded-lg flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-content-tertiary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-content-primary">{setting.label}</div>
                      {setting.description && (
                        <div className="text-sm text-content-secondary">{setting.description}</div>
                      )}
                    </div>
                    {setting.showChevron && (
                      <ChevronRight className="w-4 h-4 text-content-tertiary" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* App Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface rounded-xl border overflow-hidden"
          >
            <div className="p-4 border-b bg-background-secondary/50">
              <h3 className="font-semibold text-content-primary">App Settings</h3>
            </div>
            <div className="divide-y">
              {appSettings.map((setting) => {
                const IconComponent = setting.icon
                return (
                  <button
                    key={setting.id}
                    onClick={setting.action}
                    className="w-full p-4 flex items-center space-x-3 hover:bg-interactive-hover transition-colors duration-200 text-left"
                  >
                    <div className="w-8 h-8 bg-background-secondary rounded-lg flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-content-tertiary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-content-primary">{setting.label}</span>
                        {setting.badge && (
                          <span className="px-2 py-0.5 text-xs bg-accent text-accent-foreground rounded-full">
                            {setting.badge}
                          </span>
                        )}
                      </div>
                      {setting.description && (
                        <div className="text-sm text-content-secondary">{setting.description}</div>
                      )}
                    </div>
                    {setting.showChevron && (
                      <ChevronRight className="w-4 h-4 text-content-tertiary" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Support Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface rounded-xl border overflow-hidden"
          >
            <div className="p-4 border-b bg-background-secondary/50">
              <h3 className="font-semibold text-content-primary">Support</h3>
            </div>
            <div className="divide-y">
              {supportSettings.map((setting) => {
                const IconComponent = setting.icon
                return (
                  <button
                    key={setting.id}
                    onClick={setting.action}
                    className={`w-full p-4 flex items-center space-x-3 hover:bg-interactive-hover transition-colors duration-200 text-left ${
                      setting.danger ? 'hover:bg-status-error-light' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      setting.danger ? 'bg-status-error-light' : 'bg-background-secondary'
                    }`}>
                      <IconComponent className={`w-4 h-4 ${
                        setting.danger ? 'text-status-error' : 'text-content-tertiary'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        setting.danger ? 'text-status-error' : 'text-content-primary'
                      }`}>
                        {setting.label}
                      </div>
                      {setting.description && (
                        <div className="text-sm text-content-secondary">{setting.description}</div>
                      )}
                    </div>
                    {setting.showChevron && (
                      <ChevronRight className="w-4 h-4 text-content-tertiary" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center py-6 text-content-tertiary text-sm"
        >
          <div>Tabsy Customer App</div>
          <div>Version 1.0.0</div>
        </motion.div>
      </div>
    </div>
  )
}