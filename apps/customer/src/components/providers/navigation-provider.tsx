'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import BottomNav from '@/components/navigation/BottomNav'
import { useCart } from '@/hooks/useCart'

interface NavigationContextType {
  showBottomNav: boolean
  setShowBottomNav: (show: boolean) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

interface NavigationProviderProps {
  children: React.ReactNode
}

// Inner component that uses cart hook
function NavigationProviderInner({ children }: NavigationProviderProps) {
  const [showBottomNav, setShowBottomNav] = useState(true)
  const { cart } = useCart()

  // Calculate total cart items
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)

  return (
    <NavigationContext.Provider value={{ showBottomNav, setShowBottomNav }}>
      <div className="relative min-h-screen">
        {children}
        <BottomNav cartItemCount={cartItemCount} showNav={showBottomNav} />
      </div>
    </NavigationContext.Provider>
  )
}

// Wrapper component that handles SSR gracefully
export function NavigationProvider({ children }: NavigationProviderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before mount, render without cart access
  if (!mounted) {
    return (
      <NavigationContext.Provider value={{ showBottomNav: true, setShowBottomNav: () => {} }}>
        <div className="relative min-h-screen">
          {children}
          <BottomNav cartItemCount={0} showNav={true} />
        </div>
      </NavigationContext.Provider>
    )
  }

  // After mount, render with cart access
  return <NavigationProviderInner>{children}</NavigationProviderInner>
}

export default NavigationProvider