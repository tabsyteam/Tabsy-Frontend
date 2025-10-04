'use client'

import { useState, useEffect } from 'react'
import { SessionManager } from '@/lib/session'
import { Button, Card } from '@tabsy/ui-components'
import { Clock, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'

interface SessionExpiryNotificationProps {
  className?: string
}

export default function SessionExpiryNotification({ className }: SessionExpiryNotificationProps) {
  // FIXED: Initialize to null to prevent hydration mismatch
  // Session info will be set client-side only in useEffect
  const [expiryInfo, setExpiryInfo] = useState<ReturnType<typeof SessionManager.getSessionExpiryInfo> | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isExtending, setIsExtending] = useState(false)

  // FIXED: Set initial value and interval only on client after hydration
  useEffect(() => {
    // Set mounted flag to prevent hydration mismatch
    setIsMounted(true)

    // Get initial expiry info on client side only
    const info = SessionManager.getSessionExpiryInfo()
    console.log('[SessionExpiryNotification] Initial expiry info:', info)
    setExpiryInfo(info)

    // Set up interval for updates - check more frequently to show live countdown
    const interval = setInterval(() => {
      // Don't update if user just dismissed
      if (isDismissed) return

      const info = SessionManager.getSessionExpiryInfo()
      console.log('[SessionExpiryNotification] Interval update - expiry info:', {
        minutesRemaining: info.minutesRemaining,
        source: 'interval'
      })
      setExpiryInfo(info)

      // If session is expired, handle it
      if (info.isExpired) {
        SessionManager.handleSessionExpiry()
      }
    }, 5000) // Check every 5 seconds for more responsive UI

    return () => clearInterval(interval)
  }, [isDismissed]) // Re-run if isDismissed changes

  // FIXED: Don't render anything until client-side hydration complete
  if (!isMounted || !expiryInfo) {
    return null
  }

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

  const handleExtendSession = async () => {
    console.log('[SessionExpiryNotification] Starting session extension...')
    console.log('[SessionExpiryNotification] Current expiry info BEFORE:', expiryInfo)

    setIsExtending(true)

    try {
      // Call backend API to extend table session (extends by 30 minutes)
      const success = await SessionManager.extendSession()

      if (success) {
        console.log('[SessionExpiryNotification] Extension successful!')

        // Refresh expiry info to show updated time
        const newExpiryInfo = SessionManager.getSessionExpiryInfo()
        console.log('[SessionExpiryNotification] New expiry info AFTER:', newExpiryInfo)

        setExpiryInfo(newExpiryInfo)

        // Show success message
        toast.success('Session Extended', {
          description: 'Your session has been extended by 30 minutes',
          duration: 3000,
        })

        // Dismiss notification after showing updated info
        setTimeout(() => {
          setIsDismissed(true)
        }, 2000) // Give user 2 seconds to see the updated time
      } else {
        // Session extension failed - likely SESSION_CLOSED
        // The SessionManager.extendSession already cleared the session data
        // Show user-friendly message and guidance

        toast.error('Session Ended', {
          description: 'Your dining session has ended. Please scan the QR code at your table to start a new session.',
          duration: 6000,
        })

        // Redirect to home after showing message
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      }
    } catch (error) {
      console.error('[SessionExpiryNotification] Error extending session:', error)

      toast.error('Unable to Extend Session', {
        description: 'Please check your connection and try again, or scan the QR code to start a new session.',
        duration: 5000,
      })
    } finally {
      setIsExtending(false)
    }
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
                  disabled={isExtending}
                  className="h-7 px-2 text-xs"
                >
                  {isExtending ? 'Extending...' : 'Continue Session'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  disabled={isExtending}
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
  // FIXED: Initialize to null to prevent hydration mismatch
  const [expiryInfo, setExpiryInfo] = useState<ReturnType<typeof SessionManager.getSessionExpiryInfo> | null>(null)

  useEffect(() => {
    // Get initial expiry info on client side only
    const info = SessionManager.getSessionExpiryInfo()
    setExpiryInfo(info)

    // Set up interval for updates
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
    // FIXED: Provide safe defaults when expiryInfo is null (during SSR/hydration)
    isExpired: expiryInfo?.isExpired ?? false,
    isExpiringSoon: expiryInfo?.isExpiringSoon ?? false,
    minutesRemaining: expiryInfo?.minutesRemaining ?? null,
    sessionEndTime: expiryInfo?.sessionEndTime ?? null,
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