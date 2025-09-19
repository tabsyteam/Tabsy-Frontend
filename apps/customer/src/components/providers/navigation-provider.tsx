'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

export function NavigationProvider({ children }: NavigationProviderProps) {
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

export default NavigationProvider