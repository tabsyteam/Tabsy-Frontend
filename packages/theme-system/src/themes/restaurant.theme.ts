import { Theme } from '../types/theme.types';
import { colors, neutralColors } from '../utils/colors';

export const restaurantTheme: Theme = {
  name: 'restaurant',
  description: 'Warm and professional theme for restaurant dashboard',
  colors: {
    primary: {
      DEFAULT: colors.orange[500],
      hover: colors.orange[600],
      active: colors.orange[700],
      light: colors.orange[50],
      dark: colors.orange[900],
      foreground: neutralColors.white,
    },
    secondary: {
      DEFAULT: colors.amber[500],
      hover: colors.amber[600],
      active: colors.amber[700],
      light: colors.amber[50],
      dark: colors.amber[900],
      foreground: neutralColors.white,
    },
    accent: {
      DEFAULT: colors.red[500],
      hover: colors.red[600],
      active: colors.red[700],
      light: colors.red[50],
      dark: colors.red[900],
      foreground: neutralColors.white,
    },
    surface: {
      DEFAULT: neutralColors.white,
      secondary: colors.orange[50],
      tertiary: colors.amber[50],
      elevated: neutralColors.white,
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    background: {
      DEFAULT: colors.orange[50],
      secondary: colors.amber[50],
      tertiary: colors.red[50],
      inverse: colors.gray[900],
    },
    content: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
      tertiary: colors.gray[500],
      disabled: colors.gray[400],
      inverse: neutralColors.white,
      brand: colors.orange[600],
    },
    border: {
      DEFAULT: colors.orange[200],
      secondary: colors.amber[200],
      tertiary: colors.orange[100],
      focus: colors.orange[500],
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
      hover: colors.orange[50],
      active: colors.orange[100],
      disabled: colors.gray[300],
      focus: colors.orange[500],
    },
  },
};