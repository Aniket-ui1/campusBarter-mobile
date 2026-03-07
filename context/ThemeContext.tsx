import { type ThemeFamily, type ThemeMode, getThemePaletteByFamily } from '@/constants/theme';
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

const THEME_FAMILY_KEY = 'campusbarter_theme_family';
const DARK_MODE_KEY = 'campusbarter_dark_mode';
const MOBILE_VIEW_KEY = 'campusbarter_mobileview';

interface ThemeContextType {
  mode: ThemeMode; // legacy compat
  themeFamily: ThemeFamily;
  setThemeFamily: (family: ThemeFamily) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  colors: ReturnType<typeof getThemePaletteByFamily>;
  setMode: (mode: ThemeMode) => void; // legacy compat
  isDark: boolean;
  isSait: boolean;
  mobileView: boolean;
  setMobileView: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeFamily, setThemeFamilyState] = useState<ThemeFamily>('default');
  const [darkMode, setDarkModeState] = useState(false);
  const [mobileView, setMobileViewState] = useState(false);

  useEffect(() => {
    // Migrate from old single-key storage
    storage.getItem('campusbarter_theme').then((oldMode) => {
      if (oldMode) {
        // Migrate to new system
        if (oldMode === 'sait') {
          setThemeFamilyState('sait');
          setDarkModeState(false);
        } else if (oldMode === 'dark') {
          setThemeFamilyState('default');
          setDarkModeState(true);
        } else {
          setThemeFamilyState('default');
          setDarkModeState(false);
        }
        // Save migrated values & clear old key
        storage.setItem(THEME_FAMILY_KEY, oldMode === 'sait' ? 'sait' : 'default');
        storage.setItem(DARK_MODE_KEY, oldMode === 'dark' ? 'true' : 'false');
        storage.setItem('campusbarter_theme', ''); // clear old key
        return;
      }
      // Load new keys
      storage.getItem(THEME_FAMILY_KEY).then((saved) => {
        if (saved === 'sait') setThemeFamilyState('sait');
      });
      storage.getItem(DARK_MODE_KEY).then((saved) => {
        if (saved === 'true') setDarkModeState(true);
      });
    });
    storage.getItem(MOBILE_VIEW_KEY).then((saved) => {
      if (saved === 'true') setMobileViewState(true);
    });
  }, []);

  const setThemeFamily = (family: ThemeFamily) => {
    setThemeFamilyState(family);
    storage.setItem(THEME_FAMILY_KEY, family);
  };

  const setDarkMode = (v: boolean) => {
    setDarkModeState(v);
    storage.setItem(DARK_MODE_KEY, v ? 'true' : 'false');
  };

  // Legacy setMode for backward compat
  const setMode = (newMode: ThemeMode) => {
    if (newMode === 'sait') {
      setThemeFamily('sait');
      setDarkMode(false);
    } else if (newMode === 'dark') {
      setThemeFamily('default');
      setDarkMode(true);
    } else {
      setThemeFamily('default');
      setDarkMode(false);
    }
  };

  // Legacy mode computation
  const mode: ThemeMode = themeFamily === 'sait' ? 'sait' : darkMode ? 'dark' : 'light';

  const setMobileView = (v: boolean) => {
    setMobileViewState(v);
    storage.setItem(MOBILE_VIEW_KEY, v ? 'true' : 'false');
  };

  const colors = getThemePaletteByFamily(themeFamily, darkMode);

  return (
    <ThemeContext.Provider value={{
      mode,
      themeFamily,
      setThemeFamily,
      darkMode,
      setDarkMode,
      colors,
      setMode,
      isDark: darkMode,
      isSait: themeFamily === 'sait',
      mobileView,
      setMobileView,
    }}>
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
