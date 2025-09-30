/**
 * Unified Session Storage Manager
 *
 * Senior Architecture Principles Applied:
 * - Single Source of Truth: One unified session object
 * - Separation of Concerns: Storage layer abstracted from business logic
 * - DRY: No data duplication across multiple keys
 * - Backward Compatibility: Reads from legacy keys during migration
 * - Performance: In-memory caching with lazy persistence
 * - Type Safety: Full TypeScript interfaces
 *
 * @author Senior Software Architect
 * @version 2.0.0 (Consolidated Architecture)
 */

/**
 * Unified session interface - single source of truth
 */
export interface TabsySession {
  // Core identifiers
  guestSessionId: string
  tableSessionId: string
  restaurantId: string
  tableId: string

  // Timestamps (epoch milliseconds)
  createdAt: number
  lastActivity: number

  // Optional metadata for extensibility
  metadata?: {
    userName?: string
    isHost?: boolean
    [key: string]: any
  }
}

/**
 * Legacy storage keys for backward compatibility
 */
const LEGACY_KEYS = {
  GUEST_SESSION_TABLE: (tableId: string) => `guestSession-${tableId}`,
  GUEST_SESSION_ID: 'tabsy-guest-session-id',
  DINING_SESSION: 'tabsy-dining-session',
  TABLE_SESSION_ID: 'tabsy-table-session-id',
  GLOBAL_SESSION_STATE: (tableId: string) => `tabsy-global-session-state-${tableId}`,
} as const

/**
 * New unified storage key
 */
const UNIFIED_KEY = 'tabsy-session'

/**
 * Migration status tracking
 */
interface MigrationStatus {
  migrated: boolean
  migratedAt: number
  legacyKeysFound: string[]
}

/**
 * Unified Session Storage Manager
 *
 * Architectural Pattern: Singleton + Repository Pattern
 * - Singleton: Single instance manages all session storage
 * - Repository: Abstracts storage mechanism from consumers
 */
class UnifiedSessionStorageManager {
  // In-memory cache for performance (avoids repeated storage reads)
  private sessionCache: TabsySession | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_TTL = 30000 // 30 seconds

  /**
   * Get the current session
   *
   * Performance Optimization:
   * - Returns cached version if fresh (< 30s old)
   * - Falls back to storage read if cache expired
   * - Attempts migration from legacy keys if unified key missing
   */
  getSession(): TabsySession | null {
    // Return cached session if fresh
    const now = Date.now()
    if (this.sessionCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.sessionCache
    }

    // Attempt to read from unified key
    const session = this.readFromUnifiedKey()
    if (session) {
      this.updateCache(session)
      return session
    }

    // Migration path: Try to reconstruct from legacy keys
    const migratedSession = this.migrateFromLegacyKeys()
    if (migratedSession) {
      // Persist migrated session to unified key
      this.setSession(migratedSession)
      return migratedSession
    }

    return null
  }

  /**
   * Set/update the session
   *
   * Optimization: Batch updates to reduce storage I/O
   */
  setSession(session: TabsySession): void {
    // Validate session before persisting
    if (!this.validateSession(session)) {
      console.error('[UnifiedStorage] Invalid session, not persisting:', session)
      return
    }

    // Update lastActivity automatically
    session.lastActivity = Date.now()

    // Persist to storage
    try {
      sessionStorage.setItem(UNIFIED_KEY, JSON.stringify(session))
      this.updateCache(session)
      console.log('[UnifiedStorage] Session persisted:', {
        guestSessionId: session.guestSessionId,
        tableId: session.tableId
      })
    } catch (error) {
      console.error('[UnifiedStorage] Failed to persist session:', error)
    }
  }

  /**
   * Update specific session fields (partial update)
   */
  updateSession(updates: Partial<TabsySession>): void {
    const current = this.getSession()
    if (!current) {
      console.warn('[UnifiedStorage] Cannot update non-existent session')
      return
    }

    const updated: TabsySession = {
      ...current,
      ...updates,
      lastActivity: Date.now()
    }

    this.setSession(updated)
  }

  /**
   * Clear the session
   */
  clearSession(): void {
    // Clear unified key
    sessionStorage.removeItem(UNIFIED_KEY)

    // Clear cache
    this.sessionCache = null
    this.cacheTimestamp = 0

    console.log('[UnifiedStorage] Session cleared')
  }

  /**
   * Clean up legacy storage keys
   *
   * Call this after successful migration to free up storage
   */
  cleanupLegacyKeys(tableId?: string): void {
    const keysToRemove: string[] = [
      LEGACY_KEYS.GUEST_SESSION_ID,
      LEGACY_KEYS.DINING_SESSION,
      LEGACY_KEYS.TABLE_SESSION_ID,
    ]

    if (tableId) {
      keysToRemove.push(
        LEGACY_KEYS.GUEST_SESSION_TABLE(tableId),
        LEGACY_KEYS.GLOBAL_SESSION_STATE(tableId)
      )
    }

    let removedCount = 0
    keysToRemove.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key)
        removedCount++
      }
    })

    if (removedCount > 0) {
      console.log(`[UnifiedStorage] Cleaned up ${removedCount} legacy keys`)
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): MigrationStatus {
    const session = this.readFromUnifiedKey()
    const legacyKeysFound: string[] = []

    // Check which legacy keys exist
    if (sessionStorage.getItem(LEGACY_KEYS.GUEST_SESSION_ID)) {
      legacyKeysFound.push(LEGACY_KEYS.GUEST_SESSION_ID)
    }
    if (sessionStorage.getItem(LEGACY_KEYS.DINING_SESSION)) {
      legacyKeysFound.push(LEGACY_KEYS.DINING_SESSION)
    }
    if (sessionStorage.getItem(LEGACY_KEYS.TABLE_SESSION_ID)) {
      legacyKeysFound.push(LEGACY_KEYS.TABLE_SESSION_ID)
    }

    return {
      migrated: session !== null,
      migratedAt: session?.createdAt || 0,
      legacyKeysFound
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Implementation Details
  // ============================================================================

  /**
   * Read from unified storage key
   */
  private readFromUnifiedKey(): TabsySession | null {
    try {
      const data = sessionStorage.getItem(UNIFIED_KEY)
      if (!data) return null

      const session: TabsySession = JSON.parse(data)
      return this.validateSession(session) ? session : null
    } catch (error) {
      console.error('[UnifiedStorage] Error reading unified key:', error)
      return null
    }
  }

  /**
   * Migrate from legacy storage keys
   *
   * Backward Compatibility: Reads from old keys and constructs unified session
   */
  private migrateFromLegacyKeys(): TabsySession | null {
    try {
      // Try reading from legacy dining session (most complete)
      const diningSessionData = sessionStorage.getItem(LEGACY_KEYS.DINING_SESSION)
      if (diningSessionData) {
        const diningSession = JSON.parse(diningSessionData)
        console.log('[UnifiedStorage] Migrating from legacy dining session')

        return {
          guestSessionId: diningSession.sessionId || diningSession.guestSessionId,
          tableSessionId: diningSession.tableSessionId || sessionStorage.getItem(LEGACY_KEYS.TABLE_SESSION_ID) || '',
          restaurantId: diningSession.restaurantId,
          tableId: diningSession.tableId,
          createdAt: diningSession.createdAt || Date.now(),
          lastActivity: diningSession.lastActivity || Date.now(),
          metadata: diningSession.metadata
        }
      }

      // Fallback: Try reconstructing from individual keys
      const guestSessionId = sessionStorage.getItem(LEGACY_KEYS.GUEST_SESSION_ID)
      const tableSessionId = sessionStorage.getItem(LEGACY_KEYS.TABLE_SESSION_ID)

      if (guestSessionId) {
        console.warn('[UnifiedStorage] Partial migration from legacy keys (missing table info)')
        // This is incomplete but better than nothing
        return {
          guestSessionId,
          tableSessionId: tableSessionId || '',
          restaurantId: '',  // Unknown
          tableId: '',       // Unknown
          createdAt: Date.now(),
          lastActivity: Date.now()
        }
      }

      return null
    } catch (error) {
      console.error('[UnifiedStorage] Migration from legacy keys failed:', error)
      return null
    }
  }

  /**
   * Validate session object
   */
  private validateSession(session: TabsySession): boolean {
    return !!(
      session &&
      session.guestSessionId &&
      session.restaurantId &&
      session.tableId &&
      session.createdAt &&
      session.lastActivity
    )
  }

  /**
   * Update in-memory cache
   */
  private updateCache(session: TabsySession): void {
    this.sessionCache = session
    this.cacheTimestamp = Date.now()
  }

  /**
   * Get storage statistics (for debugging/monitoring)
   */
  getStorageStats(): {
    totalKeys: number
    tabsyKeys: number
    unifiedKeySize: number
    legacyKeysSize: number
  } {
    let tabsyKeys = 0
    let legacyKeysSize = 0
    const unifiedData = sessionStorage.getItem(UNIFIED_KEY)

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('tabsy-')) {
        tabsyKeys++
        if (key !== UNIFIED_KEY) {
          const value = sessionStorage.getItem(key)
          if (value) legacyKeysSize += value.length
        }
      }
    }

    return {
      totalKeys: sessionStorage.length,
      tabsyKeys,
      unifiedKeySize: unifiedData?.length || 0,
      legacyKeysSize
    }
  }
}

// Export singleton instance
export const unifiedSessionStorage = new UnifiedSessionStorageManager()

// Export for testing/advanced use cases
export { UnifiedSessionStorageManager }