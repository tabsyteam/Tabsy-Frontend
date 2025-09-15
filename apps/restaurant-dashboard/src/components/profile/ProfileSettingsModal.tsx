'use client'

import { useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { X, User, Mail, Shield } from 'lucide-react'
import { User as UserType } from '@tabsy/shared-types'
import { cn } from '@/lib/utils'

interface ProfileSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserType | null
}

export function ProfileSettingsModal({ isOpen, onClose, user }: ProfileSettingsModalProps) {
  if (!isOpen || !user) return null

  const getUserRole = () => {
    const roleMap: Record<string, string> = {
      'RESTAURANT_OWNER': 'Restaurant Owner',
      'RESTAURANT_MANAGER': 'Restaurant Manager',
      'RESTAURANT_STAFF': 'Restaurant Staff',
      'ADMIN': 'System Administrator'
    }
    return roleMap[user.role] || user.role
  }

  const getUserInitials = () => {
    const firstInitial = user.firstName?.[0] || ''
    const lastInitial = user.lastName?.[0] || ''
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'U'
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close modal when clicking on backdrop (not on the modal content)
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface rounded-lg shadow-xl border border-border w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-content-primary">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-content-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Avatar */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {getUserInitials()}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-content-primary">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-content-secondary">{getUserRole()}</p>
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <div className="p-3 bg-surface-secondary rounded-lg border border-border">
                <p className="text-content-primary">
                  {user.firstName} {user.lastName}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <div className="p-3 bg-surface-secondary rounded-lg border border-border">
                <p className="text-content-primary">{user.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                <Shield className="w-4 h-4" />
                Role
              </label>
              <div className="p-3 bg-surface-secondary rounded-lg border border-border">
                <p className="text-content-primary">{getUserRole()}</p>
              </div>
            </div>
          </div>

          {/* Notice */}
          <div className="bg-surface-tertiary border border-border rounded-lg p-4">
            <p className="text-sm text-content-secondary text-center">
              Profile editing is currently managed by system administrators.
              Contact your administrator to update your profile information.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4 py-2"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}