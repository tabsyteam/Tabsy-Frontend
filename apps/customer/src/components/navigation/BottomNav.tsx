'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Search,
  ShoppingCart,
  ClipboardList,
  Users
} from 'lucide-react'
import { SessionManager } from '@/lib/session'

interface BottomNavProps {
  cartItemCount?: number
  className?: string
  showNav?: boolean
}

const BottomNav: React.FC<BottomNavProps> = React.memo(({
  cartItemCount = 0,
  className = '',
  showNav = true
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const [hasSession, setHasSession] = useState(false)
  const [hasCurrentOrder, setHasCurrentOrder] = useState(false)
  const [tableNumber, setTableNumber] = useState<string | null>(null)

  useEffect(() => {
    // Update session state
    setHasSession(SessionManager.hasDiningSession())

    // Update current order state - use canAccessOrders for better check
    setHasCurrentOrder(SessionManager.canAccessOrders())

    // Get table number from session or saved table info
    const session = SessionManager.getDiningSession()
    let tableNum = null

    if (session?.tableName) {
      tableNum = session.tableName
    } else {
      // Try to get from saved table info
      const savedTableInfo = sessionStorage.getItem('tabsy-table-info')
      if (savedTableInfo) {
        try {
          const tableInfo = JSON.parse(savedTableInfo)
          tableNum = tableInfo?.table?.number
        } catch (error) {
          console.warn('Failed to parse table info:', error)
        }
      }
    }

    setTableNumber(tableNum)

    // Update last activity when component renders
    SessionManager.updateLastActivity()
  }, [pathname])

  const navItems = useMemo(() => [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: SessionManager.getHomeUrl(),
      badge: null
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: `/search${hasSession ? SessionManager.getDiningQueryParams() : ''}`,
      badge: null
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      path: `/cart${hasSession ? SessionManager.getDiningQueryParams() : ''}`,
      badge: cartItemCount > 0 ? cartItemCount : null
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ClipboardList,
      path: SessionManager.getOrdersUrl(),
      badge: null,
      // disabled: !(hasSession || hasCurrentOrder)
      disabled: false
    },
    {
      id: 'table',
      label: tableNumber ? `Table ${tableNumber}` : 'Table',
      icon: Users,
      path: `/table${hasSession ? SessionManager.getDiningQueryParams() : ''}`,
      badge: null,
      disabled: false // Always available to show session status
    }
  ], [hasSession, cartItemCount, hasCurrentOrder, tableNumber])

  const isActive = useCallback((item: typeof navItems[0]) => {
    if (item.id === 'home') {
      // Home/Menu should be active on:
      // 1. /menu page (when navigated from other pages)
      // 2. /r/restaurant/t/table pattern (QR code entry point - shows menu)
      return pathname === '/menu' ||
             pathname.startsWith('/menu') ||
             (pathname.startsWith('/r/') && pathname.includes('/t/')) // QR code entry point always shows menu
    }
    if (item.id === 'orders') {
      return pathname.startsWith('/orders') || pathname.startsWith('/order/')
    }
    if (item.id === 'table') {
      return pathname.startsWith('/table') && !pathname.includes('/[tableId]')
    }
    return pathname.startsWith(`/${item.id}`)
  }, [pathname])

  const handleNavigation = useCallback((item: typeof navItems[0]) => {
    if (item.disabled) {
      return
    }
    router.push(item.path)
  }, [router])

  // Don't show nav on home page (welcome screen should be clean)
  if (!showNav || pathname === '/') {
    return null
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`fixed bottom-0 left-0 right-0 z-50 bg-surface/90 border-t border-default/50 backdrop-blur-xl shadow-2xl safe-bottom ${className}`}
    >
      <div className="flex items-center justify-around h-20 px-3">
        {navItems.map((item) => {
          const IconComponent = item.icon
          const active = isActive(item)
          const disabled = 'disabled' in item && item.disabled


          return (
            <motion.button
              key={item.id}
              onClick={() => handleNavigation(item)}
              disabled={disabled}
              className={`relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-3 transition-all duration-200 rounded-2xl ${
                item.id === 'cart' ? 'mx-1' : ''
              } ${
                disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : active && item.id === 'cart'
                  ? 'bg-primary/10 shadow-lg'
                  : active
                  ? 'bg-primary/5'
                  : 'hover:bg-interactive-hover/50'
              }`}
              whileTap={disabled ? {} : { scale: 0.95 }}
            >
              {/* Icon Container */}
              <div className="relative mb-1">
                <motion.div
                  className={`${
                    item.id === 'cart'
                      ? `p-3 rounded-2xl transition-all duration-200 ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/25'
                            : cartItemCount > 0
                            ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/25'
                            : 'text-content-tertiary hover:text-content-primary hover:bg-interactive-hover'
                        }`
                      : `p-2 rounded-xl transition-all duration-200 ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-content-tertiary hover:text-content-primary hover:bg-interactive-hover'
                        }`
                  }`}
                  animate={{
                    scale: active ? 1.1 : item.id === 'cart' && cartItemCount > 0 ? 1.05 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <IconComponent
                    size={item.id === 'cart' ? 24 : 20}
                    strokeWidth={active ? 2.5 : item.id === 'cart' && cartItemCount > 0 ? 2.5 : 2}
                  />
                </motion.div>

                {/* Badge */}
                {item.badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -top-1 -right-1 ${
                      item.id === 'cart'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-accent text-accent-foreground shadow-lg shadow-accent/30'
                    } text-xs font-bold rounded-full min-w-6 h-6 flex items-center justify-center px-1 ring-2 ring-surface`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}

              </div>

              {/* Label */}
              <span
                className={`text-xs font-semibold transition-colors duration-200 ${
                  item.id === 'cart' && cartItemCount > 0
                    ? 'text-accent'
                    : active
                    ? 'text-primary'
                    : 'text-content-tertiary'
                }`}
              >
                {item.label}
              </span>

              {/* Active Indicator */}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50"
                  style={{ transform: 'translateX(-50%)' }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

    </motion.nav>
  )
})

export default BottomNav