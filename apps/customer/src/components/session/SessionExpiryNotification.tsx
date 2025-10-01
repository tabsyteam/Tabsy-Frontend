'use client'

import { useState, useEffect } from 'react'
import { SessionManager } from '@/lib/session'
import { Button, Card } from '@tabsy/ui-components'
import { Clock, AlertTriangle, X } from 'lucide-react'

interface SessionExpiryNotificationProps {
  className?: string
}

export default function SessionExpiryNotification({ className }: SessionExpiryNotificationProps) {
  const [expiryInfo, setExpiryInfo] = useState(SessionManager.getSessionExpiryInfo())
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const info = SessionManager.getSessionExpiryInfo()
      setExpiryInfo(info)

      // If session is expired, handle it
      if (info.isExpired) {
        SessionManager.handleSessionExpiry()
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Don't show notification if:
  // - Session is expired (it will be handled)
  // - Session is not expiring soon
  // - User has dismissed the notification
  if (expiryInfo.isExpired || !expiryInfo.isExpiringSoon || isDismissed) {
    return null
  }

  const formatTimeRemaining = (minutes: number | null): string => {
    if (!minutes) return 'Unknown'

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }

    return `${hours}h ${remainingMinutes}m`
  }

  const getVariant = (minutes: number | null) => {
    if (!minutes) return 'default'
    if (minutes <= 10) return 'destructive'
    if (minutes <= 30) return 'default'
    return 'default'
  }

  const getIcon = (minutes: number | null) => {
    if (!minutes) return <Clock className="h-4 w-4" />
    if (minutes <= 10) return <AlertTriangle className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  const handleExtendSession = () => {
    // Update last activity to effectively extend session
    SessionManager.updateLastActivity()
    setExpiryInfo(SessionManager.getSessionExpiryInfo())
    setIsDismissed(true)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  const cardStyle = expiryInfo.minutesRemaining && expiryInfo.minutesRemaining <= 10
    ? 'border-status-error bg-status-error/10 text-status-error'
    : 'border-status-warning bg-status-warning/10 text-status-warning'

  return (
    <div className={`fixed top-20 left-4 right-4 z-[100] mx-auto max-w-md ${className || ''}`}>
      <Card className={`border-2 shadow-lg bg-surface ${cardStyle}`}>
        <div className="flex items-start gap-2 p-4">
          {getIcon(expiryInfo.minutesRemaining)}
          <div className="flex-1">
            <div className="text-sm">
              <div className="font-medium mb-1">
                {expiryInfo.minutesRemaining && expiryInfo.minutesRemaining <= 10
                  ? 'Session Expiring Soon!'
                  : 'Session Will Expire Soon'
                }
              </div>
              <div className="text-xs opacity-90 mb-2">
                Your dining session will expire in{' '}
                <span className="font-medium">
                  {formatTimeRemaining(expiryInfo.minutesRemaining)}
                </span>
                . Your cart and order history will be lost.
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExtendSession}
                  className="h-7 px-2 text-xs"
                >
                  Continue Session
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="h-7 px-2 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="h-6 w-6 p-0 hover:bg-surface-secondary rounded flex items-center justify-center text-content-secondary"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </Card>
    </div>
  )
}

// Hook for checking session expiry status
export function useSessionExpiry() {
  const [expiryInfo, setExpiryInfo] = useState(SessionManager.getSessionExpiryInfo())

  useEffect(() => {
    const interval = setInterval(() => {
      const info = SessionManager.getSessionExpiryInfo()
      setExpiryInfo(info)

      // Handle expired session
      if (info.isExpired) {
        SessionManager.handleSessionExpiry()
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  return {
    ...expiryInfo,
    extendSession: () => {
      SessionManager.updateLastActivity()
      setExpiryInfo(SessionManager.getSessionExpiryInfo())
    },
    formatTimeRemaining: (minutes: number | null) => {
      if (!minutes) return 'Unknown'

      if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`
      }

      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60

      if (remainingMinutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`
      }

      return `${hours}h ${remainingMinutes}m`
    }
  }
}