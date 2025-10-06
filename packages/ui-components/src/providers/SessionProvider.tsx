'use client'

import React, { createContext, useContext, useEffect, useCallback } from 'react'
import { TabsyAPI } from '@tabsy/api-client'
import { useConnection } from './ConnectionProvider'

interface SessionContextType {
  setGuestSessionWithPersistence: (sessionId: string) => void
  getGuestSessionId: () => string | null
  clearGuestSession: () => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

interface SessionProviderProps {
  children: React.ReactNode
}

/**
 * Session management for Customer app
 * Provides: guest session persistence, dining session tracking
 * Used by: Customer app only (for PWA guest users)
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const { api } = useConnection()

  // Enhanced guest session management with persistence
  const setGuestSessionWithPersistence = useCallback((sessionId: string) => {
    console.log('SessionProvider: Setting and persisting guest session:', sessionId)
    api.setGuestSession(sessionId)

    // Save to multiple storage locations for redundancy
    try {
      sessionStorage.setItem('tabsy-guest-session-id', sessionId)

      // Also update the dining session if it exists
      const diningSessionStr = sessionStorage.getItem('tabsy-dining-session')
      if (diningSessionStr) {
        const diningSession = JSON.parse(diningSessionStr)
        diningSession.sessionId = sessionId
        sessionStorage.setItem('tabsy-dining-session', JSON.stringify(diningSession))
      }
    } catch (error) {
      console.error('Failed to persist guest session:', error)
    }
  }, [api])

  // Get current guest session ID
  const getGuestSessionId = useCallback(() => {
    return api.getGuestSessionId()
  }, [api])

  // Clear guest session
  const clearGuestSession = useCallback(() => {
    api.clearGuestSession()
    try {
      sessionStorage.removeItem('tabsy-guest-session-id')
      sessionStorage.removeItem('tabsy-dining-session')
    } catch (error) {
      console.error('Failed to clear session storage:', error)
    }
  }, [api])

  // Restore sessions on mount
  useEffect(() => {
    // Restore guest session from sessionStorage if available
    // Try multiple possible session keys to ensure compatibility
    const possibleKeys = ['tabsy-session', 'tabsy-dining-session']
    let sessionFound = false

    for (const key of possibleKeys) {
      const sessionStr = sessionStorage.getItem(key)
      if (sessionStr && !sessionFound) {
        try {
          const session = JSON.parse(sessionStr)
          const sessionId = session.sessionId || session.id
          if (sessionId) {
            console.log(`SessionProvider: Restoring session ID from ${key}:`, sessionId)
            api.setGuestSession(sessionId)
            sessionFound = true
          }
        } catch (error) {
          console.error(`Failed to restore session from ${key}:`, error)
          sessionStorage.removeItem(key)
        }
      }
    }

    // Also check for standalone session ID
    const standaloneSessionId = sessionStorage.getItem('tabsy-guest-session-id')
    if (standaloneSessionId && !sessionFound) {
      console.log('SessionProvider: Restoring standalone session ID:', standaloneSessionId)
      api.setGuestSession(standaloneSessionId)
    }

    // REMOVED: Periodic session refresh interval (was running every 30 seconds)
    // Session persistence is now handled entirely by:
    // 1. Initial restoration on mount (above)
    // 2. Visibility change events (handled by api-provider)
    // 3. Focus events (handled by api-provider)
    // This prevents unnecessary CPU usage when no users are connected

    return () => {
      // Cleanup if needed
    }
  }, [api])

  const value: SessionContextType = {
    setGuestSessionWithPersistence,
    getGuestSessionId,
    clearGuestSession
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}