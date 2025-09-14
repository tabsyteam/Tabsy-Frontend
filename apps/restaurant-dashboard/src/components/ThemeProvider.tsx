'use client'

import React, { createContext, useContext } from 'react'
import { RestaurantTheme, ThemeVariants, getThemeStyles } from '../lib/theme'

interface ThemeContextValue {
  theme: typeof RestaurantTheme
  variant: keyof typeof ThemeVariants
  styles: React.CSSProperties
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  variant?: keyof typeof ThemeVariants
}

export function ThemeProvider({ children, variant = 'restaurant' }: ThemeProviderProps) {
  const styles = getThemeStyles(variant)

  const value: ThemeContextValue = {
    theme: RestaurantTheme,
    variant,
    styles,
  }

  return (
    <ThemeContext.Provider value={value}>
      <div style={styles} className="theme-provider">
        {children}
      </div>
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

/**
 * Hook to get theme-aware class names
 */
export function useThemeClasses() {
  const { variant } = useTheme()
  
  return {
    // Button classes
    buttonPrimary: 'btn-primary',
    buttonOutline: '',
    
    // Card classes  
    card: 'bg-card',
    
    // Text classes
    textPrimary: 'text-primary',
    textSecondary: 'text-theme-secondary',
    textAccent: 'text-accent',
    textGradient: 'text-primary',
    
    // Background classes
    bgGradient: 'bg-gradient-to-br from-orange-50 to-amber-50',
    bgSurface: 'bg-card',
    bgSurfaceSecondary: 'bg-surface-secondary',
    
    // Border classes
    borderPrimary: 'border-primary',
    borderLight: 'border-border',
    
    // Icon classes
    iconPrimary: 'text-primary',
    iconSecondary: 'text-secondary',
    iconAccent: 'text-accent',
    
    // Activity classes
    activityPrimary: 'activity-primary',
    activitySecondary: 'activity-secondary',
    activityAccent: 'activity-accent',
  }
}

/**
 * Component for applying theme styles to any element
 */
interface ThemedElementProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'accent' | 'surface'
  as?: keyof JSX.IntrinsicElements
}

export function ThemedElement({ 
  children, 
  className = '', 
  variant = 'primary',
  as: Component = 'div' 
}: ThemedElementProps) {
  const { theme } = useTheme()
  
  const variantClasses = {
    primary: 'bg-theme-primary text-white',
    secondary: 'bg-card text-primary',
    accent: 'bg-theme-accent text-white',
    surface: 'bg-surface-secondary border-border'
  }
  
  return (
    <Component className={`${variantClasses[variant]} ${className}`}>
      {children}
    </Component>
  )
}