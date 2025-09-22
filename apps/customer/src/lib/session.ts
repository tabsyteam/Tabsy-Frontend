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
const SESSION_DURATION = 3 * 60 * 60 * 1000 // 3 hours (matches backend table session expiry)

export class SessionManager {
  // Dining Session Management
  static setDiningSession(session: Omit<DiningSession, 'lastActivity'> & { createdAt?: number }): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return
    }

    const now = Date.now()
    const diningSession: DiningSession = {
      ...session,
      createdAt: session.createdAt || now,
      lastActivity: now
    }

    try {
      sessionStorage.setItem(DINING_SESSION_KEY, JSON.stringify(diningSession))
    } catch (error) {
      console.warn('Failed to save dining session:', error)
    }
  }

  static getDiningSession(): DiningSession | null {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return null
    }

    try {
      const stored = sessionStorage.getItem(DINING_SESSION_KEY)
      if (!stored) return null

      const session: DiningSession = JSON.parse(stored)
      const now = Date.now()

      // Check if session is expired
      if (now - session.createdAt > SESSION_DURATION) {
        this.clearDiningSession()
        return null
      }

      // Update last activity
      session.lastActivity = now
      sessionStorage.setItem(DINING_SESSION_KEY, JSON.stringify(session))

      return session
    } catch (error) {
      console.warn('Failed to get dining session:', error)
      return null
    }
  }

  static updateLastActivity(): void {
    const session = this.getDiningSession()
    if (session) {
      session.lastActivity = Date.now()
      sessionStorage.setItem(DINING_SESSION_KEY, JSON.stringify(session))
    }
  }

  static clearDiningSession(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return
    }

    try {
      sessionStorage.removeItem(DINING_SESSION_KEY)
    } catch (error) {
      console.warn('Failed to clear dining session:', error)
    }
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
  static getDiningQueryParams(): string {
    const session = this.getDiningSession()
    if (!session) return ''

    const params = new URLSearchParams({
      restaurant: session.restaurantId,
      table: session.tableId
    })
    return `?${params.toString()}`
  }

  static getSessionFromUrl(searchParams: URLSearchParams): { restaurantId: string; tableId: string } | null {
    const restaurantId = searchParams.get('restaurant')
    const tableId = searchParams.get('table')

    // Validate that parameters exist and are not null/empty
    if (restaurantId && tableId &&
        restaurantId !== 'null' && tableId !== 'null' &&
        restaurantId.trim() !== '' && tableId.trim() !== '') {
      return { restaurantId, tableId }
    }

    return null
  }

  // Helper method to validate URL parameters
  static validateUrlParams(params: { restaurant?: string | null; table?: string | null }): boolean {
    const { restaurant, table } = params
    return !!(restaurant && table &&
             restaurant !== 'null' && table !== 'null' &&
             restaurant.trim() !== '' && table.trim() !== '')
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

  // Session expiry helpers
  static getTimeUntilExpiry(): number | null {
    const session = this.getDiningSession()
    if (!session) return null

    const now = Date.now()
    const expiryTime = session.createdAt + SESSION_DURATION
    return Math.max(0, expiryTime - now)
  }

  static getMinutesUntilExpiry(): number | null {
    const timeUntilExpiry = this.getTimeUntilExpiry()
    if (timeUntilExpiry === null) return null

    return Math.ceil(timeUntilExpiry / (60 * 1000))
  }

  static isSessionExpiringSoon(warningThresholdMinutes = 30): boolean {
    const minutesUntilExpiry = this.getMinutesUntilExpiry()
    if (minutesUntilExpiry === null) return false

    return minutesUntilExpiry <= warningThresholdMinutes && minutesUntilExpiry > 0
  }

  static isSessionExpired(): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry()
    if (timeUntilExpiry === null) return false

    return timeUntilExpiry <= 0
  }

  // Get session expiry info for UI display
  static getSessionExpiryInfo(): {
    isExpired: boolean
    isExpiringSoon: boolean
    minutesRemaining: number | null
    expiryTime: Date | null
  } {
    const session = this.getDiningSession()
    if (!session) {
      return {
        isExpired: true,
        isExpiringSoon: false,
        minutesRemaining: null,
        expiryTime: null
      }
    }

    const minutesRemaining = this.getMinutesUntilExpiry()
    const expiryTime = new Date(session.createdAt + SESSION_DURATION)
    const isExpired = this.isSessionExpired()
    const isExpiringSoon = this.isSessionExpiringSoon()

    return {
      isExpired,
      isExpiringSoon,
      minutesRemaining,
      expiryTime
    }
  }

  // Handle session expiry gracefully
  static handleSessionExpiry(): void {
    this.clearDiningSession()
    this.clearCurrentOrder()
    this.clearOrderHistory()

    // Redirect to home or show expiry message
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      if (currentPath !== '/' && !currentPath.startsWith('/table/')) {
        window.location.href = '/'
      }
    }
  }
}

// Auto-cleanup on initialization
if (typeof window !== 'undefined') {
  SessionManager.cleanup()
}

export default SessionManager