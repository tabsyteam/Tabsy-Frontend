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
  return {
    // Button classes
    buttonPrimary: 'btn-theme-primary',
    buttonOutline: 'btn-theme-outline',
    
    // Card classes  
    card: 'card-theme',
    
    // Text classes
    textPrimary: 'text-theme-primary',
    textSecondary: 'text-theme-secondary',
    textAccent: 'text-theme-accent',
    textGradient: 'text-theme-brand-gradient',
    
    // Background classes
    bgGradient: 'bg-theme-gradient',
    bgSurface: 'bg-theme-surface',
    bgSurfaceSecondary: 'bg-theme-surface-secondary',
    
    // Border classes
    borderPrimary: 'border-theme-primary',
    borderLight: 'border-theme-light',
    
    // Icon classes
    iconPrimary: 'icon-theme-primary',
    iconSecondary: 'icon-theme-secondary',
    iconAccent: 'icon-theme-accent',
    iconSuccess: 'icon-theme-success',
    iconWarning: 'icon-theme-warning',
    iconError: 'icon-theme-error',
    
    // Activity classes
    activityPrimary: 'activity-primary',
    activitySecondary: 'activity-secondary',
    activityAccent: 'activity-accent',
    
    // Badge classes
    badgeSuccess: 'badge-theme-success',
    badgeWarning: 'badge-theme-warning',
    badgeError: 'badge-theme-error',
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
  const variantClasses = {
    primary: 'bg-theme-primary text-white',
    secondary: 'bg-theme-surface text-theme-primary',
    accent: 'bg-theme-accent text-white',
    surface: 'bg-theme-surface-secondary border-theme-light'
  }
  
  return (
    <Component className={`${variantClasses[variant]} ${className}`}>
      {children}
    </Component>
  )
}