import { unifiedSessionStorage, dualReadSession, type TabsySession } from './unifiedSessionStorage'
import type { TabsyAPI } from '@tabsy/api-client'

interface DiningSession {
  restaurantId: string
  tableId: string
  restaurantName?: string
  tableName?: string
  sessionId?: string
  tableSessionId?: string
  createdAt: number
  lastActivity: number
}

interface OrderSession {
  orderId: string
  orderNumber: string
  status: string
  createdAt: number
}

interface OrderHistory {
  orderIds: string[]
  lastUpdated: number
}

const DINING_SESSION_KEY = 'tabsy-dining-session'
const ORDER_SESSION_KEY = 'tabsy-current-order'
const ORDER_HISTORY_KEY = 'tabsy-order-history'
const SESSION_DURATION = 2 * 60 * 60 * 1000 // 2 hours (matches backend guest session expiry - CRITICAL: must match backend SESSION_EXPIRY_TIME)

/**
 * SessionManager - Facade Pattern (Phase 1)
 *
 * This class now acts as a facade over unifiedSessionStorage.
 * All dining session operations delegate to the unified storage layer internally.
 *
 * Architecture:
 * - Public API: SessionManager (this file) - stable interface for components
 * - Internal: unifiedSessionStorage - actual storage implementation
 *
 * This allows us to evolve storage without breaking components.
 */
export class SessionManager {
  // Dining Session Management
  static setDiningSession(session: Omit<DiningSession, 'lastActivity'> & { createdAt?: number }): void {
    // Facade: Delegate to unified storage
    const now = Date.now()
    const tabsySession: TabsySession = {
      guestSessionId: session.sessionId || '',
      tableSessionId: session.tableSessionId || '',
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      createdAt: session.createdAt || now,
      lastActivity: now,
      metadata: {
        restaurantName: session.restaurantName,
        tableName: session.tableName
      }
    }

    unifiedSessionStorage.setSession(tabsySession)
  }

  static getDiningSession(): DiningSession | null {
    // Facade: Delegate to unified storage (with backward-compatible properties)
    const session = dualReadSession()
    if (!session) return null

    // Convert TabsySession to DiningSession format for backward compatibility
    return {
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      restaurantName: session.restaurantName,
      tableName: session.tableName,
      sessionId: session.sessionId,
      tableSessionId: session.tableSessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    }
  }

  static updateLastActivity(): void {
    // Facade: Delegate to unified storage
    const session = unifiedSessionStorage.getSession()
    if (session) {
      session.lastActivity = Date.now()
      unifiedSessionStorage.setSession(session)
    }
  }

  /**
   * Extend table session on backend (extends by 30 minutes)
   * Also updates local lastActivity timestamp
   *
   * @param apiClient Optional API client instance (injected for testability and to avoid circular deps)
   * @returns Promise<boolean> - true if successfully extended, false otherwise
   */
  static async extendSession(apiClient?: TabsyAPI): Promise<boolean> {
    const session = this.getDiningSession()
    if (!session?.tableSessionId) {
      console.error('[SessionManager] Cannot extend session: no tableSessionId')
      return false
    }

    try {
      // Use injected API client if provided, otherwise import default client
      // Note: Dependency injection preferred for better testability and to avoid circular dependencies
      let client = apiClient
      if (!client) {
        const { tabsyClient } = await import('@tabsy/api-client')
        client = tabsyClient
      }

      console.log('[SessionManager] Extending table session:', session.tableSessionId)

      const response = await client.tableSession.extend(session.tableSessionId)

      // Handle session closed error specifically
      if (!response.success && response.error?.code === 'SESSION_CLOSED') {
        console.warn('[SessionManager] ⚠️ Session is closed on backend - cleaning up frontend state')

        // Clear invalid session data (skip redirect - let UI handle it with message)
        this.handleSessionExpiry(true)

        // Return false to indicate extension failed
        return false
      }

      if (response.success && response.data) {
        console.log('[SessionManager] ✅ Session extended successfully')
        console.log('[SessionManager] Backend response:', response.data)

        // ✅ FIX: Store backend's expiresAt timestamp in session storage
        // This ensures the countdown timer uses the actual backend expiry time
        const currentSession = unifiedSessionStorage.getSession()
        if (currentSession && response.data.expiresAt) {
          const expiresAtTimestamp = new Date(response.data.expiresAt).getTime()

          console.log('[SessionManager] Before update:', {
            oldExpiresAt: currentSession.expiresAt,
            newExpiresAt: expiresAtTimestamp,
            newExpiresAtDate: new Date(expiresAtTimestamp).toISOString()
          })

          currentSession.expiresAt = expiresAtTimestamp
          currentSession.lastActivity = Date.now()
          unifiedSessionStorage.setSession(currentSession)

          // Verify it was stored
          const verifySession = unifiedSessionStorage.getSession()
          console.log('[SessionManager] After update verification:', {
            storedExpiresAt: verifySession?.expiresAt,
            storedExpiresAtDate: verifySession?.expiresAt ? new Date(verifySession.expiresAt).toISOString() : 'none'
          })

          // Check expiry info calculation
          const expiryInfo = unifiedSessionStorage.getSessionExpiryInfo()
          console.log('[SessionManager] New expiry info:', {
            minutesRemaining: expiryInfo.minutesRemaining,
            expiryTime: expiryInfo.expiryTime?.toISOString(),
            isExpiringSoon: expiryInfo.isExpiringSoon
          })
        }

        return true
      } else {
        console.error('[SessionManager] Failed to extend session:', response.error)

        // Handle other session-related errors
        if (response.error?.code === 'SESSION_NOT_FOUND' ||
            response.error?.code === 'SESSION_EXPIRED' ||
            response.error?.code === 'INVALID_SESSION') {
          console.warn('[SessionManager] ⚠️ Session invalid - cleaning up frontend state')
          this.handleSessionExpiry(true)  // Skip redirect - let UI handle it with message
        }

        return false
      }
    } catch (error: any) {
      console.error('[SessionManager] Error extending session:', error)

      // Handle network errors or session-related exceptions
      if (error?.code === 'SESSION_CLOSED' ||
          error?.code === 'SESSION_NOT_FOUND' ||
          error?.code === 'SESSION_EXPIRED') {
        console.warn('[SessionManager] ⚠️ Session error in catch - cleaning up frontend state')
        this.handleSessionExpiry(true)  // Skip redirect - let UI handle it with message
      }

      return false
    }
  }

  static clearDiningSession(): void {
    // Facade: Delegate to unified storage
    unifiedSessionStorage.clearSession()
  }

  static hasDiningSession(): boolean {
    return this.getDiningSession() !== null
  }

  // Order Session Management
  static setCurrentOrder(order: OrderSession): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return
    }

    try {
      sessionStorage.setItem(ORDER_SESSION_KEY, JSON.stringify(order))
    } catch (error) {
      console.warn('Failed to save current order:', error)
    }
  }

  static getCurrentOrder(): OrderSession | null {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return null
    }

    try {
      const stored = sessionStorage.getItem(ORDER_SESSION_KEY)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.warn('Failed to get current order:', error)
      return null
    }
  }

  static clearCurrentOrder(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return
    }

    try {
      sessionStorage.removeItem(ORDER_SESSION_KEY)
    } catch (error) {
      console.warn('Failed to clear current order:', error)
    }
  }

  static hasCurrentOrder(): boolean {
    return this.getCurrentOrder() !== null
  }

  // URL Parameter Helpers
  // URL & Navigation Helpers - Delegate to unified storage
  static getDiningQueryParams(): string {
    return unifiedSessionStorage.getDiningQueryParams()
  }

  static getSessionFromUrl(searchParams: URLSearchParams): { restaurantId: string; tableId: string } | null {
    return unifiedSessionStorage.getSessionFromUrl(searchParams)
  }

  static validateUrlParams(params: { restaurant?: string | null; table?: string | null }): boolean {
    return unifiedSessionStorage.validateUrlParams(params)
  }

  // Order History Management
  static addOrderToHistory(orderId: string): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return
    }

    try {
      const history = this.getOrderHistory()

      // Add the new order ID if it's not already in the list
      if (!history.orderIds.includes(orderId)) {
        history.orderIds.push(orderId)
        history.lastUpdated = Date.now()
        sessionStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history))
      }
    } catch (error) {
      console.warn('Failed to add order to history:', error)
    }
  }

  static getOrderHistory(): OrderHistory {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return { orderIds: [], lastUpdated: Date.now() }
    }

    try {
      const stored = sessionStorage.getItem(ORDER_HISTORY_KEY)
      if (!stored) {
        return { orderIds: [], lastUpdated: Date.now() }
      }

      const history: OrderHistory = JSON.parse(stored)
      const now = Date.now()

      // Check if history is expired
      if (now - history.lastUpdated > SESSION_DURATION) {
        this.clearOrderHistory()
        return { orderIds: [], lastUpdated: Date.now() }
      }

      return history
    } catch (error) {
      console.warn('Failed to get order history:', error)
      return { orderIds: [], lastUpdated: Date.now() }
    }
  }

  static clearOrderHistory(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return
    }

    try {
      sessionStorage.removeItem(ORDER_HISTORY_KEY)
    } catch (error) {
      console.warn('Failed to clear order history:', error)
    }
  }

  static hasOrderHistory(): boolean {
    const history = this.getOrderHistory()
    return history.orderIds.length > 0
  }

  // Navigation Helpers
  static canAccessOrders(): boolean {
    // Users can access orders if they have a dining session, current order, or order history
    return this.hasDiningSession() || this.hasCurrentOrder() || this.hasOrderHistory()
  }

  static getHomeUrl(): string {
    const session = this.getDiningSession()
    if (session) {
      return `/menu?restaurant=${session.restaurantId}&table=${session.tableId}`
    }
    return '/'
  }

  static getOrdersUrl(): string {
    const session = this.getDiningSession()
    const queryParams = this.getDiningQueryParams()

    // Always use the unified orders page with view toggle
    // Users can switch between "My Orders" and "Table Orders" tabs
    if (session) {
      // If in table session, default to table view but allow switching
      return `/orders${queryParams}&view=table`
    }

    // If not in session, show individual order history
    // Handle empty queryParams properly
    const separator = queryParams ? '&' : '?'
    return `/orders${queryParams}${separator}view=my`
  }

  static getMenuUrl(): string {
    const queryParams = this.getDiningQueryParams()
    return `/menu${queryParams}`
  }

  // Clean up expired sessions
  static cleanup(): void {
    const session = this.getDiningSession()
    if (!session) {
      this.clearDiningSession()
    }
  }

  // Session expiry helpers - Delegate to unified storage
  static getTimeUntilExpiry(): number | null {
    return unifiedSessionStorage.getTimeUntilExpiry()
  }

  static getMinutesUntilExpiry(): number | null {
    return unifiedSessionStorage.getMinutesUntilExpiry()
  }

  static isSessionExpiringSoon(warningThresholdMinutes = 30): boolean {
    return unifiedSessionStorage.isSessionExpiringSoon(warningThresholdMinutes)
  }

  static isSessionExpired(): boolean {
    return unifiedSessionStorage.isSessionExpired()
  }

  static getSessionExpiryInfo(): {
    isExpired: boolean
    isExpiringSoon: boolean
    minutesRemaining: number | null
    expiryTime: Date | null
  } {
    return unifiedSessionStorage.getSessionExpiryInfo()
  }

  // Handle session expiry gracefully
  static handleSessionExpiry(skipRedirect: boolean = false): void {
    this.clearDiningSession()
    this.clearCurrentOrder()
    this.clearOrderHistory()

    // Redirect to home or show expiry message (unless caller wants to handle redirect)
    if (!skipRedirect && typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      if (currentPath !== '/' && !currentPath.startsWith('/table/')) {
        window.location.href = '/'
      }
    }
  }

  // Clear all session data - Delegate to unified storage + clear orders
  static clearAllSessionData(): void {
    // Clear session data via unified storage
    unifiedSessionStorage.clearAllSessionData()

    // Clear order-specific data
    this.clearCurrentOrder()
    this.clearOrderHistory()
  }

  // Check if session is being replaced
  static isSessionReplaced(): boolean {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return false
    }

    const isReplaced = sessionStorage.getItem('tabsy-session-replaced') === 'true'
    return isReplaced
  }

  // Mark session as replaced
  static markSessionAsReplaced(): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return
    }

    sessionStorage.setItem('tabsy-session-replaced', 'true')

    // Clear the flag after a short time to prevent persistent issues
    setTimeout(() => {
      sessionStorage.removeItem('tabsy-session-replaced')
    }, 5000)
  }

  // Validate session compatibility for table operations
  static validateTableSessionContext(tableSessionId?: string): {
    isValid: boolean
    error?: string
    suggestion?: string
  } {
    const session = this.getDiningSession()

    if (!session) {
      return {
        isValid: false,
        error: 'No active dining session found',
        suggestion: 'Please scan the QR code at your table to join the session'
      }
    }

    if (tableSessionId && session.tableSessionId && session.tableSessionId !== tableSessionId) {
      return {
        isValid: false,
        error: 'Table session mismatch',
        suggestion: 'You appear to be connected to a different table session. Please scan the correct QR code.'
      }
    }

    // Check if session is about to expire (within 15 minutes)
    const expiryInfo = this.getSessionExpiryInfo()
    if (expiryInfo.isExpiringSoon && expiryInfo.minutesRemaining !== null && expiryInfo.minutesRemaining < 15) {
      return {
        isValid: true,
        error: `Session expires in ${expiryInfo.minutesRemaining} minutes`,
        suggestion: 'Consider completing your actions soon or refresh your session'
      }
    }

    return { isValid: true }
  }

  // Enhanced session debugging helper
  static getSessionDebugInfo(): {
    hasDiningSession: boolean
    sessionId?: string
    tableSessionId?: string
    tableId?: string
    restaurantId?: string
    isExpired: boolean
    minutesRemaining: number | null
    lastActivity?: string
  } {
    const session = this.getDiningSession()
    const expiryInfo = this.getSessionExpiryInfo()

    return {
      hasDiningSession: !!session,
      sessionId: session?.sessionId,
      tableSessionId: session?.tableSessionId,
      tableId: session?.tableId,
      restaurantId: session?.restaurantId,
      isExpired: expiryInfo.isExpired,
      minutesRemaining: expiryInfo.minutesRemaining,
      lastActivity: session ? new Date(session.lastActivity).toISOString() : undefined
    }
  }

  // Session recovery helper - tries all possible sources
  static recoverSession(): {
    success: boolean
    sessionId: string | null
    source: string | null
  } {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return { success: false, sessionId: null, source: null }
    }

    // Try 1: Primary guest session ID
    const primarySessionId = sessionStorage.getItem('tabsy-guest-session-id')
    if (primarySessionId) {
      return { success: true, sessionId: primarySessionId, source: 'tabsy-guest-session-id' }
    }

    // Try 2: Dining session
    const diningSession = this.getDiningSession()
    if (diningSession?.sessionId) {
      // Restore to primary storage for consistency
      sessionStorage.setItem('tabsy-guest-session-id', diningSession.sessionId)
      return { success: true, sessionId: diningSession.sessionId, source: 'tabsy-dining-session' }
    }

    // Try 3: Check all tabsy-* keys as fallback
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('guestSession-')) {
          const fallbackSessionId = sessionStorage.getItem(key)
          if (fallbackSessionId) {
            // Restore to primary storage
            sessionStorage.setItem('tabsy-guest-session-id', fallbackSessionId)
            return { success: true, sessionId: fallbackSessionId, source: key }
          }
        }
      }
    } catch (error) {
      console.error('Error scanning sessionStorage for session recovery:', error)
    }

    return { success: false, sessionId: null, source: null }
  }

  // Session health check - validates session exists and is not expired
  static healthCheck(): {
    healthy: boolean
    issues: string[]
    warnings: string[]
  } {
    const issues: string[] = []
    const warnings: string[] = []

    // Check if session exists
    const session = this.getDiningSession()
    if (!session) {
      issues.push('No active dining session')
      return { healthy: false, issues, warnings }
    }

    // Check if session is expired
    const expiryInfo = this.getSessionExpiryInfo()
    if (expiryInfo.isExpired) {
      issues.push('Session has expired')
      return { healthy: false, issues, warnings }
    }

    // Check if session is expiring soon (within 30 minutes)
    if (expiryInfo.isExpiringSoon) {
      warnings.push(`Session expires in ${expiryInfo.minutesRemaining} minutes`)
    }

    // Check if guest session ID is in sessionStorage
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const storedSessionId = sessionStorage.getItem('tabsy-guest-session-id')
      if (!storedSessionId) {
        warnings.push('Guest session ID not found in sessionStorage')
      } else if (session.sessionId && storedSessionId !== session.sessionId) {
        warnings.push('Guest session ID mismatch between sessionStorage and dining session')
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings
    }
  }
}

// Auto-cleanup on initialization
if (typeof window !== 'undefined') {
  SessionManager.cleanup()
}

export default SessionManager