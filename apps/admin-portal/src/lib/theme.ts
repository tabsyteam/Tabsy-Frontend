/**
 * Admin theme configuration with blue color palette
 * This file defines the complete design system for the admin portal
 */

export const AdminTheme = {
  colors: {
    primary: {
      50: 'rgb(239, 246, 255)',    // blue-50
      100: 'rgb(219, 234, 254)',   // blue-100
      200: 'rgb(191, 219, 254)',   // blue-200
      300: 'rgb(147, 197, 253)',   // blue-300
      400: 'rgb(96, 165, 250)',    // blue-400
      500: 'rgb(59, 130, 246)',    // blue-500
      600: 'rgb(37, 99, 235)',     // blue-600
      700: 'rgb(29, 78, 216)',     // blue-700
      800: 'rgb(30, 64, 175)',     // blue-800
      900: 'rgb(30, 58, 138)',     // blue-900
    },
    secondary: {
      50: 'rgb(238, 242, 255)',    // indigo-50
      100: 'rgb(224, 231, 255)',   // indigo-100
      200: 'rgb(199, 210, 254)',   // indigo-200
      300: 'rgb(165, 180, 252)',   // indigo-300
      400: 'rgb(129, 140, 248)',   // indigo-400
      500: 'rgb(99, 102, 241)',    // indigo-500
      600: 'rgb(79, 70, 229)',     // indigo-600
      700: 'rgb(67, 56, 202)',     // indigo-700
      800: 'rgb(55, 48, 163)',     // indigo-800
      900: 'rgb(49, 46, 129)',     // indigo-900
    },
    accent: {
      50: 'rgb(250, 245, 255)',    // purple-50
      100: 'rgb(243, 232, 255)',   // purple-100
      200: 'rgb(233, 213, 255)',   // purple-200
      300: 'rgb(196, 181, 253)',   // purple-300
      400: 'rgb(167, 139, 250)',   // purple-400
      500: 'rgb(139, 92, 246)',    // purple-500
      600: 'rgb(124, 58, 237)',    // purple-600
      700: 'rgb(109, 40, 217)',    // purple-700
      800: 'rgb(91, 33, 182)',     // purple-800
      900: 'rgb(76, 29, 149)',     // purple-900
    },
    neutral: {
      50: 'rgb(248, 250, 252)',    // slate-50
      100: 'rgb(241, 245, 249)',   // slate-100
      200: 'rgb(226, 232, 240)',   // slate-200
      300: 'rgb(203, 213, 225)',   // slate-300
      400: 'rgb(148, 163, 184)',   // slate-400
      500: 'rgb(100, 116, 139)',   // slate-500
      600: 'rgb(71, 85, 105)',     // slate-600
      700: 'rgb(51, 65, 85)',      // slate-700
      800: 'rgb(30, 41, 59)',      // slate-800
      900: 'rgb(15, 23, 42)',      // slate-900
    },
    status: {
      success: 'rgb(34, 197, 94)',   // green-500
      warning: 'rgb(245, 158, 11)',  // amber-500
      error: 'rgb(239, 68, 68)',     // red-500
    }
  },
  
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  spacing: {
    px: '1px',
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
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
  admin: {
    primary: AdminTheme.colors.primary[500],
    primaryHover: AdminTheme.colors.primary[600],
    primaryLight: AdminTheme.colors.primary[50],
    border: AdminTheme.colors.primary[200],
  },
  
  secondary: {
    primary: AdminTheme.colors.secondary[500],
    primaryHover: AdminTheme.colors.secondary[600],
    primaryLight: AdminTheme.colors.secondary[50],
    border: AdminTheme.colors.secondary[200],
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
    error: 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
  }
} as const

/**
 * Utility function to generate theme classes
 */
export const createThemeClass = (variant: keyof typeof ThemeVariants) => {
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