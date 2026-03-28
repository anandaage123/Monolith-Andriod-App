import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MM_Colors, Dark_Colors } from '../theme/Theme';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeType;
  setThemeMode: (mode: ThemeType) => void;
  colors: typeof MM_Colors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeType>('system');
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await AsyncStorage.getItem('@app_theme_mode');
    if (saved) setThemeMode(saved as ThemeType);
  };

  const handleSetThemeMode = async (mode: ThemeType) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('@app_theme_mode', mode);
  };

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? Dark_Colors : MM_Colors;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode: handleSetThemeMode, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
