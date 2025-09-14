import { Theme } from '../types/theme.types';
import { colors, neutralColors } from '../utils/colors';

export const adminTheme: Theme = {
  name: 'admin',
  description: 'Professional and trustworthy theme for admin portal',
  colors: {
    primary: {
      DEFAULT: colors.blue[500],
      hover: colors.blue[600],
      active: colors.blue[700],
      light: colors.blue[50],
      dark: colors.blue[900],
      foreground: neutralColors.white,
    },
    secondary: {
      DEFAULT: colors.indigo[500],
      hover: colors.indigo[600],
      active: colors.indigo[700],
      light: colors.indigo[50],
      dark: colors.indigo[900],
      foreground: neutralColors.white,
    },
    accent: {
      DEFAULT: colors.purple[500],
      hover: colors.purple[600],
      active: colors.purple[700],
      light: colors.purple[50],
      dark: colors.purple[900],
      foreground: neutralColors.white,
    },
    surface: {
      DEFAULT: neutralColors.white,
      secondary: colors.slate[50],
      tertiary: colors.slate[100],
      elevated: neutralColors.white,
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    background: {
      DEFAULT: colors.slate[50],
      secondary: colors.blue[50],
      tertiary: colors.indigo[50],
      inverse: colors.slate[900],
    },
    content: {
      primary: colors.slate[800],
      secondary: colors.slate[600],
      tertiary: colors.slate[400],
      disabled: colors.slate[300],
      inverse: neutralColors.white,
      brand: colors.blue[600],
    },
    border: {
      DEFAULT: colors.blue[200],
      secondary: colors.indigo[200],
      tertiary: colors.slate[200],
      focus: colors.blue[500],
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
      hover: colors.slate[50],
      active: colors.slate[100],
      disabled: colors.slate[300],
      focus: colors.blue[500],
    },
  },
};