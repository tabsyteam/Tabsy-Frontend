/**
 * React Hook for Unified Session Management
 *
 * Architectural Pattern: Custom Hook with Observer Pattern
 * - Provides reactive access to session state
 * - Auto-updates components when session changes
 * - Encapsulates storage complexity
 *
 * @author Senior Software Architect
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { unifiedSessionStorage, TabsySession } from '@/lib/unifiedSessionStorage'

/**
 * Custom event for session changes (Observer Pattern)
 */
const SESSION_CHANGE_EVENT = 'tabsy-session-change'

/**
 * Dispatch session change event
 */
function dispatchSessionChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT))
  }
}

/**
 * Hook return type
 */
interface UseUnifiedSessionReturn {
  session: TabsySession | null
  setSession: (session: TabsySession) => void
  updateSession: (updates: Partial<TabsySession>) => void
  clearSession: () => void
  isLoading: boolean
  refresh: () => void
}

/**
 * React Hook for unified session access
 *
 * Usage:
 * ```tsx
 * const { session, setSession, updateSession } = useUnifiedSession()
 * ```
 */
export function useUnifiedSession(): UseUnifiedSessionReturn {
  const [session, setSessionState] = useState<TabsySession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)

  // Load session on mount
  const loadSession = useCallback(() => {
    const currentSession = unifiedSessionStorage.getSession()
    if (isMounted.current) {
      setSessionState(currentSession)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    loadSession()

    // Listen for session changes from other components/tabs
    const handleSessionChange = () => {
      loadSession()
    }

    window.addEventListener(SESSION_CHANGE_EVENT, handleSessionChange)
    window.addEventListener('storage', handleSessionChange)

    return () => {
      isMounted.current = false
      window.removeEventListener(SESSION_CHANGE_EVENT, handleSessionChange)
      window.removeEventListener('storage', handleSessionChange)
    }
  }, [loadSession])

  // Set session
  const setSession = useCallback((newSession: TabsySession) => {
    unifiedSessionStorage.setSession(newSession)
    setSessionState(newSession)
    dispatchSessionChange()
  }, [])

  // Update session (partial)
  const updateSession = useCallback((updates: Partial<TabsySession>) => {
    unifiedSessionStorage.updateSession(updates)
    const updated = unifiedSessionStorage.getSession()
    setSessionState(updated)
    dispatchSessionChange()
  }, [])

  // Clear session
  const clearSession = useCallback(() => {
    unifiedSessionStorage.clearSession()
    setSessionState(null)
    dispatchSessionChange()
  }, [])

  // Refresh from storage
  const refresh = useCallback(() => {
    loadSession()
  }, [loadSession])

  return {
    session,
    setSession,
    updateSession,
    clearSession,
    isLoading,
    refresh
  }
}

/**
 * Hook for session existence check (lightweight)
 *
 * Use this when you only need to know if a session exists,
 * not the full session data
 */
export function useHasSession(): boolean {
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const checkSession = () => {
      const session = unifiedSessionStorage.getSession()
      setHasSession(session !== null)
    }

    checkSession()

    window.addEventListener(SESSION_CHANGE_EVENT, checkSession)
    return () => window.removeEventListener(SESSION_CHANGE_EVENT, checkSession)
  }, [])

  return hasSession
}

/**
 * Hook for specific session field (performance optimization)
 *
 * Only re-renders when the specific field changes
 */
export function useSessionField<K extends keyof TabsySession>(
  field: K
): TabsySession[K] | undefined {
  const [value, setValue] = useState<TabsySession[K] | undefined>()

  useEffect(() => {
    const updateValue = () => {
      const session = unifiedSessionStorage.getSession()
      setValue(session?.[field])
    }

    updateValue()

    window.addEventListener(SESSION_CHANGE_EVENT, updateValue)
    return () => window.removeEventListener(SESSION_CHANGE_EVENT, updateValue)
  }, [field])

  return value
}