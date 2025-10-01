'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { TabsyAPI, createTabsyClient } from '@tabsy/api-client'
import { unifiedSessionStorage } from '@/lib/unifiedSessionStorage'

interface ApiContextType {
  api: TabsyAPI
  isConnected: boolean
  reconnect: () => void
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [api] = useState(() =>
    createTabsyClient({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1',
      timeout: 10000,
    })
  )
  const [isConnected, setIsConnected] = useState(true)

  // Enhanced guest session management with unified storage integration
  const setGuestSessionWithPersistence = (sessionId: string) => {
    console.log('ApiProvider: Setting and persisting guest session:', sessionId)
    api.setGuestSession(sessionId)

    // DUAL-WRITE: Persist to unified storage with backward compatibility
    try {
      // Get existing session or create minimal one
      const existingSession = unifiedSessionStorage.getSession()
      if (existingSession) {
        // Update existing session
        unifiedSessionStorage.updateSession({ guestSessionId: sessionId })
      } else {
        // Try to reconstruct session from dining session
        const diningSessionStr = sessionStorage.getItem('tabsy-dining-session')
        if (diningSessionStr) {
          const diningSession = JSON.parse(diningSessionStr)
          unifiedSessionStorage.setSession({
            guestSessionId: sessionId,
            tableSessionId: diningSession.tableSessionId || '',
            restaurantId: diningSession.restaurantId || '',
            tableId: diningSession.tableId || '',
            createdAt: Date.now(),
            lastActivity: Date.now()
          })
        }
      }

      // LEGACY: Keep writing to old keys for backward compatibility
      sessionStorage.setItem('tabsy-guest-session-id', sessionId)
      const diningSessionStr = sessionStorage.getItem('tabsy-dining-session')
      if (diningSessionStr) {
        const diningSession = JSON.parse(diningSessionStr)
        diningSession.sessionId = sessionId
        sessionStorage.setItem('tabsy-dining-session', JSON.stringify(diningSession))
      }
    } catch (error) {
      console.error('Failed to persist guest session:', error)
    }
  }

  // Create enhanced API object that preserves all original methods using Proxy
  const enhancedApi = new Proxy(api, {
    get(target, prop) {
      if (prop === 'setGuestSessionWithPersistence') {
        return setGuestSessionWithPersistence
      }
      return target[prop]
    }
  })

  const reconnect = () => {
    // Implement reconnection logic if needed
    setIsConnected(true)
  }

  useEffect(() => {
    // DUAL-READ: Restore session from unified storage with legacy fallback
    const restoreSession = () => {
      // 1. Try unified storage first (NEW)
      const unifiedSession = unifiedSessionStorage.getSession()
      if (unifiedSession?.guestSessionId) {
        console.log('ApiProvider: Restoring session from unified storage:', unifiedSession.guestSessionId)
        api.setGuestSession(unifiedSession.guestSessionId)
        return
      }

      // 2. Fall back to legacy keys for backward compatibility
      const possibleKeys = ['tabsy-dining-session', 'tabsy-session']
      let sessionFound = false

      for (const key of possibleKeys) {
        const sessionStr = sessionStorage.getItem(key)
        if (sessionStr && !sessionFound) {
          try {
            const session = JSON.parse(sessionStr)
            const sessionId = session.sessionId || session.guestSessionId || session.id
            if (sessionId) {
              console.log(`ApiProvider: Restoring session ID from legacy ${key}:`, sessionId)
              api.setGuestSession(sessionId)
              sessionFound = true
            }
          } catch (error) {
            console.error(`Failed to restore session from ${key}:`, error)
          }
        }
      }

      // 3. Final fallback: standalone session ID
      if (!sessionFound) {
        const standaloneSessionId = sessionStorage.getItem('tabsy-guest-session-id')
        if (standaloneSessionId) {
          console.log('ApiProvider: Restoring standalone session ID:', standaloneSessionId)
          api.setGuestSession(standaloneSessionId)
        }
      }
    }

    // Initial session restoration
    restoreSession()

    // Health check on mount with better error handling
    const checkHealth = async () => {
      try {
        await api.health.check()
        setIsConnected(true)
      } catch (error) {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('API health check failed - running in offline mode:', error)
        }
        setIsConnected(false)
      }
    }

    checkHealth()

    // Listen for visibility change events (tab becomes active/visible again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('ApiProvider: Tab became visible, restoring session')
        restoreSession()

        // Also update API client memory
        const currentSessionId = api.getGuestSessionId()
        if (!currentSessionId) {
          const storedId = sessionStorage.getItem('tabsy-guest-session-id')
          if (storedId) {
            console.log('ApiProvider: Restoring session to API client memory:', storedId)
            api.setGuestSession(storedId)
          }
        }
      }
    }

    // Listen for focus events (user returns to tab)
    const handleFocus = () => {
      console.log('ApiProvider: Window focused, verifying session')
      restoreSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Periodic session refresh to prevent loss
    const refreshInterval = setInterval(() => {
      const currentSessionId = api.getGuestSessionId()
      if (currentSessionId) {
        // Refresh session storage to prevent expiration
        const storedId = sessionStorage.getItem('tabsy-guest-session-id')
        if (!storedId || storedId !== currentSessionId) {
          console.log('ApiProvider: Refreshing session persistence')
          sessionStorage.setItem('tabsy-guest-session-id', currentSessionId)
        }
      } else {
        // If API client lost session, try to restore from storage
        const storedId = sessionStorage.getItem('tabsy-guest-session-id')
        if (storedId) {
          console.log('ApiProvider: Periodic check detected lost session, restoring:', storedId)
          api.setGuestSession(storedId)
        }
      }
    }, 30000) // Every 30 seconds

    return () => {
      clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [api])

  return (
    <ApiContext.Provider value={{ api: enhancedApi, isConnected, reconnect }}>
      {children}
    </ApiContext.Provider>
  )
}

export function useApi() {
  const context = useContext(ApiContext)
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}
