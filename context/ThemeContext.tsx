import { type ThemeMode, getThemePalette } from '@/constants/theme';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Cross-platform storage
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  },
};

const THEME_KEY = 'campusbarter_theme';
const MOBILE_VIEW_KEY = 'campusbarter_mobileview';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ReturnType<typeof getThemePalette>;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isSait: boolean;
  mobileView: boolean;
  setMobileView: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [mobileView, setMobileViewState] = useState(false);

  useEffect(() => {
    storage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'sait' || saved === 'light') {
        setModeState(saved);
      }
    });
    storage.getItem(MOBILE_VIEW_KEY).then((saved) => {
      if (saved === 'true') setMobileViewState(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    storage.setItem(THEME_KEY, newMode);
  };

  const setMobileView = (v: boolean) => {
    setMobileViewState(v);
    storage.setItem(MOBILE_VIEW_KEY, v ? 'true' : 'false');
  };

  const colors = getThemePalette(mode);

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, isDark: mode === 'dark', isSait: mode === 'sait', mobileView, setMobileView }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColors() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeColors must be inside ThemeProvider');
  return ctx.colors;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
