'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { TabsyAPI, createTabsyClient } from '@tabsy/api-client'

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

  // Enhanced guest session management
  const setGuestSessionWithPersistence = (sessionId: string) => {
    console.log('ApiProvider: Setting and persisting guest session:', sessionId)
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
    // Restore session helper function
    const restoreSession = () => {
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
              console.log(`ApiProvider: Restoring session ID from ${key}:`, sessionId)
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
        console.log('ApiProvider: Restoring standalone session ID:', standaloneSessionId)
        api.setGuestSession(standaloneSessionId)
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
