/**
 * Campus Barter — Multi-theme Design System
 * Supports: Light (forest green), Dark, SAIT (red & blue)
 */

import { Platform } from 'react-native';

// ── Theme types ──────────────────────────────────────────────────
export type ThemeFamily = 'default' | 'sait';
export type ThemeMode = 'light' | 'dark' | 'sait'; // legacy compat

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
  accent: '#003B6F',

  chatGreen: '#E0E8F5',
  chatWhite: '#FFFFFF',
  chatBg: '#EAE8F0',

  gradientFrom: '#C8102E',
  gradientTo: '#003B6F',
  gradientHero: '#002550',

  background: '#F8F9FC',
  surface: '#EEF1F7',
  surfaceLight: '#E8ECF5',
  elevated: '#D8DDE8',
  card: '#FFFFFF',

  border: 'rgba(0,59,111,0.18)',
  borderLight: 'rgba(0,59,111,0.08)',
  borderMedium: 'rgba(0,59,111,0.30)',

  text: '#0F1A2E',
  textSecondary: '#2D3E5A',
  textMuted: '#6A7B96',
  textLight: '#9AABBF',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#003B6F',

  dark: '#0F1A2E',
  forest: '#003B6F',
  sage: '#3070A8',
  mist: '#9AABBF',
  cream: '#E8ECF5',
  white: '#F8F9FC',

  overlay: 'rgba(15,26,46,0.5)',
  overlayLight: 'rgba(15,26,46,0.08)',

  statusBar: 'dark' as const,
};

// ── SAIT Dark palette ────────────────────────────────────────────
const SaitDarkPalette = {
  primary: '#E04050',
  primaryLight: '#F06070',
  primaryDark: '#C8102E',
  secondary: '#3070A8',
  accent: '#3070A8',

  chatGreen: '#1A2040',
  chatWhite: '#1A1F30',
  chatBg: '#0D1220',

  gradientFrom: '#C8102E',
  gradientTo: '#003B6F',
  gradientHero: '#001A3A',

  background: '#0D1220',
  surface: '#141B2E',
  surfaceLight: '#1A2240',
  elevated: '#243050',
  card: '#1A2240',

  border: 'rgba(48,112,168,0.25)',
  borderLight: 'rgba(48,112,168,0.12)',
  borderMedium: 'rgba(48,112,168,0.40)',

  text: '#E8ECF5',
  textSecondary: '#9AABBF',
  textMuted: '#6A7B96',
  textLight: '#4A6080',

  success: '#34D67A',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#3070A8',

  dark: '#E8ECF5',
  forest: '#3070A8',
  sage: '#5090C8',
  mist: '#4A6080',
  cream: '#1A2240',
  white: '#0D1220',

  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.15)',

  statusBar: 'light' as const,
};

// ── Palette map ──────────────────────────────────────────────────
type Palette = Omit<typeof LightPalette, 'statusBar'> & { statusBar: 'dark' | 'light' };

const FAMILY_PALETTES: Record<ThemeFamily, { light: Palette; dark: Palette }> = {
  default: { light: LightPalette, dark: DarkPalette },
  sait: { light: SaitPalette, dark: SaitDarkPalette },
};

// Legacy single-key map (backward compat)
const PALETTES: Record<ThemeMode, Palette> = {
  light: LightPalette,
  dark: DarkPalette,
  sait: SaitPalette,
};

/** Get palette for theme family + dark mode */
export function getThemePaletteByFamily(family: ThemeFamily, dark: boolean) {
  return FAMILY_PALETTES[family][dark ? 'dark' : 'light'];
}

/** Legacy: Get the full color palette for a given theme mode */
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
  coding: '#3B82F6',
  design: '#8B5CF6',
  math: '#F59E0B',
  writing: '#F97316',
  music: '#EC4899',
  languages: '#06B6D4',
  science: '#10B981',
  business: '#6366F1',
  fitness: '#EF4444',
  photography: '#A855F7',
  other: '#6B7280',
  // Legacy aliases
  tutoring: '#4A7C59',
  tech: '#3B82F6',
  cooking: '#F97316',
  language: '#06B6D4',
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  coding: '💻',
  design: '🎨',
  math: '📐',
  writing: '✍️',
  music: '🎵',
  languages: '🗣️',
  science: '🔬',
  business: '📊',
  fitness: '💪',
  photography: '📷',
  other: '🔧',
  // Legacy aliases
  tutoring: '📚',
  tech: '💻',
  cooking: '🍳',
  language: '🌍',
};
