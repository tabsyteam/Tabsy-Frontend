export * from "./client"
export * from "./endpoints/auth"
export * from "./endpoints/restaurant"
export * from "./endpoints/menu"
export * from "./endpoints/menu-item-options"
export * from "./endpoints/table"
export * from "./endpoints/order"
export * from "./endpoints/payment"
export * from "./endpoints/payment-metrics"
export * from "./endpoints/user"
export * from "./endpoints/notification"
export * from "./endpoints/session"
export * from "./endpoints/table-session"
export * from "./endpoints/restaurant-table-session"
export * from "./endpoints/qr-access"
export * from "./endpoints/health"
export * from "./endpoints/feedback"
export * from "./endpoints/admin"

// WebSocket exports
export * from './websocket'

// Import all endpoint classes
import { TabsyApiClient, type ApiClientConfig } from './client'
import { AuthAPI } from './endpoints/auth'
import { RestaurantAPI } from './endpoints/restaurant'
import { MenuAPI } from './endpoints/menu'
import { MenuItemOptionsAPI } from './endpoints/menu-item-options'
import { TableAPI } from './endpoints/table'
import { OrderAPI } from './endpoints/order'
import { PaymentAPI } from './endpoints/payment'
import { PaymentMetricsAPI } from './endpoints/payment-metrics'
import { UserAPI } from './endpoints/user'
import { NotificationAPI } from './endpoints/notification'
import { SessionAPI } from './endpoints/session'
import { TableSessionAPI } from './endpoints/table-session'
import { RestaurantTableSessionAPI } from './endpoints/restaurant-table-session'
import { QRAccessAPI } from './endpoints/qr-access'
import { HealthAPI } from './endpoints/health'
import { FeedbackAPI } from './endpoints/feedback'
import { AdminAPI } from './endpoints/admin'

/**
 * Main Tabsy API client that provides access to all endpoints
 */
export class TabsyAPI {
  private client: TabsyApiClient

  // Real API endpoint implementations
  public auth: AuthAPI
  public restaurant: RestaurantAPI
  public menu: MenuAPI
  public menuItemOptions: MenuItemOptionsAPI
  public table: TableAPI
  public order: OrderAPI
  public payment: PaymentAPI
  public paymentMetrics: PaymentMetricsAPI
  public user: UserAPI
  public notification: NotificationAPI
  public session: SessionAPI
  public tableSession: TableSessionAPI
  public restaurantTableSession: RestaurantTableSessionAPI
  public qr: QRAccessAPI
  public health: HealthAPI
  public feedback: FeedbackAPI
  public admin: AdminAPI

  constructor(config?: ApiClientConfig) {
    this.client = new TabsyApiClient(config)

    // Initialize all API endpoint classes
    this.auth = new AuthAPI(this.client)
    this.restaurant = new RestaurantAPI(this.client)
    this.menu = new MenuAPI(this.client)
    this.menuItemOptions = new MenuItemOptionsAPI(this.client)
    this.table = new TableAPI(this.client)
    this.order = new OrderAPI(this.client)
    this.payment = new PaymentAPI(this.client)
    this.paymentMetrics = new PaymentMetricsAPI(this.client)
    this.user = new UserAPI(this.client)
    this.notification = new NotificationAPI(this.client)
    this.session = new SessionAPI(this.client)
    this.tableSession = new TableSessionAPI(this.client)
    this.restaurantTableSession = new RestaurantTableSessionAPI(this.client)
    this.qr = new QRAccessAPI(this.client)
    this.health = new HealthAPI(this.client)
    this.feedback = new FeedbackAPI(this.client)
    this.admin = new AdminAPI(this.client)
  }

  // Core client methods
  setAuthToken(token: string): void {
    this.client.setAuthToken(token)
  }

  clearAuthToken(): void {
    this.client.clearAuthToken()
  }

  getAuthToken(): string | null {
    return this.client.getAuthToken()
  }

  setGuestSession(sessionId: string): void {
    this.client.setGuestSession(sessionId)
  }

  clearGuestSession(): void {
    this.client.clearGuestSession()
  }

  getGuestSessionId(): string | null {
    return this.client.getGuestSessionId()
  }


  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck()
  }
}

/**
 * Factory function to create a Tabsy API client
 */
export function createTabsyClient(config?: ApiClientConfig): TabsyAPI {
  return new TabsyAPI(config)
}

/**
 * Helper to get base URL from environment
 */
function getBaseURLFromEnv(): string | undefined {
  // Check if we're in a browser context with Next.js env vars
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    return (window as any).process.env.NEXT_PUBLIC_API_URL || (window as any).process.env.NEXT_PUBLIC_API_BASE_URL
  }

  // Check if we're in Node.js context (SSR) with process.env
  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) {
    return (globalThis as any).process.env.NEXT_PUBLIC_API_URL || (globalThis as any).process.env.NEXT_PUBLIC_API_BASE_URL
  }

  return undefined
}

/**
 * Default client instance for convenience
 * Automatically reads from environment variables if available
 */
export const tabsyClient = createTabsyClient({
  baseURL: getBaseURLFromEnv()
})
