/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Semantic color tokens using CSS variables
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          active: 'rgb(var(--primary-active) / <alpha-value>)',
          light: 'rgb(var(--primary-light) / <alpha-value>)',
          dark: 'rgb(var(--primary-dark) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          hover: 'rgb(var(--secondary-hover) / <alpha-value>)',
          active: 'rgb(var(--secondary-active) / <alpha-value>)',
          light: 'rgb(var(--secondary-light) / <alpha-value>)',
          dark: 'rgb(var(--secondary-dark) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          active: 'rgb(var(--accent-active) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          secondary: 'rgb(var(--surface-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--surface-tertiary) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          overlay: 'var(--surface-overlay)',
        },
        background: {
          DEFAULT: 'rgb(var(--background) / <alpha-value>)',
          secondary: 'rgb(var(--background-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--background-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--background-inverse) / <alpha-value>)',
        },
        content: {
          primary: 'rgb(var(--content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--content-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--content-tertiary) / <alpha-value>)',
          disabled: 'rgb(var(--content-disabled) / <alpha-value>)',
          inverse: 'rgb(var(--content-inverse) / <alpha-value>)',
          brand: 'rgb(var(--content-brand) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          secondary: 'rgb(var(--border-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--border-tertiary) / <alpha-value>)',
          focus: 'rgb(var(--border-focus) / <alpha-value>)',
          error: 'rgb(var(--border-error) / <alpha-value>)',
        },
        status: {
          success: {
            DEFAULT: 'rgb(var(--status-success) / <alpha-value>)',
            light: 'rgb(var(--status-success-light) / <alpha-value>)',
            dark: 'rgb(var(--status-success-dark) / <alpha-value>)',
            foreground: 'rgb(var(--status-success-foreground) / <alpha-value>)',
            border: 'rgb(var(--status-success-border) / <alpha-value>)',
          },
          warning: {
            DEFAULT: 'rgb(var(--status-warning) / <alpha-value>)',
            light: 'rgb(var(--status-warning-light) / <alpha-value>)',
            dark: 'rgb(var(--status-warning-dark) / <alpha-value>)',
            foreground: 'rgb(var(--status-warning-foreground) / <alpha-value>)',
            border: 'rgb(var(--status-warning-border) / <alpha-value>)',
          },
          error: {
            DEFAULT: 'rgb(var(--status-error) / <alpha-value>)',
            light: 'rgb(var(--status-error-light) / <alpha-value>)',
            dark: 'rgb(var(--status-error-dark) / <alpha-value>)',
            foreground: 'rgb(var(--status-error-foreground) / <alpha-value>)',
            border: 'rgb(var(--status-error-border) / <alpha-value>)',
          },
          info: {
            DEFAULT: 'rgb(var(--status-info) / <alpha-value>)',
            light: 'rgb(var(--status-info-light) / <alpha-value>)',
            dark: 'rgb(var(--status-info-dark) / <alpha-value>)',
            foreground: 'rgb(var(--status-info-foreground) / <alpha-value>)',
            border: 'rgb(var(--status-info-border) / <alpha-value>)',
          },
        },
        interactive: {
          hover: 'rgb(var(--interactive-hover) / <alpha-value>)',
          active: 'rgb(var(--interactive-active) / <alpha-value>)',
          disabled: 'rgb(var(--interactive-disabled) / <alpha-value>)',
          focus: 'rgb(var(--interactive-focus) / <alpha-value>)',
        },
        // Maintain compatibility with shadcn/ui
        ring: 'hsl(var(--ring))',
        input: 'hsl(var(--input))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        foreground: 'hsl(var(--foreground))',
      },
    },
  },
};