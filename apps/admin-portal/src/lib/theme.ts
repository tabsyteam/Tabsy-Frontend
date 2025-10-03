/**
 * Admin Portal Theme Configuration - Warm Slate + Emerald Professional 2025
 *
 * Professional restaurant administration theme with:
 * - Warm neutral slate base for professionalism
 * - Emerald green accent representing growth, financial success, and hospitality
 * - Amber secondary for important notifications
 * - Data-focused design that doesn't compete with charts/analytics
 */

export const AdminTheme = {
  colors: {
    // Primary colors - Emerald Green (Growth, Success, Financial Trust)
    primary: {
      50: 'rgb(236, 253, 245)',   // emerald-50
      100: 'rgb(209, 250, 229)',  // emerald-100
      200: 'rgb(167, 243, 208)',  // emerald-200
      300: 'rgb(110, 231, 183)',  // emerald-300
      400: 'rgb(52, 211, 153)',   // emerald-400
      500: 'rgb(16, 185, 129)',   // emerald-500
      600: 'rgb(5, 150, 105)',    // emerald-600 - Primary brand color
      700: 'rgb(4, 120, 87)',     // emerald-700
      800: 'rgb(6, 95, 70)',      // emerald-800
      900: 'rgb(6, 78, 59)',      // emerald-900
    },

    // Secondary colors - Warm Amber (Notifications & Alerts)
    secondary: {
      50: 'rgb(255, 251, 235)',   // amber-50
      100: 'rgb(254, 243, 199)',  // amber-100
      200: 'rgb(253, 230, 138)',  // amber-200
      300: 'rgb(252, 211, 77)',   // amber-300
      400: 'rgb(251, 191, 36)',   // amber-400
      500: 'rgb(245, 158, 11)',   // amber-500 - Secondary accent
      600: 'rgb(217, 119, 6)',    // amber-600
      700: 'rgb(180, 83, 9)',     // amber-700
      800: 'rgb(146, 64, 14)',    // amber-800
      900: 'rgb(120, 53, 15)',    // amber-900
    },

    // Accent colors - Deep Slate (Professional Authority)
    accent: {
      50: 'rgb(248, 250, 252)',   // slate-50
      100: 'rgb(241, 245, 249)',  // slate-100
      200: 'rgb(226, 232, 240)',  // slate-200
      300: 'rgb(203, 213, 225)',  // slate-300
      400: 'rgb(148, 163, 184)',  // slate-400
      500: 'rgb(100, 116, 139)',  // slate-500
      600: 'rgb(71, 85, 105)',    // slate-600 - Accent color
      700: 'rgb(51, 65, 85)',     // slate-700
      800: 'rgb(30, 41, 59)',     // slate-800
      900: 'rgb(15, 23, 42)',     // slate-900
    },

    // Neutral warm grays - Base colors for backgrounds and surfaces
    neutral: {
      50: 'rgb(249, 250, 251)',   // gray-50 - Warm light
      100: 'rgb(243, 244, 246)',  // gray-100
      200: 'rgb(229, 231, 235)',  // gray-200
      300: 'rgb(209, 213, 219)',  // gray-300
      400: 'rgb(156, 163, 175)',  // gray-400
      500: 'rgb(107, 114, 128)',  // gray-500
      600: 'rgb(75, 85, 99)',     // gray-600
      700: 'rgb(55, 65, 81)',     // gray-700
      800: 'rgb(31, 41, 55)',     // gray-800
      900: 'rgb(17, 24, 39)',     // gray-900
    },
  },
}

export const ThemeVariants = {
  admin: {
    primary: AdminTheme.colors.primary[600],
    primaryHover: AdminTheme.colors.primary[700],
    primaryLight: AdminTheme.colors.primary[50],
    secondary: AdminTheme.colors.secondary[500],
    secondaryHover: AdminTheme.colors.secondary[600],
    accent: AdminTheme.colors.accent[600],
    accentHover: AdminTheme.colors.accent[700],
    border: AdminTheme.colors.neutral[200],
    background: AdminTheme.colors.neutral[50],
    surface: 'rgb(255, 255, 255)',
  },
}

export const getThemeStyles = (variant: keyof typeof ThemeVariants) => {
  const theme = ThemeVariants[variant]

  return {
    '--color-primary': theme.primary.replace('rgb(', '').replace(')', ''),
    '--color-primary-hover': theme.primaryHover.replace('rgb(', '').replace(')', ''),
    '--color-primary-light': theme.primaryLight.replace('rgb(', '').replace(')', ''),
    '--color-secondary': theme.secondary.replace('rgb(', '').replace(')', ''),
    '--color-secondary-hover': theme.secondaryHover.replace('rgb(', '').replace(')', ''),
    '--color-accent': theme.accent.replace('rgb(', '').replace(')', ''),
    '--color-accent-hover': theme.accentHover.replace('rgb(', '').replace(')', ''),
    '--color-border': theme.border.replace('rgb(', '').replace(')', ''),
    '--color-background': theme.background.replace('rgb(', '').replace(')', ''),
    '--color-surface': theme.surface.replace('rgb(', '').replace(')', ''),
  } as React.CSSProperties
}
