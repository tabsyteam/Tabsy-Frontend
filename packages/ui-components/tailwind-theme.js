/** Shared Tailwind theme configuration using CSS variables */
const semanticColors = {
  // Primary Colors
  primary: {
    DEFAULT: "rgb(var(--primary) / <alpha-value>)",
    hover: "rgb(var(--primary-hover) / <alpha-value>)",
    active: "rgb(var(--primary-active) / <alpha-value>)",
    light: "rgb(var(--primary-light) / <alpha-value>)",
    dark: "rgb(var(--primary-dark) / <alpha-value>)",
    foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
  },

  // Secondary Colors
  secondary: {
    DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
    hover: "rgb(var(--secondary-hover) / <alpha-value>)",
    active: "rgb(var(--secondary-active) / <alpha-value>)",
    light: "rgb(var(--secondary-light) / <alpha-value>)",
    dark: "rgb(var(--secondary-dark) / <alpha-value>)",
    foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
  },

  // Accent Colors
  accent: {
    DEFAULT: "rgb(var(--accent) / <alpha-value>)",
    hover: "rgb(var(--accent-hover) / <alpha-value>)",
    active: "rgb(var(--accent-active) / <alpha-value>)",
    light: "rgb(var(--accent-light) / <alpha-value>)",
    dark: "rgb(var(--accent-dark) / <alpha-value>)",
    foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
  },

  // Surface Colors
  surface: {
    DEFAULT: "rgb(var(--surface) / <alpha-value>)",
    secondary: "rgb(var(--surface-secondary) / <alpha-value>)",
    tertiary: "rgb(var(--surface-tertiary) / <alpha-value>)",
    elevated: "rgb(var(--surface-elevated) / <alpha-value>)",
  },

  // Background Colors - with fallback to prevent purple flash
  background: {
    DEFAULT: "rgb(var(--background, 249 250 251) / <alpha-value>)",
    secondary: "rgb(var(--background-secondary, 243 244 246) / <alpha-value>)",
    tertiary: "rgb(var(--background-tertiary, 229 231 235) / <alpha-value>)",
    inverse: "rgb(var(--background-inverse, 17 24 39) / <alpha-value>)",
  },

  // Content/Text Colors
  content: {
    primary: "rgb(var(--content-primary) / <alpha-value>)",
    secondary: "rgb(var(--content-secondary) / <alpha-value>)",
    tertiary: "rgb(var(--content-tertiary) / <alpha-value>)",
    disabled: "rgb(var(--content-disabled) / <alpha-value>)",
    inverse: "rgb(var(--content-inverse) / <alpha-value>)",
    brand: "rgb(var(--content-brand) / <alpha-value>)",
  },

  // Border Colors
  border: {
    DEFAULT: "rgb(var(--border) / <alpha-value>)",
    secondary: "rgb(var(--border-secondary) / <alpha-value>)",
    tertiary: "rgb(var(--border-tertiary) / <alpha-value>)",
    focus: "rgb(var(--border-focus) / <alpha-value>)",
    error: "rgb(var(--border-error) / <alpha-value>)",
  },

  // Status Colors
  status: {
    success: {
      DEFAULT: "rgb(var(--status-success) / <alpha-value>)",
      light: "rgb(var(--status-success-light) / <alpha-value>)",
      dark: "rgb(var(--status-success-dark) / <alpha-value>)",
      foreground: "rgb(var(--status-success-foreground) / <alpha-value>)",
      border: "rgb(var(--status-success-border) / <alpha-value>)",
    },
    warning: {
      DEFAULT: "rgb(var(--status-warning) / <alpha-value>)",
      light: "rgb(var(--status-warning-light) / <alpha-value>)",
      dark: "rgb(var(--status-warning-dark) / <alpha-value>)",
      foreground: "rgb(var(--status-warning-foreground) / <alpha-value>)",
      border: "rgb(var(--status-warning-border) / <alpha-value>)",
    },
    error: {
      DEFAULT: "rgb(var(--status-error) / <alpha-value>)",
      light: "rgb(var(--status-error-light) / <alpha-value>)",
      dark: "rgb(var(--status-error-dark) / <alpha-value>)",
      foreground: "rgb(var(--status-error-foreground) / <alpha-value>)",
      border: "rgb(var(--status-error-border) / <alpha-value>)",
    },
    info: {
      DEFAULT: "rgb(var(--status-info) / <alpha-value>)",
      light: "rgb(var(--status-info-light) / <alpha-value>)",
      dark: "rgb(var(--status-info-dark) / <alpha-value>)",
      foreground: "rgb(var(--status-info-foreground) / <alpha-value>)",
      border: "rgb(var(--status-info-border) / <alpha-value>)",
    },
  },

  // Interactive States
  interactive: {
    hover: "rgb(var(--interactive-hover) / <alpha-value>)",
    active: "rgb(var(--interactive-active) / <alpha-value>)",
    disabled: "rgb(var(--interactive-disabled) / <alpha-value>)",
    focus: "rgb(var(--interactive-focus) / <alpha-value>)",
  },

  // Keep existing shadcn/ui compatibility colors
  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },

  // HSL based colors for compatibility
  foreground: "hsl(var(--foreground))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
};

module.exports = { semanticColors };