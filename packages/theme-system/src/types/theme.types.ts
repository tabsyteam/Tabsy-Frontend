export interface ColorShade {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface SemanticColors {
  primary: {
    DEFAULT: string;
    hover: string;
    active: string;
    light: string;
    dark: string;
    foreground: string;
  };
  secondary: {
    DEFAULT: string;
    hover: string;
    active: string;
    light: string;
    dark: string;
    foreground: string;
  };
  accent: {
    DEFAULT: string;
    hover: string;
    active: string;
    light: string;
    dark: string;
    foreground: string;
  };
  surface: {
    DEFAULT: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
  };
  background: {
    DEFAULT: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  content: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
    brand: string;
  };
  border: {
    DEFAULT: string;
    secondary: string;
    tertiary: string;
    focus: string;
    error: string;
  };
  status: {
    success: {
      DEFAULT: string;
      light: string;
      dark: string;
      foreground: string;
      border: string;
    };
    warning: {
      DEFAULT: string;
      light: string;
      dark: string;
      foreground: string;
      border: string;
    };
    error: {
      DEFAULT: string;
      light: string;
      dark: string;
      foreground: string;
      border: string;
    };
    info: {
      DEFAULT: string;
      light: string;
      dark: string;
      foreground: string;
      border: string;
    };
  };
  interactive: {
    hover: string;
    active: string;
    disabled: string;
    focus: string;
  };
}

export interface Theme {
  name: string;
  description: string;
  colors: SemanticColors;
  cssVariables?: Record<string, string>;
}

export interface ThemeConfig {
  themes: {
    customer: Theme;
    restaurant: Theme;
    admin: Theme;
  };
  defaultTheme: keyof ThemeConfig['themes'];
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setTheme: (themeName: keyof ThemeConfig['themes']) => void;
  setMode: (mode: ThemeMode) => void;
}