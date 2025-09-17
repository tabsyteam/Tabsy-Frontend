'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Search,
  ShoppingCart,
  ClipboardList,
  User,
  Plus
} from 'lucide-react'

interface BottomNavProps {
  cartItemCount?: number
  className?: string
}

const BottomNav: React.FC<BottomNavProps> = ({
  cartItemCount = 0,
  className = ''
}) => {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/menu',
      badge: null
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/search',
      badge: null
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      path: '/cart',
      badge: cartItemCount > 0 ? cartItemCount : null
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ClipboardList,
      path: '/orders',
      badge: null
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      badge: null
    }
  ]

  const isActive = (path: string) => {
    if (path === '/menu') {
      return pathname === '/menu' || pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-default backdrop-blur-lg bg-opacity-95 safe-bottom ${className}`}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon
          const active = isActive(item.path)

          return (
            <motion.button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className="relative flex flex-col items-center justify-center min-w-0 flex-1 py-1 px-2 transition-colors duration-200"
              whileTap={{ scale: 0.95 }}
            >
              {/* Icon Container */}
              <div className="relative mb-1">
                <motion.div
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-content-tertiary hover:text-content-primary hover:bg-interactive-hover'
                  }`}
                  animate={{
                    scale: active ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <IconComponent
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </motion.div>

                {/* Badge */}
                {item.badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-semibold rounded-full min-w-5 h-5 flex items-center justify-center px-1"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs font-medium transition-colors duration-200 ${
                  active
                    ? 'text-content-brand'
                    : 'text-content-tertiary'
                }`}
              >
                {item.label}
              </span>

              {/* Active Indicator */}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 w-1 h-1 bg-primary rounded-full"
                  style={{ transform: 'translateX(-50%)' }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Floating Action Button for Quick Cart Access */}
      {cartItemCount > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleNavigation('/cart')}
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus size={24} strokeWidth={2.5} />
        </motion.button>
      )}
    </motion.nav>
  )
}

export default BottomNav