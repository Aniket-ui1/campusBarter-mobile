/**
 * Campus Barter — Forest Green Design System
 * Light background, dark text, sage green accents.
 */

import { Platform } from 'react-native';

// Reference palette from design brief
// dark:   #0D2B1D  — deep forest (text, headings)
// forest: #345635  — medium forest (surfaces, accents)
// sage:   #6B8F71  — sage green (primary interactive)
// mist:   #AEC3B0  — mist green (secondary text, borders)
// cream:  #E3EFD3  — light green-cream (cards, surfaces)
// white:  #F7FDF2  — near-white background

export const AppColors = {
  // Primary accent — sage green
  primary: '#6B8F71',
  secondary: '#345635',
  accent: '#4A7C59',
  gradientFrom: '#6B8F71',
  gradientTo: '#345635',

  // Backgrounds (light)
  background: '#F7FDF2',   // near-white with a green tint
  surface: '#EBF5E0',   // slightly deeper cream for cards
  surfaceLight: '#E3EFD3',   // cream — used for elevated cards
  elevated: '#D6E8C7',   // a step darker for modals / popovers

  // Borders
  border: 'rgba(107,143,113,0.25)',   // mist-green, semi-transparent
  borderLight: 'rgba(107,143,113,0.12)',

  // Text (dark on light)
  text: '#0D2B1D',   // deep forest — primary text
  textSecondary: '#345635',   // medium forest — secondary text
  textMuted: '#6B8F71',   // sage — muted / placeholder

  // Semantic
  success: '#22C55E',
  warning: '#D97706',
  error: '#DC2626',

  // Named aliases (match design reference)
  dark: '#0D2B1D',
  forest: '#345635',
  sage: '#6B8F71',
  mist: '#AEC3B0',
  cream: '#E3EFD3',
  white: '#F7FDF2',
};

/**
 * Themed color map used by useThemeColor and themed components.
 */
export const Colors = {
  light: {
    text: AppColors.text,
    secondaryText: AppColors.textSecondary,
    background: AppColors.background,
    surface: AppColors.surface,
    surfaceBorder: AppColors.border,
    tint: AppColors.primary,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.textMuted,
    tabIconSelected: AppColors.primary,
    accent: AppColors.accent,
    card: AppColors.surfaceLight,
    cardBorder: AppColors.border,
    inputBackground: AppColors.surface,
    inputBorder: AppColors.border,
    placeholder: AppColors.textMuted,
  },
  dark: {
    text: AppColors.text,
    secondaryText: AppColors.textSecondary,
    background: AppColors.background,
    surface: AppColors.surface,
    surfaceBorder: AppColors.border,
    tint: AppColors.primary,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.textMuted,
    tabIconSelected: AppColors.primary,
    accent: AppColors.accent,
    card: AppColors.surfaceLight,
    cardBorder: AppColors.border,
    inputBackground: AppColors.surface,
    inputBorder: AppColors.border,
    placeholder: AppColors.textMuted,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', sans-serif",
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
});

/**
 * Spacing scale (4px base)
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

/**
 * Border radius tokens
 */
export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
