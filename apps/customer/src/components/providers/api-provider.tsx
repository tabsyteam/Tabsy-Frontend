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

  const reconnect = () => {
    // Implement reconnection logic if needed
    setIsConnected(true)
  }

  useEffect(() => {
    // Restore guest session from sessionStorage if available
    const sessionStr = sessionStorage.getItem('tabsy-session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (session.sessionId) {
          console.log('ApiProvider: Restoring session ID:', session.sessionId)
          api.setGuestSession(session.sessionId)
        }
      } catch (error) {
        console.error('Failed to restore session:', error)
        // Clear invalid session data
        sessionStorage.removeItem('tabsy-session')
      }
    }

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
  }, [api])

  return (
    <ApiContext.Provider value={{ api, isConnected, reconnect }}>
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
