'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Workbox } from 'workbox-window'

interface PWAContextType {
  isInstalled: boolean
  canInstall: boolean
  install: () => void
  isOffline: boolean
  update: () => void
  needsUpdate: boolean
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const [wb, setWb] = useState<Workbox | null>(null)

  useEffect(() => {
    // Check if app is installed (PWA)
    const checkInstalled = () => {
      setIsInstalled(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      )
    }

    checkInstalled()
    window.addEventListener('resize', checkInstalled)

    // Check online/offline status
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
    }

    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Initialize service worker
    if ('serviceWorker' in navigator && process.env.NEXT_PUBLIC_PWA_ENABLED === 'true') {
      const workbox = new Workbox('/sw.js')
      setWb(workbox)

      workbox.addEventListener('waiting', () => {
        setNeedsUpdate(true)
      })

      workbox.register()
        .then(() => {
          console.log('Service worker registered')
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error)
        })
    }

    return () => {
      window.removeEventListener('resize', checkInstalled)
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
        setInstallPrompt(null)
      }
    } catch (error) {
      console.error('Failed to install PWA:', error)
    }
  }

  const update = () => {
    if (wb && needsUpdate) {
      wb.messageSkipWaiting()
      setNeedsUpdate(false)
      window.location.reload()
    }
  }

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        canInstall,
        install,
        isOffline,
        update,
        needsUpdate,
      }}
    >
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}
