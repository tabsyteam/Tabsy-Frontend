'use client'

import React, { createContext, useContext } from 'react'
import { TabsyAPI, tabsyClient } from '@tabsy/api-client'

// Create a context to share the API client instance
const ApiClientContext = createContext<TabsyAPI | undefined>(undefined)

export function ApiClientProvider({
  children,
  client = tabsyClient
}: {
  children: React.ReactNode
  client?: TabsyAPI
}) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  )
}

export function useApiClient() {
  const client = useContext(ApiClientContext)
  if (!client) {
    // Fallback to global instance if context not available
    console.warn('ApiClientContext not found, using global tabsyClient')
    return tabsyClient
  }
  return client
}