'use client'

import { Providers } from './providers'
import { ToastProvider } from '@tabsy/ui-components'
import { PWAProvider } from '@/components/pwa/PWAProvider'

interface ClientProvidersProps {
  children: React.ReactNode
}

/**
 * Client-side providers wrapper
 * This keeps server components as server components while providing
 * client-side functionality where needed
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <PWAProvider>
      <ToastProvider>
        <Providers>
          {children}
        </Providers>
      </ToastProvider>
    </PWAProvider>
  )
}