'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useGuestSession } from '@/hooks/useGuestSession'
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

// Global session creation tracking using promises (simpler approach)
const globalSessionCreationState = new Map<string, Promise<TabsySession>>()

/**
 * DUAL-WRITE HELPER: Writes session to BOTH unified storage AND legacy keys
 *
 * This ensures backward compatibility during migration phase.
 * Once all code is migrated, we can remove legacy writes.
 *
 * Uses transaction pattern with rollback on failure to prevent inconsistent state.
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
  // Track what we've written for rollback if needed
  const writtenKeys: Array<{ storage: 'session' | 'unified' | 'manager', key: string }> = []

  try {
    console.log('[DualWrite] Writing session to unified + legacy storage:', {
      guestSessionId: sessionData.guestSessionId,
      tableId: sessionData.tableId
    })

    // STEP 1: Prepare all data before any writes
    const unifiedSession: TabsySession = {
      guestSessionId: sessionData.guestSessionId,
      tableSessionId: sessionData.tableSessionId,
      restaurantId: sessionData.restaurantId,
      tableId: sessionData.tableId,
      createdAt: sessionData.createdAt || Date.now(),
      lastActivity: Date.now(),
      metadata: sessionData.metadata
    }

    const legacyWrites: Array<[string, string]> = [
      ['tabsy-guest-session-id', sessionData.guestSessionId],
      [`guestSession-${sessionData.tableId}`, sessionData.guestSessionId],
      [STORAGE_KEYS.TABLE_SESSION_ID, sessionData.tableSessionId]
    ]

    const legacyDiningSession = {
      restaurantId: sessionData.restaurantId,
      tableId: sessionData.tableId,
      sessionId: sessionData.guestSessionId,
      tableSessionId: sessionData.tableSessionId,
      createdAt: sessionData.createdAt || Date.now()
    }

    // STEP 2: Execute writes sequentially with tracking

    // Write to unified storage (primary source)
    unifiedSessionStorage.setSession(unifiedSession)
    writtenKeys.push({ storage: 'unified', key: 'tabsy-session' })

    // Write to legacy sessionStorage keys
    for (const [key, value] of legacyWrites) {
      sessionStorage.setItem(key, value)
      writtenKeys.push({ storage: 'session', key })
    }

    // Write to SessionManager
    SessionManager.setDiningSession(legacyDiningSession)
    writtenKeys.push({ storage: 'manager', key: 'dining-session' })

    console.log('[DualWrite] ✅ Successfully wrote to unified + legacy storage')
    return true

  } catch (error) {
    console.error('[DualWrite] ❌ Failed to write session:', error)

    // STEP 3: ROLLBACK - Remove all partial writes
    console.warn('[DualWrite] ⚠️ Rolling back partial writes...')

    try {
      for (const { storage, key } of writtenKeys) {
        if (storage === 'unified') {
          unifiedSessionStorage.clearSession()
        } else if (storage === 'session') {
          sessionStorage.removeItem(key)
        } else if (storage === 'manager') {
          SessionManager.clearDiningSession()
        }
      }
      console.log('[DualWrite] ✅ Rollback completed successfully')
    } catch (rollbackError) {
      console.error('[DualWrite] ❌ Rollback failed - storage may be inconsistent:', rollbackError)
      // At this point, manual intervention or page refresh may be needed
    }

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()
  const qrCode = searchParams.get('qr')

  // ✅ NEW: Use React Query hook for session creation (prevents duplicate API calls)
  const {
    data: sessionData,
    isLoading: isCreatingSession,
    error: sessionError
  } = useGuestSession({
    qrCode: qrCode || '',
    tableId,
    restaurantId,
    enabled: !!qrCode && !!tableId && !!restaurantId
  })

  // Check if session already exists (for UI state)
  const existingSession = unifiedSessionStorage.getSession()
  const hasValidSession = existingSession &&
    existingSession.tableId === tableId &&
    existingSession.restaurantId === restaurantId

  const [sessionState, setSessionState] = useState<SessionState>({
    tableSession: null,
    users: [],
    currentUser: null,
    isHost: false,
    isConnected: false
  })
  const [error, setError] = useState<string | null>(null)
  const [sessionInitialized, setSessionInitialized] = useState(false)
  const [splashCompleted, setSplashCompleted] = useState(false)

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

  // ✅ Session creation now handled by useGuestSession hook (lines 214-223)
  // OLD autoCreateOrJoinSession function REMOVED to prevent race conditions

  // ✅ NEW: Initialize session from React Query data
  useEffect(() => {
    // Use existing session if available
    if (hasValidSession && existingSession) {
      console.log('[TableSessionManager] Using existing session:', existingSession.guestSessionId)
      api.setGuestSession(existingSession.guestSessionId)
      setCurrentSessionId(existingSession.guestSessionId)
      setSessionState(prev => ({
        ...prev,
        currentUser: {
          id: existingSession.guestSessionId,
          guestSessionId: existingSession.guestSessionId,
          userName: '',
          isHost: false,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        },
        isConnected: true
      }))
      setSessionInitialized(true)
      return
    }

    // Use newly created session from React Query
    if (sessionData && !sessionInitialized) {
      console.log('[TableSessionManager] Session created via React Query:', sessionData.sessionId)
      api.setGuestSession(sessionData.sessionId)
      setCurrentSessionId(sessionData.sessionId)

      setSessionState(prev => ({
        ...prev,
        currentUser: {
          id: sessionData.sessionId,
          guestSessionId: sessionData.sessionId,
          userName: '',
          isHost: false,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        },
        isConnected: true
      }))
      setSessionInitialized(true)
    }

    // Handle errors
    if (sessionError) {
      console.error('[TableSessionManager] Session creation failed:', sessionError)
      setError('Failed to initialize table session')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, sessionError, hasValidSession, existingSession, sessionInitialized])

  // Handle splash completion after session initialization
  useEffect(() => {
    if (sessionInitialized && !isCreatingSession && !error) {
      // Set splash completed immediately to avoid unnecessary delays
      setSplashCompleted(true)
    }
  }, [sessionInitialized, isCreatingSession, error])

  // WebSocket events are now handled by useWebSocketEvent hooks above

  if (isCreatingSession || (!sessionInitialized && !error)) {
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