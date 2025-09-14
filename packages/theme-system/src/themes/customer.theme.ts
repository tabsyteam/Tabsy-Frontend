import { Theme } from '../types/theme.types';
import { colors, neutralColors } from '../utils/colors';

export const customerTheme: Theme = {
  name: 'customer',
  description: 'Fresh and appetizing theme for customer-facing app',
  colors: {
    primary: {
      DEFAULT: colors.emerald[500],
      hover: colors.emerald[600],
      active: colors.emerald[700],
      light: colors.emerald[50],
      dark: colors.emerald[900],
      foreground: neutralColors.white,
    },
    secondary: {
      DEFAULT: colors.teal[500],
      hover: colors.teal[600],
      active: colors.teal[700],
      light: colors.teal[50],
      dark: colors.teal[900],
      foreground: neutralColors.white,
    },
    accent: {
      DEFAULT: colors.amber[500],
      hover: colors.amber[600],
      active: colors.amber[700],
      light: colors.amber[50],
      dark: colors.amber[900],
      foreground: neutralColors.white,
    },
    surface: {
      DEFAULT: neutralColors.white,
      secondary: colors.gray[50],
      tertiary: colors.gray[100],
      elevated: neutralColors.white,
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    background: {
      DEFAULT: colors.gray[50],
      secondary: colors.emerald[50],
      tertiary: colors.teal[50],
      inverse: colors.gray[900],
    },
    content: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
      tertiary: colors.gray[500],
      disabled: colors.gray[400],
      inverse: neutralColors.white,
      brand: colors.emerald[600],
    },
    border: {
      DEFAULT: colors.gray[200],
      secondary: colors.gray[300],
      tertiary: colors.gray[100],
      focus: colors.emerald[500],
      error: colors.red[500],
    },
    status: {
      success: {
        DEFAULT: colors.green[500],
        light: colors.green[50],
        dark: colors.green[700],
        foreground: neutralColors.white,
        border: colors.green[200],
      },
      warning: {
        DEFAULT: colors.amber[500],
        light: colors.amber[50],
        dark: colors.amber[700],
        foreground: neutralColors.white,
        border: colors.amber[200],
      },
      error: {
        DEFAULT: colors.red[500],
        light: colors.red[50],
        dark: colors.red[700],
        foreground: neutralColors.white,
        border: colors.red[200],
      },
      info: {
        DEFAULT: colors.blue[500],
        light: colors.blue[50],
        dark: colors.blue[700],
        foreground: neutralColors.white,
        border: colors.blue[200],
      },
    },
    interactive: {
      hover: colors.gray[50],
      active: colors.gray[100],
      disabled: colors.gray[300],
      focus: colors.emerald[500],
    },
  },
};