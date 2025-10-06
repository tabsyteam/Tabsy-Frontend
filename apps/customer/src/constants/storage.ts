/**
 * Storage keys for localStorage and sessionStorage
 *
 * IMPORTANT: Store only IDs, not full objects
 * Full data should live in React Query cache (source of truth)
 * sessionStorage is only for persistence across page refreshes
 */
export const STORAGE_KEYS = {
  // Cart related
  CART: 'tabsy-cart',
  SPECIAL_INSTRUCTIONS: 'tabsy-special-instructions',

  // Restaurant and table IDs (for page refresh recovery)
  RESTAURANT_ID: 'tabsy-restaurant-id',
  TABLE_ID: 'tabsy-table-id',

  // Table and session related
  TABLE_SESSION_ID: 'tabsy-table-session-id',
  TABLE_SESSION_LOCK: (tableId: string) => `tabsy-table-session-lock-${tableId}`,

  // Menu related
  MENU_DATA: 'tabsy-menu-data',
  MENU_CACHE: (restaurantId: string) => `tabsy-menu-cache-${restaurantId}`,
  FAVORITES: (restaurantId: string) => `tabsy-favorites-${restaurantId}`,
  RECENT_SEARCHES: (restaurantId: string) => `tabsy-recent-searches-${restaurantId}`,

  // Session related (already defined in session.ts but included for completeness)
  DINING_SESSION: 'tabsy-dining-session',
  CURRENT_ORDER: 'tabsy-current-order',
  ORDER_HISTORY: 'tabsy-order-history',
} as const