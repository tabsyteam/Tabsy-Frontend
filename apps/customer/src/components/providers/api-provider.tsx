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
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1',
      timeout: 10000,
    })
  )
  const [isConnected, setIsConnected] = useState(true)

  const reconnect = () => {
    // Implement reconnection logic if needed
    setIsConnected(true)
  }

  useEffect(() => {
    // Health check on mount
    api.health.check()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false))
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
