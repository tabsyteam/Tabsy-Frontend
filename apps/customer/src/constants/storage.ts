/**
 * Storage keys for localStorage and sessionStorage
 */
export const STORAGE_KEYS = {
  // Cart related
  CART: 'tabsy-cart',
  SPECIAL_INSTRUCTIONS: 'tabsy-special-instructions',

  // Table and session related
  TABLE_INFO: 'tabsy-table-info',
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