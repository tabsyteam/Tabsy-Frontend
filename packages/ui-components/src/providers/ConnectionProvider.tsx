'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { TabsyAPI } from '@tabsy/api-client'

interface ConnectionContextType {
  api: TabsyAPI
  isConnected: boolean
  reconnect: () => void
  healthCheck: () => Promise<boolean>
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined)

interface ConnectionProviderProps {
  children: React.ReactNode
  apiClient: TabsyAPI
}

/**
 * Shared connection management for all Tabsy apps
 * Provides: health checks, connection status, auto-reconnection
 * Used by: Customer, Restaurant, Admin apps
 */
export function ConnectionProvider({ children, apiClient }: ConnectionProviderProps) {
  const [isConnected, setIsConnected] = useState(true)

  // Health check function
  const healthCheck = useCallback(async (): Promise<boolean> => {
    try {
      await apiClient.health.check()
      setIsConnected(true)
      return true
    } catch (error) {
      console.warn('Connection health check failed:', error)
      setIsConnected(false)
      return false
    }
  }, [apiClient])

  // Reconnect function
  const reconnect = useCallback(() => {
    setIsConnected(true)
    healthCheck()
  }, [healthCheck])

  // Health check on mount only - no periodic polling
  useEffect(() => {
    // Initial health check on mount
    healthCheck()

    // REMOVED: Periodic 30-second health check interval
    // Container deployment optimization: Prevents background CPU usage when idle
    // Health check now only runs:
    // 1. On mount (above)
    // 2. On-demand via reconnect() function
    // 3. When user explicitly triggers it

    return () => {
      // Cleanup if needed
    }
  }, [healthCheck])

  const value: ConnectionContextType = {
    api: apiClient,
    isConnected,
    reconnect,
    healthCheck
  }

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider')
  }
  return context
}