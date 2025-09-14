/**
 * Restaurant Dashboard Theme Configuration
 * 
 * This file provides a centralized theme system that can be:
 * - Extended for different restaurant brands
 * - Shared across multiple components
 * - Easily maintained and updated
 * - Used for design system consistency
 */

export const RestaurantTheme = {
  colors: {
    // Primary brand colors
    primary: {
      50: 'rgb(255, 247, 237)',   // orange-50
      100: 'rgb(255, 237, 213)',  // orange-100  
      200: 'rgb(254, 215, 170)',  // orange-200
      500: 'rgb(249, 115, 22)',   // orange-500
      600: 'rgb(234, 88, 12)',    // orange-600
      700: 'rgb(194, 65, 12)',    // orange-700
    },
    
    // Secondary colors
    secondary: {
      50: 'rgb(255, 251, 235)',   // amber-50
      100: 'rgb(254, 243, 199)',  // amber-100
      200: 'rgb(253, 230, 138)',  // amber-200
      500: 'rgb(245, 158, 11)',   // amber-500
      600: 'rgb(217, 119, 6)',    // amber-600
    },
    
    // Accent colors
    accent: {
      50: 'rgb(254, 226, 226)',   // red-50
      100: 'rgb(254, 202, 202)',  // red-100
      200: 'rgb(252, 165, 165)',  // red-200
      500: 'rgb(239, 68, 68)',    // red-500
      600: 'rgb(220, 38, 38)',    // red-600
    },
    
    // Neutral colors
    neutral: {
      50: 'rgb(249, 250, 251)',   // gray-50
      100: 'rgb(243, 244, 246)',  // gray-100
      400: 'rgb(156, 163, 175)',  // gray-400
      600: 'rgb(75, 85, 99)',     // gray-600
      900: 'rgb(17, 24, 39)',     // gray-900
    }
  },
  
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
  },
  
  borderRadius: {
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
  },
  
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
} as const

/**
 * Theme variant configurations for different contexts
 */
export const ThemeVariants = {
  restaurant: {
    primary: RestaurantTheme.colors.primary[600],
    primaryHover: RestaurantTheme.colors.primary[700],
    primaryLight: RestaurantTheme.colors.primary[50],
    border: RestaurantTheme.colors.primary[200],
  },
  
  admin: {
    primary: 'rgb(234, 88, 12)',       // orange-600 (restaurant theme)
    primaryHover: 'rgb(194, 65, 12)',  // orange-700
    primaryLight: 'rgb(255, 237, 213)', // orange-100
    border: 'rgb(254, 215, 170)',      // orange-200
  },
  
  customer: {
    primary: 'rgb(34, 197, 94)',       // green-500
    primaryHover: 'rgb(22, 163, 74)',  // green-600
    primaryLight: 'rgb(240, 253, 244)', // green-50
    border: 'rgb(187, 247, 208)',      // green-200
  },
} as const

/**
 * Component-specific theme configurations
 */
export const ComponentThemes = {
  button: {
    primary: {
      base: 'bg-[var(--color-primary)] text-white font-medium',
      hover: 'hover:bg-[var(--color-primary-hover)]',
      focus: 'focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2',
      disabled: 'disabled:opacity-50 disabled:cursor-not-allowed'
    },
    outline: {
      base: 'border border-[var(--color-border)] text-[var(--color-primary)] bg-transparent',
      hover: 'hover:bg-[var(--color-primary-light)] hover:border-[var(--color-primary)]',
      focus: 'focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2'
    }
  },
  
  card: {
    base: 'bg-[var(--color-surface-secondary)] border border-[var(--color-border-light)] backdrop-blur-sm',
    hover: 'hover:shadow-xl transition-all duration-300',
    shadow: 'shadow-lg'
  },
  
  input: {
    base: 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]',
    focus: 'focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
    error: 'border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
  }
} as const

/**
 * Utility function to generate theme classes
 */
export const createThemeClass = (variant: keyof typeof ThemeVariants, component?: string) => {
  const theme = ThemeVariants[variant]
  
  return {
    primary: `bg-[${theme.primary}] text-white`,
    primaryHover: `hover:bg-[${theme.primaryHover}]`,
    outline: `border-[${theme.border}] text-[${theme.primary}]`,
    surface: `bg-[${theme.primaryLight}]`,
  }
}

/**
 * CSS-in-JS helper for dynamic theming
 */
export const getThemeStyles = (variant: keyof typeof ThemeVariants) => {
  const theme = ThemeVariants[variant]
  
  return {
    '--color-primary': theme.primary.replace('rgb(', '').replace(')', ''),
    '--color-primary-hover': theme.primaryHover.replace('rgb(', '').replace(')', ''),
    '--color-primary-light': theme.primaryLight.replace('rgb(', '').replace(')', ''),
    '--color-border': theme.border.replace('rgb(', '').replace(')', ''),
  } as React.CSSProperties
}