/**
 * Campus Barter — Multi-theme Design System
 * Supports: Light (forest green), Dark, SAIT (red & blue)
 */

import { Platform } from 'react-native';

// ── Theme mode type ──────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'sait';

// ── Light palette (forest green — default) ───────────────────────
const LightPalette = {
  primary: '#4A7C59',
  primaryLight: '#6B8F71',
  primaryDark: '#345635',
  secondary: '#345635',
  accent: '#4A7C59',

  chatGreen: '#DCF8C6',
  chatWhite: '#FFFFFF',
  chatBg: '#ECE5DD',

  gradientFrom: '#4A7C59',
  gradientTo: '#345635',
  gradientHero: '#2D4A35',

  background: '#FAFDF7',
  surface: '#F0F5EB',
  surfaceLight: '#E8F0DE',
  elevated: '#DCE8CF',
  card: '#FFFFFF',

  border: 'rgba(74,124,89,0.18)',
  borderLight: 'rgba(74,124,89,0.08)',
  borderMedium: 'rgba(74,124,89,0.30)',

  text: '#0D2B1D',
  textSecondary: '#3D5A42',
  textMuted: '#7A9A7F',
  textLight: '#A8C4AD',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  dark: '#0D2B1D',
  forest: '#345635',
  sage: '#6B8F71',
  mist: '#AEC3B0',
  cream: '#E8F0DE',
  white: '#FAFDF7',

  overlay: 'rgba(13,43,29,0.5)',
  overlayLight: 'rgba(13,43,29,0.08)',

  statusBar: 'dark' as const,
};

// ── Dark palette ─────────────────────────────────────────────────
const DarkPalette = {
  primary: '#5A9E6F',
  primaryLight: '#7BB890',
  primaryDark: '#3D7A50',
  secondary: '#3D7A50',
  accent: '#5A9E6F',

  chatGreen: '#1A3D2A',
  chatWhite: '#1E2D24',
  chatBg: '#0D1F15',

  gradientFrom: '#3D7A50',
  gradientTo: '#1A3D2A',
  gradientHero: '#0F2818',

  background: '#0D1F15',
  surface: '#152A1C',
  surfaceLight: '#1A3324',
  elevated: '#243D2D',
  card: '#1A3324',

  border: 'rgba(90,158,111,0.20)',
  borderLight: 'rgba(90,158,111,0.10)',
  borderMedium: 'rgba(90,158,111,0.35)',

  text: '#E8F0DE',
  textSecondary: '#AEC3B0',
  textMuted: '#6B8F71',
  textLight: '#4A7C59',

  success: '#34D67A',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  dark: '#E8F0DE',
  forest: '#5A9E6F',
  sage: '#7BB890',
  mist: '#3D5A42',
  cream: '#1A3324',
  white: '#0D1F15',

  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.15)',

  statusBar: 'light' as const,
};

// ── SAIT palette (red & blue) ────────────────────────────────────
const SaitPalette = {
  primary: '#C8102E',
  primaryLight: '#E04050',
  primaryDark: '#8B0A1E',
  secondary: '#003B6F',
  accent: '#C8102E',

  chatGreen: '#FFE0E6',
  chatWhite: '#FFFFFF',
  chatBg: '#F0E8E8',

  gradientFrom: '#C8102E',
  gradientTo: '#003B6F',
  gradientHero: '#002550',

  background: '#FDF8F8',
  surface: '#F5ECEC',
  surfaceLight: '#FAEAEA',
  elevated: '#E8D4D4',
  card: '#FFFFFF',

  border: 'rgba(200,16,46,0.18)',
  borderLight: 'rgba(200,16,46,0.08)',
  borderMedium: 'rgba(200,16,46,0.30)',

  text: '#1A0A0F',
  textSecondary: '#5A2D38',
  textMuted: '#9A7A82',
  textLight: '#C4A8AE',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#003B6F',

  dark: '#1A0A0F',
  forest: '#8B0A1E',
  sage: '#E04050',
  mist: '#C4A8AE',
  cream: '#FAEAEA',
  white: '#FDF8F8',

  overlay: 'rgba(26,10,15,0.5)',
  overlayLight: 'rgba(26,10,15,0.08)',

  statusBar: 'dark' as const,
};

// ── Palette map ──────────────────────────────────────────────────
type Palette = Omit<typeof LightPalette, 'statusBar'> & { statusBar: 'dark' | 'light' };
const PALETTES: Record<ThemeMode, Palette> = {
  light: LightPalette,
  dark: DarkPalette,
  sait: SaitPalette,
};

/** Get the full color palette for a given theme mode */
export function getThemePalette(mode: ThemeMode) {
  return PALETTES[mode];
}

/** Default export — light palette. Screens using ThemeContext should use `useThemeColors()` instead. */
export const AppColors = LightPalette;

// ── Themed colors (navigation compat) ────────────────────────────
export const Colors = {
  light: {
    text: LightPalette.text,
    secondaryText: LightPalette.textSecondary,
    background: LightPalette.background,
    surface: LightPalette.surface,
    surfaceBorder: LightPalette.border,
    tint: LightPalette.primary,
    icon: LightPalette.textSecondary,
    tabIconDefault: LightPalette.textMuted,
    tabIconSelected: LightPalette.primary,
    accent: LightPalette.accent,
    card: LightPalette.surfaceLight,
    cardBorder: LightPalette.border,
    inputBackground: LightPalette.surface,
    inputBorder: LightPalette.border,
    placeholder: LightPalette.textMuted,
  },
  dark: {
    text: DarkPalette.text,
    secondaryText: DarkPalette.textSecondary,
    background: DarkPalette.background,
    surface: DarkPalette.surface,
    surfaceBorder: DarkPalette.border,
    tint: DarkPalette.primary,
    icon: DarkPalette.textSecondary,
    tabIconDefault: DarkPalette.textMuted,
    tabIconSelected: DarkPalette.primary,
    accent: DarkPalette.accent,
    card: DarkPalette.surfaceLight,
    cardBorder: DarkPalette.border,
    inputBackground: DarkPalette.surface,
    inputBorder: DarkPalette.border,
    placeholder: DarkPalette.textMuted,
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
