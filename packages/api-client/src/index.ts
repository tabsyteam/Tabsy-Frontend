export * from "./client"
export * from "./endpoints/auth"
export * from "./endpoints/restaurant"
export * from "./endpoints/menu"
export * from "./endpoints/menu-item-options"
export * from "./endpoints/table"
export * from "./endpoints/order"
export * from "./endpoints/payment"
export * from "./endpoints/user"
export * from "./endpoints/notification"
export * from "./endpoints/session"
export * from "./endpoints/qr-access"
export * from "./endpoints/health"
export * from "./endpoints/feedback"

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
import { UserAPI } from './endpoints/user'
import { NotificationAPI } from './endpoints/notification'
import { SessionAPI } from './endpoints/session'
import { QRAccessAPI } from './endpoints/qr-access'
import { HealthAPI } from './endpoints/health'
import { FeedbackAPI } from './endpoints/feedback'

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
  public user: UserAPI
  public notification: NotificationAPI
  public session: SessionAPI
  public qr: QRAccessAPI
  public health: HealthAPI
  public feedback: FeedbackAPI

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
    this.user = new UserAPI(this.client)
    this.notification = new NotificationAPI(this.client)
    this.session = new SessionAPI(this.client)
    this.qr = new QRAccessAPI(this.client)
    this.health = new HealthAPI(this.client)
    this.feedback = new FeedbackAPI(this.client)
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
 * Default client instance for convenience
 */
export const tabsyClient = createTabsyClient()
