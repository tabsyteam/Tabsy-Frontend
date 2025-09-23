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

  // Health check on mount and periodic checks
  useEffect(() => {
    // Initial health check
    healthCheck()

    // Periodic health checks every 30 seconds
    const healthInterval = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        healthCheck()
      }
    }, 30000)

    return () => clearInterval(healthInterval)
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