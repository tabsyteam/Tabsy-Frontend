'use client'

import { createContext, useContext } from 'react'
import { TabsyAPI } from '@tabsy/api-client'

interface ApiContextType {
  api: TabsyAPI
}

const ApiContext = createContext<ApiContextType | null>(null)

export function useApi() {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}

interface ApiProviderProps {
  children: React.ReactNode
  apiClient: TabsyAPI
}

export function ApiProvider({ children, apiClient }: ApiProviderProps) {
  return (
    <ApiContext.Provider value={{ api: apiClient }}>
      {children}
    </ApiContext.Provider>
  )
}