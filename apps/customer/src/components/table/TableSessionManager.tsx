'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useApi } from '@/components/providers/api-provider'
import { useWebSocket, useWebSocketEvent } from '@tabsy/ui-components'
import { toast } from 'sonner'
import { MenuView } from '@/components/menu/MenuView'
import { globalSessionManager } from '@/utils/globalSessionManager'
import { strictModeGuard } from '@/utils/strictModeGuard'
import { SessionManager } from '@/lib/session'
import { STORAGE_KEYS } from '@/constants/storage'
import { unifiedSessionStorage, TabsySession } from '@/lib/unifiedSessionStorage'
import type {
  MultiUserTableSession,
  TableSessionUser,
  MultiUserTableSessionStatus
} from '@tabsy/shared-types'

/**
 * MIGRATION PHASE 2: Dual-Write Pattern
 *
 * Strategy: Write to BOTH unified storage AND legacy keys
 * - Ensures backward compatibility
 * - Allows safe rollback
 * - Zero downtime migration
 *
 * CRITICAL: All session writes must go through dualWriteSession()
 */

// Global session creation tracking to prevent duplicates across all component instances
const globalSessionCreationState = new Map<string, Promise<boolean>>()

// Global tracking to prevent React Strict Mode duplicates with persistence
let globalSessionCreationLock = false

// Check if session creation is already in progress globally
const isSessionCreationInProgress = (tableId: string): boolean => {
  const lockKey = STORAGE_KEYS.TABLE_SESSION_LOCK(tableId)
  const currentTime = Date.now()
  const lockData = sessionStorage.getItem(lockKey)

  if (lockData) {
    const { timestamp } = JSON.parse(lockData)
    // Lock expires after 15 seconds to prevent permanent lockout (increased for React Strict Mode)
    if (currentTime - timestamp < 15000) {
      return true
    } else {
      // Clear expired lock
      sessionStorage.removeItem(lockKey)
    }
  }
  return false
}

// Set session creation lock globally
const setSessionCreationLock = (tableId: string): void => {
  const lockKey = STORAGE_KEYS.TABLE_SESSION_LOCK(tableId)
  sessionStorage.setItem(lockKey, JSON.stringify({ timestamp: Date.now() }))
}

// Clear session creation lock globally
const clearSessionCreationLock = (tableId: string): void => {
  const lockKey = STORAGE_KEYS.TABLE_SESSION_LOCK(tableId)
  sessionStorage.removeItem(lockKey)
}

/**
 * DUAL-WRITE HELPER: Writes session to BOTH unified storage AND legacy keys
 *
 * This ensures backward compatibility during migration phase.
 * Once all code is migrated, we can remove legacy writes.
 *
 * @param sessionData Session data to persist
 * @returns Success boolean
 */
const dualWriteSession = (sessionData: {
  guestSessionId: string
  tableSessionId: string
  restaurantId: string
  tableId: string
  createdAt?: number
  metadata?: Record<string, any>
}): boolean => {
  try {
    console.log('[DualWrite] Writing session to unified + legacy storage:', {
      guestSessionId: sessionData.guestSessionId,
      tableId: sessionData.tableId
    })

    // 1. Write to unified storage (NEW)
    const unifiedSession: TabsySession = {
      guestSessionId: sessionData.guestSessionId,
      tableSessionId: sessionData.tableSessionId,
      restaurantId: sessionData.restaurantId,
      tableId: sessionData.tableId,
      createdAt: sessionData.createdAt || Date.now(),
      lastActivity: Date.now(),
      metadata: sessionData.metadata
    }
    unifiedSessionStorage.setSession(unifiedSession)

    // 2. Write to legacy keys (BACKWARD COMPATIBILITY)
    // Primary guest session ID
    sessionStorage.setItem('tabsy-guest-session-id', sessionData.guestSessionId)

    // Table-specific guest session
    sessionStorage.setItem(`guestSession-${sessionData.tableId}`, sessionData.guestSessionId)

    // Table session ID
    sessionStorage.setItem(STORAGE_KEYS.TABLE_SESSION_ID, sessionData.tableSessionId)

    // Dining session object (legacy SessionManager)
    SessionManager.setDiningSession({
      restaurantId: sessionData.restaurantId,
      tableId: sessionData.tableId,
      sessionId: sessionData.guestSessionId,
      tableSessionId: sessionData.tableSessionId,
      createdAt: sessionData.createdAt || Date.now()
    })

    console.log('[DualWrite] ✅ Successfully wrote to unified + legacy storage')
    return true
  } catch (error) {
    console.error('[DualWrite] ❌ Failed to write session:', error)
    return false
  }
}

/**
 * DUAL-READ HELPER: Reads session from unified storage first, falls back to legacy
 *
 * @param tableId Table ID for session lookup
 * @returns Session data or null
 */
const dualReadSession = (tableId: string): TabsySession | null => {
  try {
    // 1. Try unified storage first (NEW)
    let session = unifiedSessionStorage.getSession()
    if (session && session.tableId === tableId) {
      console.log('[DualRead] ✅ Read from unified storage')
      return session
    }

    // 2. Fall back to legacy if needed (BACKWARD COMPATIBILITY)
    console.log('[DualRead] Unified storage empty, attempting legacy read...')

    const guestSessionId = sessionStorage.getItem('tabsy-guest-session-id') ||
                           sessionStorage.getItem(`guestSession-${tableId}`)
    const tableSessionId = sessionStorage.getItem(STORAGE_KEYS.TABLE_SESSION_ID)
    const diningSession = SessionManager.getDiningSession()

    if (guestSessionId || diningSession) {
      console.log('[DualRead] ✅ Read from legacy storage, migrating...')

      // Reconstruct session from legacy keys
      const migratedSession: TabsySession = {
        guestSessionId: guestSessionId || diningSession?.sessionId || '',
        tableSessionId: tableSessionId || diningSession?.tableSessionId || '',
        restaurantId: diningSession?.restaurantId || '',
        tableId: diningSession?.tableId || tableId,
        createdAt: diningSession?.createdAt || Date.now(),
        lastActivity: Date.now()
      }

      // Write to unified storage for next time
      if (migratedSession.guestSessionId) {
        unifiedSessionStorage.setSession(migratedSession)
        console.log('[DualRead] Migrated legacy session to unified storage')
      }

      return migratedSession
    }

    console.log('[DualRead] ❌ No session found in unified or legacy storage')
    return null
  } catch (error) {
    console.error('[DualRead] Error reading session:', error)
    return null
  }
}

interface TableSessionManagerProps {
  restaurantId: string
  tableId: string
  children: React.ReactNode
}

interface SessionState {
  tableSession: MultiUserTableSession | null
  users: TableSessionUser[]
  currentUser: TableSessionUser | null
  isHost: boolean
  isConnected: boolean
}

export function TableSessionManager({ restaurantId, tableId, children }: TableSessionManagerProps) {
  const [sessionState, setSessionState] = useState<SessionState>({
    tableSession: null,
    users: [],
    currentUser: null,
    isHost: false,
    isConnected: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionInitialized, setSessionInitialized] = useState(false)
  const [splashCompleted, setSplashCompleted] = useState(false)

  // Use ref to track initialization to prevent duplicates across re-renders
  const initializationRef = useRef(false)

  const router = useRouter()
  const { api } = useApi()

  // State to track the current session ID
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Use global WebSocket connection managed by unified architecture
  const { client, isConnected } = useWebSocket()

  // WebSocket event handlers for table session updates
  useWebSocketEvent('table:session_created', useCallback((data: any) => {
    if (data.tableId === tableId) {
      setSessionState(prev => ({
        ...prev,
        tableSession: {
          id: data.tableSessionId,
          sessionCode: data.sessionCode,
          tableId: data.tableId,
          restaurantId,
          status: 'ACTIVE' as MultiUserTableSessionStatus,
          totalAmount: 0,
          paidAmount: 0,
          createdAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
          lastActivity: new Date().toISOString()
        }
      }))
    }
  }, [tableId, restaurantId]), [tableId, restaurantId])

  useWebSocketEvent('table:user_joined', useCallback((data: any) => {
    if (data.tableId === tableId) {
      setSessionState(prev => ({
        ...prev,
        users: [...prev.users.filter(u => u.guestSessionId !== data.user.guestSessionId), {
          id: data.user.guestSessionId,
          guestSessionId: data.user.guestSessionId,
          userName: data.user.userName,
          isHost: data.user.isHost,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }]
      }))
      toast.success(`${data.user.userName} joined the table`)
    }
  }, [tableId]), [tableId])

  useWebSocketEvent('table:user_left', useCallback((data: any) => {
    if (data.tableId === tableId) {
      setSessionState(prev => ({
        ...prev,
        users: prev.users.filter(u => u.guestSessionId !== data.user.guestSessionId)
      }))
      toast.info(`${data.user.userName} left the table`)
    }
  }, [tableId]), [tableId])

  useWebSocketEvent('table:session_closed', useCallback((data: any) => {
    if (data.tableId === tableId) {
      toast.info('Table session has been closed')
      setSessionState({
        tableSession: null,
        users: [],
        currentUser: null,
        isHost: false,
        isConnected: false
      })
      router.push('/') // Redirect to home
    }
  }, [tableId, router]), [tableId, router])

  // Handle session replacement when different device is detected
  useWebSocketEvent('sessionReplaced', useCallback((data: any) => {
    console.log('[TableSessionManager] Session replaced due to different device:', data)

    // Show notification to user about session replacement
    toast.error(
      data.message || 'Your session has been replaced by a new customer. Please refresh the page.',
      {
        duration: 10000, // Show for 10 seconds
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      }
    )

    // Clear session state
    setSessionState({
      tableSession: null,
      users: [],
      currentUser: null,
      isHost: false,
      isConnected: false
    })

    // Clear stored session data
    api.setGuestSession('')
    sessionStorage.removeItem('tabsy-guest-session-id')
    sessionStorage.removeItem(`guestSession-${tableId}`)

    // If shouldRefresh is true, automatically refresh after a short delay
    if (data.shouldRefresh) {
      setTimeout(() => {
        console.log('[TableSessionManager] Auto-refreshing page due to session replacement')
        window.location.reload()
      }, 3000) // 3 second delay to allow user to see the message
    }
  }, [tableId, router, api]), [tableId, router, api])

  useWebSocketEvent('table:session_updated', useCallback((data: any) => {
    if (data.tableId === tableId) {
      setSessionState(prev => ({
        ...prev,
        tableSession: prev.tableSession ? {
          ...prev.tableSession,
          status: data.status as MultiUserTableSessionStatus,
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount
        } : null
      }))
    }
  }, [tableId]), [tableId])

  // Auto-create or join table session (anonymous, no name required)
  const autoCreateOrJoinSession = useCallback(async () => {
    const sessionKey = `${restaurantId}-${tableId}`

    // Prevent duplicate session creation
    if (sessionInitialized) {
      return true
    }

    // Check global session manager first
    if (globalSessionManager.hasSession(tableId)) {
      const existingSessionId = globalSessionManager.getSessionId(tableId)
      api.setGuestSession(existingSessionId!)
      setCurrentSessionId(existingSessionId!)

      // DUAL-WRITE: Save session to both unified and legacy storage
      dualWriteSession({
        guestSessionId: existingSessionId!,
        tableSessionId: '', // Not available from global session manager
        restaurantId,
        tableId
      })

      setSessionState(prev => ({
        ...prev,
        currentUser: {
          id: existingSessionId!,
          guestSessionId: existingSessionId!,
          userName: '',
          isHost: false,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        },
        isConnected: true
      }))
      setSessionInitialized(true)
      return true
    }

    // Check if creation is already in progress
    if (globalSessionManager.isCreationInProgress(tableId)) {
      const sessionId = await globalSessionManager.waitForSessionCreation(tableId)
      if (sessionId) {
        api.setGuestSession(sessionId)
        setCurrentSessionId(sessionId)

        // DUAL-WRITE: Save session to both unified and legacy storage
        dualWriteSession({
          guestSessionId: sessionId,
          tableSessionId: '', // Not available from waiting path
          restaurantId,
          tableId
        })

        setSessionState(prev => ({
          ...prev,
          currentUser: {
            id: sessionId,
            guestSessionId: sessionId,
            userName: '',
            isHost: false,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          },
          isConnected: true
        }))
        setSessionInitialized(true)
        return true
      }
    }

    // Check if session already exists in API client
    const existingSessionId = api.getGuestSessionId()
    if (existingSessionId) {
      // Check for stored tableSessionId from QR code processing
      const tableSessionId = sessionStorage.getItem(STORAGE_KEYS.TABLE_SESSION_ID)

      // DUAL-WRITE: Persist existing session to both unified and legacy storage
      dualWriteSession({
        guestSessionId: existingSessionId,
        tableSessionId: tableSessionId || '',
        restaurantId,
        tableId
      })

      setSessionState(prev => ({
        ...prev,
        currentUser: {
          id: existingSessionId,
          guestSessionId: existingSessionId,
          userName: '', // Will be set during order
          isHost: false,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        },
        isConnected: true
      }))
      setSessionInitialized(true)

      // Global WebSocket provider handles connection automatically
      return true
    }

    // Check if session exists in sessionStorage (persistent across reloads)
    const storedSessionId = sessionStorage.getItem(`guestSession-${tableId}`)
    if (storedSessionId) {
      api.setGuestSession(storedSessionId)

      // Check for stored tableSessionId from QR code processing
      const tableSessionId = sessionStorage.getItem(STORAGE_KEYS.TABLE_SESSION_ID)

      // DUAL-WRITE: Save session to both unified and legacy storage
      dualWriteSession({
        guestSessionId: storedSessionId,
        tableSessionId: tableSessionId || '',
        restaurantId,
        tableId
      })
      setSessionState(prev => ({
        ...prev,
        currentUser: {
          id: storedSessionId,
          guestSessionId: storedSessionId,
          userName: '', // Will be set during order
          isHost: false,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        },
        isConnected: true
      }))
      setSessionInitialized(true)

      // Global WebSocket provider handles connection automatically
      return true
    }

    // Check if there's an ongoing session creation for this table
    const existingCreation = globalSessionCreationState.get(sessionKey)
    if (existingCreation) {
      console.log('[TableSessionManager] Session creation already in progress, waiting for completion...')
      try {
        const result = await existingCreation
        if (result) {
          // Check if session was created by the other process
          const newSessionId = api.getGuestSessionId() || sessionStorage.getItem(`guestSession-${tableId}`)
          if (newSessionId) {
            console.log('[TableSessionManager] Session created by parallel process:', newSessionId)
            api.setGuestSession(newSessionId)
            setSessionState(prev => ({
              ...prev,
              currentUser: {
                id: newSessionId,
                guestSessionId: newSessionId,
                userName: '',
                isHost: false,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
              },
              isConnected: true
            }))
            setSessionInitialized(true)
            return true
          }
        }
      } catch (error) {
        console.error('[TableSessionManager] Error waiting for parallel session creation:', error)
      }
    }

    // Try to start session creation atomically
    if (!globalSessionManager.startSessionCreation(tableId, restaurantId)) {
      console.log('[TableSessionManager] Could not start session creation, another process is handling it')
      return false
    }

    // Create a promise for this session creation
    const createSessionPromise = (async () => {
      try {

        // Get QR code from URL if available
        const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
        const qrCode = searchParams.get('qr')

        // Try to create/join session via QR code endpoint (no name required)
        if (qrCode) {
          // Use strict mode guard to prevent duplicate API calls
          const operationKey = `createSession-${tableId}-${restaurantId}-${qrCode}`

          const sessionResponse = await strictModeGuard.executeOnce(operationKey, async () => {
            // Use existing guest session ID as device identifier for backend comparison
            const existingGuestSessionId = api.getGuestSessionId() ||
                                         sessionStorage.getItem(`guestSession-${tableId}`) ||
                                         localStorage.getItem('tabsy-guest-session-id')

            console.log('[TableSessionManager] Creating QR session with device context:', {
              hasExistingSession: !!existingGuestSessionId,
              deviceSessionId: existingGuestSessionId || 'new device'
            })

            return await api.qr.createGuestSession({
              qrCode,
              tableId,
              restaurantId,
              deviceSessionId: existingGuestSessionId || undefined // Send existing session as device ID
              // Note: No userName - will be asked during order placement
            })
          })

          if (sessionResponse && sessionResponse.success && sessionResponse.data) {
            const guestSession = sessionResponse.data
            api.setGuestSession(guestSession.sessionId)

            // Complete session creation in global manager
            globalSessionManager.completeSessionCreation(tableId, guestSession.sessionId)

            // DUAL-WRITE: Write to both unified storage AND legacy keys
            dualWriteSession({
              guestSessionId: guestSession.sessionId,
              tableSessionId: guestSession.tableSessionId,
              restaurantId,
              tableId,
              createdAt: guestSession.createdAt ? new Date(guestSession.createdAt).getTime() : Date.now()
            })

            // Set up anonymous session state
            setSessionState(prev => ({
              ...prev,
              currentUser: {
                id: guestSession.sessionId,
                guestSessionId: guestSession.sessionId,
                userName: '', // Empty - will be set during order
                isHost: false,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
              },
              isConnected: true
            }))

            setSessionInitialized(true)

            // Set the session ID for global WebSocket provider
            setCurrentSessionId(guestSession.sessionId)

            return true
          }
        }

        return false
      } catch (error) {
        console.error('[TableSessionManager] Error auto-creating/joining session:', error)
        // Cancel session creation in global manager on error
        globalSessionManager.cancelSessionCreation(tableId)
        return false
      } finally {
        // Clear enhanced global lock
        globalSessionCreationLock = false
        clearSessionCreationLock(tableId)
        // Remove from global state after completion
        globalSessionCreationState.delete(sessionKey)
      }
    })()

    // Store the promise to prevent duplicate creations
    globalSessionCreationState.set(sessionKey, createSessionPromise)

    // Return the result
    return await createSessionPromise
  }, [tableId, restaurantId, api, sessionInitialized])


  // Initialize session management
  useEffect(() => {
    // Skip if already initialized (using ref to persist across re-renders)
    if (initializationRef.current || sessionInitialized) {
      setIsLoading(false)
      return
    }

    // Additional check for existing session to prevent Strict Mode duplicates
    const existingSession = api.getGuestSessionId() || sessionStorage.getItem(`guestSession-${tableId}`)
    if (existingSession && sessionInitialized) {
      setIsLoading(false)
      return
    }

    const initialize = async () => {
      // Mark as started to prevent race conditions
      initializationRef.current = true

      try {
        setIsLoading(true)
        setError(null)


        // Auto-create or join session
        const hasSession = await autoCreateOrJoinSession()

        if (!hasSession) {
          setError('Failed to connect to table session')
          initializationRef.current = false // Reset on failure
        }

      } catch (error) {
        setError('Failed to initialize table session')
        initializationRef.current = false // Reset on error
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [tableId, restaurantId]) // Remove sessionInitialized from dependencies

  // Handle splash completion after session initialization
  useEffect(() => {
    if (sessionInitialized && !isLoading && !error) {
      // Set splash completed immediately to avoid unnecessary delays
      setSplashCompleted(true)
    }
  }, [sessionInitialized, isLoading, error])

  // WebSocket events are now handled by useWebSocketEvent hooks above

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-status-error mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Retry
        </button>
      </div>
    )
  }


  // Render based on current state
  if (splashCompleted) {
    // Session is ready, show the menu
    return <MenuView />
  }

  // Show splash screen while session is being initialized
  return (
    <div className="min-h-screen">
      {React.cloneElement(children as React.ReactElement)}
    </div>
  )
}