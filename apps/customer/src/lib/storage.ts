/**
 * Centralized Storage Manager
 *
 * Provides a unified interface for all storage operations across the application.
 * This abstraction:
 * - Prevents direct storage.setItem/getItem calls scattered throughout code
 * - Enforces consistent key naming
 * - Provides type safety for stored data
 * - Makes it easy to migrate storage mechanisms in the future
 *
 * @version 1.0.0
 */

import { unifiedSessionStorage, TabsySession } from './unifiedSessionStorage'
import { STORAGE_KEYS } from '@/constants/storage'

/**
 * Cart item interface
 */
interface CartItem {
  id: string
  cartItemId: string
  name: string
  description: string
  basePrice: number
  imageUrl?: string
  categoryName: string
  quantity: number
  customizations?: Record<string, any>
  options?: Array<{
    optionId: string
    valueId: string
    optionName: string
    valueName: string
    price: number
  }>
  specialInstructions?: string
}

/**
 * Menu cache data
 */
interface MenuCacheData {
  categories: any[]
  items: any[]
  restaurant: any
  cachedAt: number
}

/**
 * Order history item
 */
interface OrderHistoryItem {
  orderId: string
  orderNumber: string
  status: string
  createdAt: number
  total?: number
}

/**
 * Guest information
 */
interface GuestInfo {
  name: string
  phone: string
  email: string
}

/**
 * Centralized Storage Manager
 *
 * Usage:
 * ```typescript
 * import { AppStorage } from '@/lib/storage'
 *
 * // Session operations
 * const session = AppStorage.session.get()
 * AppStorage.session.set(sessionData)
 *
 * // Cart operations
 * const cart = AppStorage.cart.get()
 * AppStorage.cart.add(item)
 * ```
 */
export const AppStorage = {
  /**
   * Session Storage Operations
   * Uses the unified session storage system
   */
  session: {
    /**
     * Get current session
     */
    get(): TabsySession | null {
      return unifiedSessionStorage.getSession()
    },

    /**
     * Set/update session
     */
    set(session: TabsySession): void {
      unifiedSessionStorage.setSession(session)
    },

    /**
     * Update specific session fields
     */
    update(updates: Partial<TabsySession>): void {
      unifiedSessionStorage.updateSession(updates)
    },

    /**
     * Clear session
     */
    clear(): void {
      unifiedSessionStorage.clearSession()
    },

    /**
     * Get storage statistics
     */
    getStats() {
      return unifiedSessionStorage.getStorageStats()
    },

    /**
     * Clean up legacy keys
     */
    cleanupLegacy(tableId?: string): void {
      unifiedSessionStorage.cleanupLegacyKeys(tableId)
    }
  },

  /**
   * Cart Storage Operations
   * Cart is stored in localStorage for persistence across sessions
   */
  cart: {
    /**
     * Get cart items
     */
    get(): CartItem[] {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CART)
        return stored ? JSON.parse(stored) : []
      } catch (error) {
        console.error('[AppStorage] Error reading cart:', error)
        return []
      }
    },

    /**
     * Set cart items
     */
    set(cart: CartItem[]): void {
      try {
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart))
      } catch (error) {
        console.error('[AppStorage] Error saving cart:', error)
      }
    },

    /**
     * Add item to cart
     */
    add(item: CartItem): void {
      const cart = this.get()
      cart.push(item)
      this.set(cart)
    },

    /**
     * Update cart item
     */
    update(cartItemId: string, updates: Partial<CartItem>): void {
      const cart = this.get()
      const index = cart.findIndex(item => item.cartItemId === cartItemId)
      if (index !== -1) {
        cart[index] = { ...cart[index], ...updates }
        this.set(cart)
      }
    },

    /**
     * Remove item from cart
     */
    remove(cartItemId: string): void {
      const cart = this.get().filter(item => item.cartItemId !== cartItemId)
      this.set(cart)
    },

    /**
     * Clear entire cart
     */
    clear(): void {
      localStorage.removeItem(STORAGE_KEYS.CART)
    },

    /**
     * Get cart item count
     */
    getCount(): number {
      return this.get().reduce((total, item) => total + item.quantity, 0)
    },

    /**
     * Get cart total
     */
    getTotal(): number {
      return this.get().reduce((total, item) => {
        const optionsPrice = item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0
        return total + (item.basePrice + optionsPrice) * item.quantity
      }, 0)
    }
  },

  /**
   * Menu Cache Operations
   * Caches menu data to reduce API calls
   */
  menu: {
    /**
     * Get cached menu for restaurant
     */
    get(restaurantId: string): MenuCacheData | null {
      try {
        const key = STORAGE_KEYS.MENU_CACHE(restaurantId)
        const stored = sessionStorage.getItem(key)
        if (!stored) return null

        const cached: MenuCacheData = JSON.parse(stored)

        // Check if cache is still valid (30 minutes)
        const cacheAge = Date.now() - cached.cachedAt
        const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

        if (cacheAge > CACHE_DURATION) {
          this.clear(restaurantId)
          return null
        }

        return cached
      } catch (error) {
        console.error('[AppStorage] Error reading menu cache:', error)
        return null
      }
    },

    /**
     * Set menu cache
     */
    set(restaurantId: string, menuData: Omit<MenuCacheData, 'cachedAt'>): void {
      try {
        const key = STORAGE_KEYS.MENU_CACHE(restaurantId)
        const cacheData: MenuCacheData = {
          ...menuData,
          cachedAt: Date.now()
        }
        sessionStorage.setItem(key, JSON.stringify(cacheData))
      } catch (error) {
        console.error('[AppStorage] Error saving menu cache:', error)
      }
    },

    /**
     * Clear menu cache
     */
    clear(restaurantId: string): void {
      const key = STORAGE_KEYS.MENU_CACHE(restaurantId)
      sessionStorage.removeItem(key)
    },

    /**
     * Clear all menu caches
     */
    clearAll(): void {
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.startsWith('tabsy-menu-cache-')) {
          sessionStorage.removeItem(key)
        }
      })
    }
  },

  /**
   * Order Operations
   * Stores current order and order history
   */
  order: {
    /**
     * Get current order
     */
    getCurrent(): any | null {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEYS.CURRENT_ORDER)
        return stored ? JSON.parse(stored) : null
      } catch (error) {
        console.error('[AppStorage] Error reading current order:', error)
        return null
      }
    },

    /**
     * Set current order
     */
    setCurrent(order: any): void {
      try {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_ORDER, JSON.stringify(order))
      } catch (error) {
        console.error('[AppStorage] Error saving current order:', error)
      }
    },

    /**
     * Clear current order
     */
    clearCurrent(): void {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER)
    },

    /**
     * Get order history
     */
    getHistory(): OrderHistoryItem[] {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEYS.ORDER_HISTORY)
        return stored ? JSON.parse(stored) : []
      } catch (error) {
        console.error('[AppStorage] Error reading order history:', error)
        return []
      }
    },

    /**
     * Add order to history
     */
    addToHistory(order: OrderHistoryItem): void {
      const history = this.getHistory()
      history.push(order)
      try {
        sessionStorage.setItem(STORAGE_KEYS.ORDER_HISTORY, JSON.stringify(history))
      } catch (error) {
        console.error('[AppStorage] Error saving order history:', error)
      }
    },

    /**
     * Clear order history
     */
    clearHistory(): void {
      sessionStorage.removeItem(STORAGE_KEYS.ORDER_HISTORY)
    }
  },

  /**
   * Special Instructions
   */
  specialInstructions: {
    /**
     * Get special instructions
     */
    get(): string {
      return sessionStorage.getItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS) || ''
    },

    /**
     * Set special instructions
     */
    set(instructions: string): void {
      if (instructions.trim()) {
        sessionStorage.setItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS, instructions)
      } else {
        this.clear()
      }
    },

    /**
     * Clear special instructions
     */
    clear(): void {
      sessionStorage.removeItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS)
    }
  },

  /**
   * Guest Information Operations
   * Stores guest info in localStorage for auto-fill on subsequent orders
   */
  guestInfo: {
    /**
     * Get saved guest information
     */
    get(): GuestInfo | null {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.GUEST_INFO)
        return stored ? JSON.parse(stored) : null
      } catch (error) {
        console.error('[AppStorage] Error reading guest info:', error)
        return null
      }
    },

    /**
     * Save guest information
     */
    set(guestInfo: GuestInfo): void {
      try {
        // Only save if name is provided (required field)
        if (guestInfo.name.trim()) {
          localStorage.setItem(STORAGE_KEYS.GUEST_INFO, JSON.stringify(guestInfo))
        }
      } catch (error) {
        console.error('[AppStorage] Error saving guest info:', error)
      }
    },

    /**
     * Update guest information (partial update)
     */
    update(updates: Partial<GuestInfo>): void {
      const current = this.get()
      if (current) {
        this.set({ ...current, ...updates })
      }
    },

    /**
     * Clear saved guest information
     */
    clear(): void {
      localStorage.removeItem(STORAGE_KEYS.GUEST_INFO)
    }
  },

  /**
   * Utility Methods
   */
  utils: {
    /**
     * Clear all Tabsy storage
     */
    clearAll(): void {
      // Clear unified session
      AppStorage.session.clear()

      // Clear cart
      AppStorage.cart.clear()

      // Clear menu caches
      AppStorage.menu.clearAll()

      // Clear orders
      AppStorage.order.clearCurrent()
      AppStorage.order.clearHistory()

      // Clear special instructions
      AppStorage.specialInstructions.clear()

      // Clear any other tabsy keys
      const sessionKeys = Object.keys(sessionStorage)
      sessionKeys.forEach(key => {
        if (key.startsWith('tabsy-')) {
          sessionStorage.removeItem(key)
        }
      })

      const localKeys = Object.keys(localStorage)
      localKeys.forEach(key => {
        if (key.startsWith('tabsy-')) {
          localStorage.removeItem(key)
        }
      })

      console.log('[AppStorage] All storage cleared')
    },

    /**
     * Get storage usage statistics
     */
    getStorageUsage(): {
      sessionStorage: { used: number; available: number; percentage: number }
      localStorage: { used: number; available: number; percentage: number }
    } {
      const getStorageSize = (storage: Storage): number => {
        let total = 0
        for (let key in storage) {
          if (storage.hasOwnProperty(key)) {
            total += key.length + (storage.getItem(key)?.length || 0)
          }
        }
        return total
      }

      const STORAGE_LIMIT = 5 * 1024 * 1024 // 5MB typical limit

      const sessionUsed = getStorageSize(sessionStorage)
      const localUsed = getStorageSize(localStorage)

      return {
        sessionStorage: {
          used: sessionUsed,
          available: STORAGE_LIMIT - sessionUsed,
          percentage: (sessionUsed / STORAGE_LIMIT) * 100
        },
        localStorage: {
          used: localUsed,
          available: STORAGE_LIMIT - localUsed,
          percentage: (localUsed / STORAGE_LIMIT) * 100
        }
      }
    },

    /**
     * Debug: Log all Tabsy storage
     */
    debugLog(): void {
      console.group('[AppStorage] Debug Info')
      console.log('Session:', AppStorage.session.get())
      console.log('Cart:', AppStorage.cart.get())
      console.log('Current Order:', AppStorage.order.getCurrent())
      console.log('Order History:', AppStorage.order.getHistory())
      console.log('Storage Usage:', this.getStorageUsage())
      console.groupEnd()
    }
  }
}

// Export type definitions for consumers
export type { CartItem, MenuCacheData, OrderHistoryItem, GuestInfo }
