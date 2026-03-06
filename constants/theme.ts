/**
 * Campus Barter — Premium Forest Green Design System
 * Inspired by Depop / OfferUp / Fiverr aesthetics.
 */

import { Platform } from 'react-native';

// ── Core palette ─────────────────────────────────────────────────
export const AppColors = {
  // Primary accent
  primary: '#4A7C59',
  primaryLight: '#6B8F71',
  primaryDark: '#345635',
  secondary: '#345635',
  accent: '#4A7C59',

  // WhatsApp-inspired chat
  chatGreen: '#DCF8C6',
  chatWhite: '#FFFFFF',
  chatBg: '#ECE5DD',

  // Gradients
  gradientFrom: '#4A7C59',
  gradientTo: '#345635',
  gradientHero: '#2D4A35',

  // Backgrounds
  background: '#FAFDF7',
  surface: '#F0F5EB',
  surfaceLight: '#E8F0DE',
  elevated: '#DCE8CF',

  // Borders
  border: 'rgba(74,124,89,0.18)',
  borderLight: 'rgba(74,124,89,0.08)',
  borderMedium: 'rgba(74,124,89,0.30)',

  // Text
  text: '#0D2B1D',
  textSecondary: '#3D5A42',
  textMuted: '#7A9A7F',
  textLight: '#A8C4AD',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Named aliases
  dark: '#0D2B1D',
  forest: '#345635',
  sage: '#6B8F71',
  mist: '#AEC3B0',
  cream: '#E8F0DE',
  white: '#FAFDF7',

  // Overlay
  overlay: 'rgba(13,43,29,0.5)',
  overlayLight: 'rgba(13,43,29,0.08)',
};

// ── Themed colors ────────────────────────────────────────────────
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
    text: '#E8F0DE',
    secondaryText: '#A8C4AD',
    background: '#0D1A12',
    surface: '#162419',
    surfaceBorder: 'rgba(107,143,113,0.25)',
    tint: '#6B8F71',
    icon: '#A8C4AD',
    tabIconDefault: '#5A7A5F',
    tabIconSelected: '#6B8F71',
    accent: '#6B8F71',
    card: '#1A2E20',
    cardBorder: 'rgba(107,143,113,0.20)',
    inputBackground: '#162419',
    inputBorder: 'rgba(107,143,113,0.25)',
    placeholder: '#5A7A5F',
  },
};

// ── Fonts ─────────────────────────────────────────────────────────
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

// ── Spacing scale (4px base) ─────────────────────────────────────
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

// ── Border radius ────────────────────────────────────────────────
export const Radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// ── Shadows ──────────────────────────────────────────────────────
export const Shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#0D2B1D', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#0D2B1D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#0D2B1D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
    android: { elevation: 8 },
    default: {},
  }),
};

// ── Category metadata ────────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  tutoring: '#4A7C59',
  design: '#8B5CF6',
  tech: '#3B82F6',
  writing: '#F59E0B',
  music: '#EC4899',
  fitness: '#EF4444',
  cooking: '#F97316',
  language: '#06B6D4',
  business: '#6366F1',
  other: '#6B7280',
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  tutoring: '📚',
  design: '🎨',
  tech: '💻',
  writing: '✍️',
  music: '🎵',
  fitness: '💪',
  cooking: '🍳',
  language: '🌍',
  business: '📈',
  other: '✨',
};
