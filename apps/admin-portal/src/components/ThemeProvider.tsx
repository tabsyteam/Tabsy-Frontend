'use client'

import React, { createContext, useContext } from 'react'
import { AdminTheme, ThemeVariants, getThemeStyles } from '../lib/theme'

interface ThemeContextValue {
  theme: typeof AdminTheme
  variant: keyof typeof ThemeVariants
  styles: React.CSSProperties
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  variant?: keyof typeof ThemeVariants
}

export function ThemeProvider({ children, variant = 'admin' }: ThemeProviderProps) {
  const styles = getThemeStyles(variant)

  const value: ThemeContextValue = {
    theme: AdminTheme,
    variant,
    styles,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
