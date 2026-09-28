import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'boothbuddy.themePreference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resolvedScheme: ResolvedScheme;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

// The Settings tab's "System / Light / Dark" picker — persisted so it
// survives app restarts, and resolved against the OS scheme when the user
// hasn't overridden it. useTheme() and both root layouts read the resolved
// scheme from here instead of react-native's useColorScheme() directly, so
// the override actually takes effect everywhere (app tokens AND React
// Navigation's own DefaultTheme/DarkTheme).
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const resolvedScheme: ResolvedScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference, resolvedScheme }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  return ctx;
}
